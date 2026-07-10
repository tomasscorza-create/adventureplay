import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../../shared/supabase/client";
import {
  assignSlots,
  collectPeerPresences,
  COOP_EVENTS,
  COOP_MAX_PLAYERS,
  COOP_PROTOCOL_VERSION,
  COOP_RECONNECT_WINDOW_MS,
  generateRoomCode,
  HOST_SLOT,
  normalizeRoomCode,
  type CoopChargesMessage,
  type CoopEndMessage,
  type CoopEndReason,
  type CoopHello,
  type CoopInputMessage,
  type CoopParticipant,
  type CoopRole,
  type CoopStartMessage,
  type CoopStartPlayer,
} from "./coopMessages";

export type CoopConnectionState =
  | "idle"
  | "connecting"
  | "waiting" // conectado, esperando al otro jugador
  | "ready" // ambos presentes
  | "in-game"
  | "reconnecting"
  | "ended"
  | "error";

interface CoopCallbacks {
  connectionState: Set<(state: CoopConnectionState) => void>;
  peerJoined: Set<(hello: CoopHello) => void>;
  peerLeft: Set<() => void>;
  input: Set<(message: CoopInputMessage) => void>;
  // Payload generico: cada escena serializa/castea su propio tipo de snapshot
  // (Desafio usa WorldSnapshot, Explorar usa LevelSnapshot).
  snapshot: Set<(snapshot: unknown) => void>;
  start: Set<(message: CoopStartMessage) => void>;
  end: Set<(message: CoopEndMessage) => void>;
  // Errores fatales de la sala (por ejemplo versiones de protocolo distintas).
  sessionError: Set<(message: string) => void>;
  // Cambios en el roster (slots/heroes presentes), para la lista del lobby.
  roster: Set<(participants: CoopParticipant[]) => void>;
  participantLeft: Set<(slot: number) => void>;
  participantRejoined: Set<(slot: number) => void>;
  participantReconnectExpired: Set<(slot: number) => void>;
  // Compras de cargas durante la partida (delta hacia el host).
  charges: Set<(message: CoopChargesMessage) => void>;
}

// Identidad unica del cliente dentro del canal de presence. La key ya no es el
// rol: eso permitia que dos guests colisionaran y bloquea el co-op de mas de
// dos jugadores planificado.
function generateClientKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Capa de red del co-op. Vive completamente fuera de Phaser (regla de arquitectura):
// React la maneja desde el lobby y la escena Phaser solo se suscribe a sus callbacks.
// Usa dos canales de Supabase Realtime por codigo de sala: principal (broadcast + presence)
// e input (para evitar trafico innecesario a los guests), sin tablas ni RLS.
class CoopSession {
  private channel: RealtimeChannel | null = null;
  private inputChannel: RealtimeChannel | null = null;
  public networkStats = {
    sent: { count: 0, bytes: 0 },
    received: { count: 0, bytes: 0 },
    events: {} as Record<string, { sentCount: number; sentBytes: number; recvCount: number; recvBytes: number }>,
  };
  private statsInterval = 0;
  private _role: CoopRole | null = null;
  private _code = "";
  private _connectionState: CoopConnectionState = "idle";
  private _peerPresent = false;
  private localHello: CoopHello = { characterId: "" };
  private peerHello: CoopHello | null = null;
  private clientKey = "";
  private protocolMismatch = false;
  private roomFull = false;
  // Roster con slots asignados (0 = host, 1..N = guests) y el slot local.
  private _participants: CoopParticipant[] = [];
  private _localSlot = HOST_SLOT;

