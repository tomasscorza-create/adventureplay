import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../../shared/supabase/client";
import {
  assignSlots,
  collectPeerPresences,
  COOP_EVENTS,
  COOP_PROTOCOL_VERSION,
  generateRoomCode,
  HOST_SLOT,
  normalizeRoomCode,
  type CoopEndMessage,
  type CoopEndReason,
  type CoopHello,
  type CoopInputMessage,
  type CoopParticipant,
  type CoopRole,
  type CoopStartMessage,
} from "./coopMessages";

export type CoopConnectionState =
  | "idle"
  | "connecting"
  | "waiting" // conectado, esperando al otro jugador
  | "ready" // ambos presentes
  | "in-game"
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
// Usa un unico canal de Supabase Realtime por codigo de sala con broadcast + presence,
// sin tablas ni RLS.
class CoopSession {
  private channel: RealtimeChannel | null = null;
  private _role: CoopRole | null = null;
  private _code = "";
  private _connectionState: CoopConnectionState = "idle";
  private _peerPresent = false;
  private localHello: CoopHello = { characterId: "" };
  private peerHello: CoopHello | null = null;
  private clientKey = "";
  private protocolMismatch = false;
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
  };

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

  async host(hello: CoopHello): Promise<string> {
    const code = generateRoomCode();
    await this.connect("host", code, hello);
    return code;
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

    channel.on("broadcast", { event: COOP_EVENTS.hello }, ({ payload }) => {
      this.peerHello = payload as CoopHello;
      this.emitPeerJoined();
    });
    channel.on("broadcast", { event: COOP_EVENTS.input }, ({ payload }) => {
      this.callbacks.input.forEach((cb) => cb(payload as CoopInputMessage));
    });
    channel.on("broadcast", { event: COOP_EVENTS.snapshot }, ({ payload }) => {
      this.callbacks.snapshot.forEach((cb) => cb(payload));
    });
    channel.on("broadcast", { event: COOP_EVENTS.start }, ({ payload }) => {
      this._connectionState = "in-game";
      this.callbacks.start.forEach((cb) => cb(payload as CoopStartMessage));
    });
    channel.on("broadcast", { event: COOP_EVENTS.end }, ({ payload }) => {
      this.callbacks.end.forEach((cb) => cb(payload as CoopEndMessage));
    });

    channel.on("presence", { event: "sync" }, () => this.syncPresence());
    channel.on("presence", { event: "join" }, () => this.syncPresence());
    channel.on("presence", { event: "leave" }, () => this.syncPresence());

    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({
            role,
            characterId: hello.characterId,
            protocol: COOP_PROTOCOL_VERSION,
          });
          this.setConnectionState("waiting");
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.setConnectionState("error");
          reject(new Error(`No se pudo conectar a la sala (${status}).`));
        }
      });
    });
  }

  private syncPresence(): void {
    if (!this.channel || !this._role) return;
    const presence = this.channel.presenceState() as unknown as Record<
      string,
      Array<Record<string, unknown>>
    >;
    const peers = collectPeerPresences(presence, this.clientKey);

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

    // Roster determinista incluyendo al jugador local, para fijar el slot propio
    // y el de cada peer igual en todos los dispositivos.
    this._participants = assignSlots([
      { key: this.clientKey, role: this._role, characterId: this.localHello.characterId },
      ...peers,
    ]);
    this._localSlot = this._participants.find((entry) => entry.key === this.clientKey)?.slot
      ?? this._localSlot;

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

  private emitPeerJoined(): void {
    if (!this._peerPresent) return;
    const hello = this.peerHello ?? { characterId: "" };
    this.callbacks.peerJoined.forEach((cb) => cb(hello));
  }

  private sendHello(): void {
    this.broadcast(COOP_EVENTS.hello, this.localHello);
  }

  sendInput(message: CoopInputMessage): void {
    this.broadcast(COOP_EVENTS.input, message);
  }

  sendSnapshot(snapshot: unknown): void {
    this.broadcast(COOP_EVENTS.snapshot, snapshot);
  }

  sendStart(levelId: string): void {
    this._connectionState = "in-game";
    this.broadcast(COOP_EVENTS.start, { levelId } satisfies CoopStartMessage);
  }

  sendEnd(reason: CoopEndReason): void {
    this.broadcast(COOP_EVENTS.end, { reason } satisfies CoopEndMessage);
  }

  private broadcast(event: string, payload: unknown): void {
    if (!this.channel) return;
    void this.channel.send({ type: "broadcast", event, payload });
  }

  leave(): void {
    if (this.channel) {
      void this.channel.unsubscribe();
      supabase?.removeChannel(this.channel);
      this.channel = null;
    }
    this._role = null;
    this._code = "";
    this._peerPresent = false;
    this.peerHello = null;
    this.protocolMismatch = false;
    this._participants = [];
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
