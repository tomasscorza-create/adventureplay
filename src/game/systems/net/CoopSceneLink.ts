import type { CoopSessionInfo } from "../../events/EventBus";
import {
  emptyGameplayInputState,
  type GameplayInputFrame,
  type GameplayInputState,
} from "../../../shared/types/input";
import { coopSession } from "./CoopSession";
import {
  COOP_INPUT_KEEPALIVE_MS,
  COOP_INPUT_RATE_HZ,
  COOP_SNAPSHOT_RATE_HZ,
  packInputState,
  unpackInputState,
  type CoopEndMessage,
  type CoopEndReason,
  type CoopRole,
  type GuestInputMessage,
} from "./coopMessages";

// Transporte minimo que necesita el link. CoopSession lo satisface tal cual;
// los tests inyectan una implementacion falsa sin tocar Supabase.
export interface CoopLinkTransport {
  onInput(cb: (message: GuestInputMessage) => void): () => void;
  onSnapshot<T>(cb: (snapshot: T) => void): () => void;
  onEnd(cb: (message: CoopEndMessage) => void): () => void;
  onPeerLeft(cb: () => void): () => void;
  sendInput(message: GuestInputMessage): void;
  sendSnapshot(snapshot: unknown): void;
  sendEnd(reason: CoopEndReason): void;
  leave(): void;
}

export interface CoopLinkHooks {
  onRemoteEnd: (reason: CoopEndReason) => void;
  onPeerLeft: () => void;
}

const MIN_INPUT_INTERVAL_MS = 1000 / COOP_INPUT_RATE_HZ;
const SNAPSHOT_INTERVAL_MS = 1000 / COOP_SNAPSHOT_RATE_HZ;

// Plumbing co-op compartido por las escenas (Desafio y Explorar): deduplicacion
// por seq en ambas direcciones, reconstruccion de flancos del input remoto,
// throttling de envios y guardas de fin de sesion. Vive fuera de Phaser: las
// escenas solo aportan como construir/aplicar su snapshot especifico.
export class CoopSceneLink<TSnapshot extends { seq: number }> {
  readonly role: CoopRole;
  private readonly transport: CoopLinkTransport;

  // Host: ultimo estado sostenido recibido del guest y el previo para flancos.
  private remoteHeld: GameplayInputState = { ...emptyGameplayInputState };
  private remotePrevHeld: GameplayInputState = { ...emptyGameplayInputState };
  private lastRemoteSeq = -1;

  // Guest: throttling de input saliente y ultimo snapshot aceptado.
  private lastInputSentAt = 0;
  private lastInputBits = -1;
  private inputSeq = 0;
  private latest?: TSnapshot;

  // Host: throttling y numeracion de snapshots salientes.
  private lastSnapshotSentAt = 0;
  private snapshotSeq = 0;

  private ended = false;
  private readonly unbinds: Array<() => void> = [];

  constructor(info: CoopSessionInfo, transport: CoopLinkTransport = coopSession) {
    this.role = info.role;
    this.transport = transport;
  }

  get isHost(): boolean {
    return this.role === "host";
  }

  get isGuest(): boolean {
    return this.role === "guest";
  }

  get latestSnapshot(): TSnapshot | undefined {
    return this.latest;
  }

  bind(hooks: CoopLinkHooks): void {
    if (this.isHost) {
      this.unbinds.push(
        this.transport.onInput((message) => {
          if (message.seq <= this.lastRemoteSeq) return;
          this.lastRemoteSeq = message.seq;
          this.remoteHeld = unpackInputState(message.bits);
        }),
      );
    }
    if (this.isGuest) {
      this.unbinds.push(
        this.transport.onSnapshot<TSnapshot>((snapshot) => {
          if (this.latest && snapshot.seq <= this.latest.seq) return;
          this.latest = snapshot;
        }),
      );
    }
    this.unbinds.push(this.transport.onEnd((message) => hooks.onRemoteEnd(message.reason)));
    this.unbinds.push(this.transport.onPeerLeft(() => hooks.onPeerLeft()));
  }

  // Host: convierte el ultimo estado sostenido recibido del guest en un frame
  // con flancos "justPressed" derivados de la transicion respecto del consumo
  // anterior, sin depender de eventos de flanco que la red podria descartar.
  consumeRemoteInputFrame(): GameplayInputFrame {
    const held = this.remoteHeld;
    const prev = this.remotePrevHeld;
    const frame: GameplayInputFrame = {
      ...held,
      jumpJustPressed: held.jump && !prev.jump,
      meleeJustPressed: held.melee && !prev.melee,
      spinJustPressed: held.spin && !prev.spin,
      healJustPressed: held.heal && !prev.heal,
      powerJustPressed: held.power && !prev.power,
      pauseJustPressed: held.pause && !prev.pause,
    };
    this.remotePrevHeld = { ...held };
    return frame;
  }

  // Guest: envia el input inmediatamente cuando cambia (con un tope de
  // COOP_INPUT_RATE_HZ) y, sin cambios, solo como keepalive espaciado.
  sendLocalInput(timeMs: number, state: GameplayInputState): void {
    const bits = packInputState(state);
    const elapsed = timeMs - this.lastInputSentAt;
    const changed = bits !== this.lastInputBits;
    if (changed ? elapsed < MIN_INPUT_INTERVAL_MS : elapsed < COOP_INPUT_KEEPALIVE_MS) return;
    this.lastInputBits = bits;
    this.lastInputSentAt = timeMs;
    this.inputSeq += 1;
    this.transport.sendInput({ seq: this.inputSeq, bits });
  }

  // Host: construye y transmite un snapshot como maximo a COOP_SNAPSHOT_RATE_HZ.
  maybeSendSnapshot(timeMs: number, build: (seq: number) => TSnapshot): void {
    if (timeMs - this.lastSnapshotSentAt < SNAPSHOT_INTERVAL_MS) return;
    this.lastSnapshotSentAt = timeMs;
    this.snapshotSeq += 1;
    this.transport.sendSnapshot(build(this.snapshotSeq));
  }

  // Notifica el fin de partida exactamente una vez. Devuelve false si la sesion
  // ya habia terminado (la escena no debe repetir su propio cierre).
  finish(reason: CoopEndReason): boolean {
    if (this.ended) return false;
    this.ended = true;
    this.transport.sendEnd(reason);
    return true;
  }

  // Marca el fin sin notificar (el cierre vino del peer o de presence).
  markEnded(): boolean {
    if (this.ended) return false;
    this.ended = true;
    return true;
  }

  dispose(): void {
    for (const unbind of this.unbinds) unbind();
    this.unbinds.length = 0;
    this.transport.leave();
  }
}