  private readonly callbacks: CoopCallbacks = {
    connectionState: new Set(),
    peerJoined: new Set(),
    peerLeft: new Set(),
    input: new Set(),
    snapshot: new Set(),
    start: new Set(),
    end: new Set(),
    sessionError: new Set(),
    roster: new Set(),
    participantLeft: new Set(),
    participantRejoined: new Set(),
    participantReconnectExpired: new Set(),
    charges: new Set(),
  };
  private participantsKey = "";
  private authorizedParticipantKeys: Set<string> | null = null;
  private authorizedParticipants = new Map<string, CoopParticipant>();
  private readonly disconnectedParticipantKeys = new Set<string>();
  private readonly reconnectTimers = new Map<string, number>();
  private reconnectStateBeforeDrop: CoopConnectionState = "in-game";
  private localReconnectTimer = 0;

  get role(): CoopRole | null {
    return this._role;
  }

  get code(): string {
    return this._code;
  }

  get connectionState(): CoopConnectionState {
    return this._connectionState;
  }

  get isActive(): boolean {
    return this.channel !== null;
  }

  get peerPresent(): boolean {
    return this._peerPresent;
  }

  get peerCharacterId(): string | null {
    return this.peerHello?.characterId ?? null;
  }

  // Slot del jugador local dentro de la sala (0 = host, 1..N = guests).
  get localSlot(): number {
    return this._localSlot;
  }

  // Roster completo con slots ya asignados. Vacio hasta que la sala esta lista.
  get participants(): CoopParticipant[] {
    return this._participants;
  }

  // Personaje del participante en un slot dado, si esta presente.
  characterIdForSlot(slot: number): string | null {
    return this._participants.find((entry) => entry.slot === slot)?.characterId ?? null;
  }

  // Cantidad de jugadores presentes (para el lobby: "x/COOP_MAX_PLAYERS").
  get participantCount(): number {
    return this._participants.length;
  }

  async host(hello: CoopHello): Promise<string> {
    const code = generateRoomCode();
    await this.connect("host", code, hello);
    return code;
  }

  private trackStat(type: "sent" | "received", event: string, payload: unknown) {
    if (!import.meta.env.DEV) return;
    const bytes = JSON.stringify(payload).length;
    this.networkStats[type].count++;
    this.networkStats[type].bytes += bytes;
    if (!this.networkStats.events[event]) {
      this.networkStats.events[event] = { sentCount: 0, sentBytes: 0, recvCount: 0, recvBytes: 0 };
    }
    if (type === "sent") {
      this.networkStats.events[event].sentCount++;
      this.networkStats.events[event].sentBytes += bytes;
    } else {
      this.networkStats.events[event].recvCount++;
      this.networkStats.events[event].recvBytes += bytes;
    }
  }

  async join(rawCode: string, hello: CoopHello): Promise<void> {
    const code = normalizeRoomCode(rawCode);
    await this.connect("guest", code, hello);
  }

