import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../../shared/supabase/client";
import {
  COOP_EVENTS,
  generateRoomCode,
  normalizeRoomCode,
  type CoopEndMessage,
  type CoopEndReason,
  type CoopHello,
  type CoopRole,
  type CoopStartMessage,
  type GuestInputMessage,
  type WorldSnapshot,
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
  input: Set<(message: GuestInputMessage) => void>;
  snapshot: Set<(snapshot: WorldSnapshot) => void>;
  start: Set<(message: CoopStartMessage) => void>;
  end: Set<(message: CoopEndMessage) => void>;
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

  private readonly callbacks: CoopCallbacks = {
    connectionState: new Set(),
    peerJoined: new Set(),
    peerLeft: new Set(),
    input: new Set(),
    snapshot: new Set(),
    start: new Set(),
    end: new Set(),
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
    this.localHello = hello;
    this.peerHello = null;
    this._peerPresent = false;
    this.setConnectionState("connecting");

    const channel = supabase.channel(`coop-room-${code}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: role },
      },
    });
    this.channel = channel;

    channel.on("broadcast", { event: COOP_EVENTS.hello }, ({ payload }) => {
      this.peerHello = payload as CoopHello;
      this.emitPeerJoined();
    });
    channel.on("broadcast", { event: COOP_EVENTS.input }, ({ payload }) => {
      this.callbacks.input.forEach((cb) => cb(payload as GuestInputMessage));
    });
    channel.on("broadcast", { event: COOP_EVENTS.snapshot }, ({ payload }) => {
      this.callbacks.snapshot.forEach((cb) => cb(payload as WorldSnapshot));
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
          void channel.track({ role, characterId: hello.characterId });
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
    if (!this.channel) return;
    const presence = this.channel.presenceState();
    const otherRole: CoopRole = this._role === "host" ? "guest" : "host";
    const peerNowPresent = Array.isArray(presence[otherRole]) && presence[otherRole].length > 0;

    if (peerNowPresent && !this._peerPresent) {
      this._peerPresent = true;
      // Reanunciamos nuestro hello para que el peer que acaba de entrar lo reciba.
      this.sendHello();
      this.setConnectionState("ready");
      this.emitPeerJoined();
    } else if (!peerNowPresent && this._peerPresent) {
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

  sendInput(message: GuestInputMessage): void {
    this.broadcast(COOP_EVENTS.input, message);
  }

  sendSnapshot(snapshot: WorldSnapshot): void {
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
  onInput(cb: (message: GuestInputMessage) => void): () => void {
    return this.subscribe("input", cb);
  }
  onSnapshot(cb: (snapshot: WorldSnapshot) => void): () => void {
    return this.subscribe("snapshot", cb);
  }
  onStart(cb: (message: CoopStartMessage) => void): () => void {
    return this.subscribe("start", cb);
  }
  onEnd(cb: (message: CoopEndMessage) => void): () => void {
    return this.subscribe("end", cb);
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
