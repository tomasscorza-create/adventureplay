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
  // Host: flancos ascendentes acumulados entre consumos. Si un press y su
  // release llegan juntos (batching de la red), compararlos contra el ultimo
  // consumo los colapsaria y el tap se perderia; aca quedan retenidos.
  private remotePressed: GameplayInputState = { ...emptyGameplayInputState };
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
          const held = unpackInputState(message.bits);
          for (const action of Object.keys(held) as Array<keyof GameplayInputState>) {
            if (held[action] && !this.remoteHeld[action]) this.remotePressed[action] = true;
          }
          this.remoteHeld = held;
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
  // anterior, mas los flancos acumulados entre mensajes para que ningun tap
  // se pierda aunque su press y release lleguen en el mismo lote de red.
  consumeRemoteInputFrame(): GameplayInputFrame {
    const held = this.remoteHeld;
    const prev = this.remotePrevHeld;
    const pressed = this.remotePressed;
    const frame: GameplayInputFrame = {
      ...held,
      jumpJustPressed: (held.jump && !prev.jump) || pressed.jump,
      meleeJustPressed: (held.melee && !prev.melee) || pressed.melee,
      spinJustPressed: (held.spin && !prev.spin) || pressed.spin,
      healJustPressed: (held.heal && !prev.heal) || pressed.heal,
      powerJustPressed: (held.power && !prev.power) || pressed.power,
      pauseJustPressed: (held.pause && !prev.pause) || pressed.pause,
    };
    this.remotePressed = { ...emptyGameplayInputState };
    this.remotePrevHeld = { ...held };
    return frame;
  }

  // Guest: envia el input inmediatamente cuando cambia (con un tope de
  // COOP_INPUT_RATE_HZ) y, sin cambios, solo como keepalive espaciado.
  // Los taps mobile pueden vivir un unico frame solo como "justPressed", sin
  // estado sostenido (cola de TouchInputStore): se funden en los bits para que
  // el host siempre reciba al menos un mensaje con la accion activa.
  sendLocalInput(timeMs: number, frame: GameplayInputFrame): void {
    const effective: GameplayInputState = {
      left: frame.left,
      right: frame.right,
      jump: frame.jump || frame.jumpJustPressed,
      melee: frame.melee || frame.meleeJustPressed,
      spin: frame.spin || frame.spinJustPressed,
      heal: frame.heal || frame.healJustPressed,
      power: frame.power || frame.powerJustPressed,
      pause: frame.pause || frame.pauseJustPressed,
    };
    const bits = packInputState(effective);
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