  private async connect(role: CoopRole, code: string, hello: CoopHello): Promise<void> {
    if (!supabase) {
      this.setConnectionState("error");
      throw new Error("Supabase no esta configurado; el co-op online requiere conexion.");
    }
    this.leave();
    this._role = role;
    this._code = code;
    this.localHello = { ...hello, protocol: COOP_PROTOCOL_VERSION };
    this.peerHello = null;
    this._peerPresent = false;
    this.protocolMismatch = false;
    this.roomFull = false;
    this.clientKey = generateClientKey();
    // Slot provisional segun el rol; syncPresence lo confirma con el roster real.
    this._localSlot = role === "host" ? HOST_SLOT : HOST_SLOT + 1;
    this._participants = [];
    this.setConnectionState("connecting");

    const channel = supabase.channel(`coop-room-${code}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: this.clientKey },
      },
    });
    this.channel = channel;

    const inputChannel = supabase.channel(`coop-room-${code}-input`, {
      config: { broadcast: { self: false, ack: false } },
    });
    this.inputChannel = inputChannel;

    this.networkStats = { sent: { count: 0, bytes: 0 }, received: { count: 0, bytes: 0 }, events: {} };
    if (import.meta.env.DEV) {
      this.statsInterval = window.setInterval(() => {
        console.log("📊 Network Stats (30s):", this.networkStats);
      }, 30000);
    }

    channel.on("broadcast", { event: COOP_EVENTS.hello }, ({ payload }) => {
      this.trackStat("received", COOP_EVENTS.hello, payload);
      this.peerHello = payload as CoopHello;
      this.emitPeerJoined();
    });
    
    if (role === "host") {
      inputChannel.on("broadcast", { event: COOP_EVENTS.input }, ({ payload }) => {
        this.trackStat("received", COOP_EVENTS.input, payload);
        const message = payload as CoopInputMessage;
        if (!this.acceptsActiveSlot(message.slot)) return;
        this.callbacks.input.forEach((cb) => cb(message));
      });
    }

    channel.on("broadcast", { event: COOP_EVENTS.snapshot }, ({ payload }) => {
      this.trackStat("received", COOP_EVENTS.snapshot, payload);
      this.callbacks.snapshot.forEach((cb) => cb(payload));
    });
    channel.on("broadcast", { event: COOP_EVENTS.start }, ({ payload }) => {
      this.trackStat("received", COOP_EVENTS.start, payload);
      this._connectionState = "in-game";
      this.authorizeCurrentParticipants();
      this.callbacks.start.forEach((cb) => cb(payload as CoopStartMessage));
    });
    channel.on("broadcast", { event: COOP_EVENTS.end }, ({ payload }) => {
      this.trackStat("received", COOP_EVENTS.end, payload);
      this.callbacks.end.forEach((cb) => cb(payload as CoopEndMessage));
    });
    channel.on("broadcast", { event: COOP_EVENTS.charges }, ({ payload }) => {
      this.trackStat("received", COOP_EVENTS.charges, payload);
      const message = payload as CoopChargesMessage;
      if (!this.acceptsActiveSlot(message.slot)) return;
      this.callbacks.charges.forEach((cb) => cb(message));
    });

    channel.on("presence", { event: "sync" }, () => this.syncPresence());
    channel.on("presence", { event: "join" }, () => this.syncPresence());
    channel.on("presence", { event: "leave" }, () => this.syncPresence());

    let mainEverSubscribed = false;
    let inputEverSubscribed = false;
    let mainReady = false;
    let inputReady = false;
    const restoreIfReady = () => {
      if (mainReady && inputReady && this._connectionState === "reconnecting") {
        this.finishLocalReconnect();
      }
    };

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            mainReady = true;
            void channel.track({
              role,
              characterId: hello.characterId,
              protocol: COOP_PROTOCOL_VERSION,
              healingCharges: hello.healingCharges ?? 0,
              powerCharges: hello.powerCharges ?? 0,
            });
            mainEverSubscribed = true;
            resolve();
            restoreIfReady();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            mainReady = false;
            if (mainEverSubscribed) this.beginLocalReconnect();
            else reject(new Error(`No se pudo conectar a la sala (${status}).`));
          }
        });
      }),
      new Promise<void>((resolve, reject) => {
        inputChannel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            inputReady = true;
            inputEverSubscribed = true;
            resolve();
            restoreIfReady();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            inputReady = false;
            if (inputEverSubscribed) this.beginLocalReconnect();
            else reject(new Error(`No se pudo conectar al canal de input (${status}).`));
          }
        });
      })
    ]).then(() => {
      if (this._connectionState === "connecting") this.setConnectionState("waiting");
    }).catch(err => {
      this.setConnectionState("error");
      throw err;
    });
  }

  private beginLocalReconnect(): void {
    if (this._connectionState !== "in-game" && this._connectionState !== "ready"
      && this._connectionState !== "reconnecting") return;
    if (this._connectionState !== "reconnecting") {
      this.reconnectStateBeforeDrop = this._connectionState;
      this.setConnectionState("reconnecting");
    }
    if (this.localReconnectTimer) return;
    this.localReconnectTimer = window.setTimeout(() => {
      this.localReconnectTimer = 0;
      this.callbacks.sessionError.forEach((cb) => cb("No se pudo recuperar la conexion cooperativa."));
      this.callbacks.participantReconnectExpired.forEach((cb) => cb(this._localSlot));
      this.leave();
      this.setConnectionState("error");
    }, COOP_RECONNECT_WINDOW_MS);
  }

  private finishLocalReconnect(): void {
    if (this.localReconnectTimer) window.clearTimeout(this.localReconnectTimer);
    this.localReconnectTimer = 0;
    this.setConnectionState(this.reconnectStateBeforeDrop);
  }

  private syncPresence(): void {
    if (!this.channel || !this._role) return;
    const presence = this.channel.presenceState() as unknown as Record<
      string,
      Array<Record<string, unknown>>
    >;
    const rawPeers = collectPeerPresences(presence, this.clientKey);
    
    // FASE 4C: Ignorar peers nuevos si la partida ya empezo (late joins).
    const peers = this.authorizedParticipantKeys
      ? rawPeers.filter((p) => this.authorizedParticipantKeys!.has(p.key))
      : rawPeers;

    // Version incompatible (incluye builds previos sin campo protocol): error
    // claro una sola vez en lugar de una sala que espera para siempre.
    if (peers.some((entry) => entry.protocol !== COOP_PROTOCOL_VERSION)) {
      if (!this.protocolMismatch) {
        this.protocolMismatch = true;
        this.callbacks.sessionError.forEach((cb) =>
          cb("Las versiones del juego no coinciden. Ambos jugadores deben actualizar Adventure Play."),
        );
        this.setConnectionState("error");
      }
      return;
    }

    // Roster vivo derivado de presence. Durante una partida, el roster
    // autorizado conserva los slots aunque una presence desaparezca brevemente.
    const liveRoster = assignSlots([
      {
        key: this.clientKey,
        role: this._role,
        characterId: this.localHello.characterId,
        protocol: COOP_PROTOCOL_VERSION,
        healingCharges: this.localHello.healingCharges ?? 0,
        powerCharges: this.localHello.powerCharges ?? 0,
      },
      ...peers,
    ]);
    this._localSlot = this.authorizedParticipants.get(this.clientKey)?.slot
      ?? liveRoster.find((entry) => entry.key === this.clientKey)?.slot
      ?? this._localSlot;

    if (this.authorizedParticipantKeys) {
      const liveKeys = new Set(liveRoster.map((entry) => entry.key));
      for (const [key, reserved] of this.authorizedParticipants) {
        if (key === this.clientKey) continue;
        if (liveKeys.has(key)) {
          if (this.disconnectedParticipantKeys.delete(key)) {
            this.clearReconnectTimer(key);
            this.callbacks.participantRejoined.forEach((cb) => cb(reserved.slot));
          }
        } else if (!this.disconnectedParticipantKeys.has(key)) {
          this.disconnectedParticipantKeys.add(key);
          this.callbacks.participantLeft.forEach((cb) => cb(reserved.slot));
          const timer = window.setTimeout(
            () => this.expireParticipantReconnect(key),
            COOP_RECONNECT_WINDOW_MS,
          );
          this.reconnectTimers.set(key, timer);
        }
      }
      this._participants = [...this.authorizedParticipants.values()]
        .sort((a, b) => a.slot - b.slot);
      this.emitRosterIfChanged();
      return;
    }

    // La sala solo cuenta los slots dentro del tope; un cliente que cae fuera
    // (llego cuando ya estaba llena) recibe un error claro y no juega.
    if (this._localSlot >= COOP_MAX_PLAYERS) {
      if (!this.roomFull) {
        this.roomFull = true;
        this.callbacks.sessionError.forEach((cb) => cb("La sala esta llena."));
        this.setConnectionState("error");
      }
      return;
    }
    this._participants = liveRoster.filter((entry) => entry.slot < COOP_MAX_PLAYERS);
    this.emitRosterIfChanged();

    const otherRole: CoopRole = this._role === "host" ? "guest" : "host";
    const peer = peers.find((entry) => entry.role === otherRole);

    if (peer && !this._peerPresent) {
      this._peerPresent = true;
      // El payload de presence ya trae el heroe del peer; el hello por broadcast
      // se conserva como reanuncio para clientes que se suscriben tarde.
      this.peerHello = { characterId: peer.characterId, protocol: peer.protocol };
      this.sendHello();
      this.setConnectionState("ready");
      this.emitPeerJoined();
    } else if (!peer && this._peerPresent) {
      this._peerPresent = false;
      this.peerHello = null;
      this.callbacks.peerLeft.forEach((cb) => cb());
      if (this._connectionState !== "ended") this.setConnectionState("waiting");
    }
  }

  private emitRosterIfChanged(): void {
    const key = this._participants.map((entry) => `${entry.slot}:${entry.characterId}`).join("|");
    if (key === this.participantsKey) return;
    this.participantsKey = key;
    this.callbacks.roster.forEach((cb) => cb(this._participants));
  }

  private expireParticipantReconnect(key: string): void {
    this.reconnectTimers.delete(key);
    if (!this.disconnectedParticipantKeys.delete(key)) return;
    const participant = this.authorizedParticipants.get(key);
    if (!participant) return;
    this.authorizedParticipants.delete(key);
    this.authorizedParticipantKeys?.delete(key);
    this._participants = [...this.authorizedParticipants.values()]
      .sort((a, b) => a.slot - b.slot);
    this.emitRosterIfChanged();
    this.callbacks.participantReconnectExpired.forEach((cb) => cb(participant.slot));
    if (this._role === "host") this.sendEnd("left", participant.slot);
  }

  private acceptsActiveSlot(slot: number): boolean {
    if (!this.authorizedParticipantKeys) return true;
    const participant = [...this.authorizedParticipants.values()]
      .find((entry) => entry.slot === slot);
    return Boolean(participant && !this.disconnectedParticipantKeys.has(participant.key));
  }

  private clearReconnectTimer(key: string): void {
    const timer = this.reconnectTimers.get(key);
    if (timer !== undefined) window.clearTimeout(timer);
    this.reconnectTimers.delete(key);
  }

  private emitPeerJoined(): void {
    if (!this._peerPresent) return;
    const hello = this.peerHello ?? { characterId: "" };
    this.callbacks.peerJoined.forEach((cb) => cb(hello));
  }

  private sendHello(): void {
    this.broadcast(COOP_EVENTS.hello, this.localHello);
  }

  sendInput(message: CoopInputMessage): void {
    if (!this.inputChannel) return;
    this.trackStat("sent", COOP_EVENTS.input, message);
    void this.inputChannel.send({ type: "broadcast", event: COOP_EVENTS.input, payload: message });
  }

  sendSnapshot(snapshot: unknown): void {
    this.broadcast(COOP_EVENTS.snapshot, snapshot);
  }

  // `rosterOverride` permite al host encadenar niveles con las cargas vivas de
  // la partida (los valores de presence quedan viejos una vez que se gasto).
  sendStart(levelId: string, rosterOverride?: CoopStartPlayer[]): void {
    this._connectionState = "in-game";
    this.authorizeCurrentParticipants();
    const roster: CoopStartPlayer[] = rosterOverride ?? this._participants
      .filter((entry) => entry.slot < COOP_MAX_PLAYERS)
      .map((entry) => ({
        slot: entry.slot,
        characterId: entry.characterId,
        healingCharges: entry.healingCharges,
        powerCharges: entry.powerCharges,
      }));
    this.broadcast(COOP_EVENTS.start, { levelId, roster } satisfies CoopStartMessage);
  }

  private authorizeCurrentParticipants(): void {
    this.authorizedParticipantKeys = new Set(this._participants.map((entry) => entry.key));
    this.authorizedParticipants = new Map(
      this._participants.map((entry) => [entry.key, { ...entry }]),
    );
  }

  sendEnd(reason: CoopEndReason, slot?: number): void {
    this.broadcast(COOP_EVENTS.end, { reason, slot } satisfies CoopEndMessage);
  }

  sendCharges(message: CoopChargesMessage): void {
    this.broadcast(COOP_EVENTS.charges, message);
  }

  private broadcast(event: string, payload: unknown): void {
    if (!this.channel) return;
    this.trackStat("sent", event, payload);
    void this.channel.send({ type: "broadcast", event, payload });
  }

  leave(): void {
    if (this.localReconnectTimer) {
      window.clearTimeout(this.localReconnectTimer);
      this.localReconnectTimer = 0;
    }
    for (const key of this.reconnectTimers.keys()) this.clearReconnectTimer(key);
    if (this.statsInterval) {
      window.clearInterval(this.statsInterval);
      this.statsInterval = 0;
    }
    if (this.channel) {
      void this.channel.unsubscribe();
      supabase?.removeChannel(this.channel);
      this.channel = null;
    }
    if (this.inputChannel) {
      void this.inputChannel.unsubscribe();
      supabase?.removeChannel(this.inputChannel);
      this.inputChannel = null;
    }
    this._role = null;
    this._code = "";
    this._peerPresent = false;
    this.peerHello = null;
    this.protocolMismatch = false;
    this.roomFull = false;
    this._participants = [];
    this.participantsKey = "";
    this.authorizedParticipantKeys = null;
    this.authorizedParticipants.clear();
    this.disconnectedParticipantKeys.clear();
    this._localSlot = HOST_SLOT;
    this.setConnectionState("idle");
  }

  private setConnectionState(state: CoopConnectionState): void {
    if (this._connectionState === state) return;
    this._connectionState = state;
    this.callbacks.connectionState.forEach((cb) => cb(state));
  }

  onConnectionState(cb: (state: CoopConnectionState) => void): () => void {
    return this.subscribe("connectionState", cb);
  }
  onPeerJoined(cb: (hello: CoopHello) => void): () => void {
    return this.subscribe("peerJoined", cb);
  }
  onPeerLeft(cb: () => void): () => void {
    return this.subscribe("peerLeft", cb);
  }
  onInput(cb: (message: CoopInputMessage) => void): () => void {
    return this.subscribe("input", cb);
  }
  onSnapshot<T>(cb: (snapshot: T) => void): () => void {
    const wrapped = cb as (snapshot: unknown) => void;
    this.callbacks.snapshot.add(wrapped);
    return () => {
      this.callbacks.snapshot.delete(wrapped);
    };
  }
  onStart(cb: (message: CoopStartMessage) => void): () => void {
    return this.subscribe("start", cb);
  }
  onEnd(cb: (message: CoopEndMessage) => void): () => void {
    return this.subscribe("end", cb);
  }
  onSessionError(cb: (message: string) => void): () => void {
    return this.subscribe("sessionError", cb);
  }
  onRoster(cb: (participants: CoopParticipant[]) => void): () => void {
    return this.subscribe("roster", cb);
  }
  onParticipantLeft(cb: (slot: number) => void): () => void {
    return this.subscribe("participantLeft", cb);
  }
  onParticipantRejoined(cb: (slot: number) => void): () => void {
    return this.subscribe("participantRejoined", cb);
  }
  onParticipantReconnectExpired(cb: (slot: number) => void): () => void {
    return this.subscribe("participantReconnectExpired", cb);
  }
  onCharges(cb: (message: CoopChargesMessage) => void): () => void {
    return this.subscribe("charges", cb);
  }

  private subscribe<K extends keyof CoopCallbacks>(
    key: K,
    cb: CoopCallbacks[K] extends Set<infer F> ? F : never,
  ): () => void {
    const set = this.callbacks[key] as Set<unknown>;
    set.add(cb);
    return () => {
      set.delete(cb);
    };
  }
}

export const coopSession = new CoopSession();
