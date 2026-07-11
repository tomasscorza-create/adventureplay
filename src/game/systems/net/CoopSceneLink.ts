import type { CoopSessionInfo } from "../../events/EventBus";
import {
  emptyGameplayInputState,
  type GameplayInputFrame,
  type GameplayInputState,
} from "../../../shared/types/input";
import { coopSession, type CoopConnectionState } from "./CoopSession";
import {
  COOP_INPUT_KEEPALIVE_MS,
  COOP_INPUT_RATE_HZ,
  COOP_SNAPSHOT_RATE_HZ,
  packInputState,
  unpackInputState,
  type CoopChargesMessage,
  type CoopEndMessage,
  type CoopEndReason,
  type CoopInputMessage,
  type CoopRole,
  type CoopStartMessage,
} from "./coopMessages";
import {
  CoopSnapshotInterpolator,
  type SnapshotRenderFrame,
  type TimedSnapshot,
} from "./CoopSnapshotInterpolator";

// Transporte minimo que necesita el link. CoopSession lo satisface tal cual;
// los tests inyectan una implementacion falsa sin tocar Supabase.
export interface CoopLinkTransport {
  onInput(cb: (message: CoopInputMessage) => void): () => void;
  onSnapshot<T>(cb: (snapshot: T) => void): () => void;
  onEnd(cb: (message: CoopEndMessage) => void): () => void;
  onPeerLeft(cb: () => void): () => void;
  onParticipantLeft?(cb: (slot: number) => void): () => void;
  onParticipantRejoined?(cb: (slot: number) => void): () => void;
  onParticipantReconnectExpired?(cb: (slot: number) => void): () => void;
  onStart?(cb: (message: CoopStartMessage) => void): () => void;
  onCharges?(cb: (message: CoopChargesMessage) => void): () => void;
  onConnectionState?(cb: (state: CoopConnectionState) => void): () => void;
  sendInput(message: CoopInputMessage): void;
  sendSnapshot(snapshot: unknown): void;
  sendEnd(reason: CoopEndReason, slot?: number): void;
  sendCharges?(message: CoopChargesMessage): void;
  recordSnapshotKind?(keyframe: boolean): void;
  recordInputApplied?(slot: number, latencyMs: number): void;
  recordDesync?(): void;
  generateInputSeq(): number;
  leave(): void;
}

export interface CoopLinkHooks {
  onRemoteEnd: (reason: CoopEndReason, slot?: number) => void;
  onPeerLeft: () => void;
  onParticipantLeft?: (slot: number) => void;
  onParticipantRejoined?: (slot: number) => void;
  onParticipantReconnectExpired?: (slot: number) => void;
  // El host reutiliza el mensaje `start` para encadenar el siguiente nivel de
  // la sala; los guests lo reciben aqui una vez terminado el nivel actual.
  onStartNextLevel?: (message: CoopStartMessage) => void;
  // Host: un jugador compro cargas durante la partida (delta por slot).
  onRemoteCharges?: (message: CoopChargesMessage) => void;
  onPredictionReset?: () => void;
}

const MIN_INPUT_INTERVAL_MS = 1000 / COOP_INPUT_RATE_HZ;
const SNAPSHOT_INTERVAL_MS = 1000 / COOP_SNAPSHOT_RATE_HZ;
const LOCAL_PRESS_EDGES = [
  ["jump", "jumpJustPressed"],
  ["melee", "meleeJustPressed"],
  ["spin", "spinJustPressed"],
  ["heal", "healJustPressed"],
  ["power", "powerJustPressed"],
  ["pause", "pauseJustPressed"],
] as const satisfies ReadonlyArray<readonly [keyof GameplayInputState, keyof GameplayInputFrame]>;

// Estado del input remoto de un slot: el ultimo sostenido, el previo (para
// flancos) y los flancos acumulados entre consumos.
interface RemoteInputSlot {
  held: GameplayInputState;
  prevHeld: GameplayInputState;
  pressed: GameplayInputState;
  lastSeq: number;
  processedSeq: number;
  receivedAtMs?: number;
}

function createRemoteInputSlot(): RemoteInputSlot {
  return {
    held: { ...emptyGameplayInputState },
    prevHeld: { ...emptyGameplayInputState },
    pressed: { ...emptyGameplayInputState },
    lastSeq: -1,
    processedSeq: -1,
    receivedAtMs: undefined,
  };
}

const OPTIONAL_SECTIONS = new Set([
  "enemies",
  "platforms",
  "hazards",
  "crates",
  "coins",
  "hearts",
  "gatesOpen",
  "sealsAlive",
  "active",
]);

// Plumbing co-op compartido por las escenas (Desafio y Explorar): deduplicacion
// por seq en ambas direcciones, reconstruccion de flancos del input remoto,
// throttling de envios y guardas de fin de sesion. Vive fuera de Phaser: las
// escenas solo aportan como construir/aplicar su snapshot especifico.
export class CoopSceneLink<TSnapshot extends { seq: number; hostTimeMs?: number }> {
  readonly role: CoopRole;
  readonly localSlot: number;
  private readonly transport: CoopLinkTransport;

  // Host: input remoto por slot emisor (uno por guest). Cada guest tiene su
  // propia numeracion de seq, deduplicada de forma independiente.
  private readonly remoteInputs = new Map<number, RemoteInputSlot>();

  // Guest: throttling de input saliente y ultimo snapshot aceptado.
  private lastInputSentAt = 0;
  private lastInputBits = -1;
  private lastLocalInputSeq = 0;
  // Flancos locales que aun no pudieron cruzar la red por el throttle. El
  // contador conserva incluso pulsaciones repetidas de una misma accion; si el
  // ultimo paquete aun la tenia activa, primero se envia su liberacion y luego
  // el siguiente flanco para que el host pueda reconstruir ambas transiciones.
  private readonly pendingLocalPresses: Partial<Record<keyof GameplayInputState, number>> = {};
  private latest?: TSnapshot;
  private readonly snapshotTimeline = new CoopSnapshotInterpolator<TSnapshot & TimedSnapshot>();

  // Host: throttling y numeracion de snapshots salientes.
  private lastSnapshotSentAt = 0;
  private snapshotSeq = 0;
  private lastSentSections: Record<string, string> = {};
  private forceFullSnapshot = false;

  private ended = false;
  private endedReason?: CoopEndReason;
  private readonly unbinds: Array<() => void> = [];

  constructor(info: CoopSessionInfo, transport: CoopLinkTransport = coopSession) {
    this.role = info.role;
    this.localSlot = info.localSlot;
    this.transport = transport;
  }

  renderSnapshot(localNowMs?: number): SnapshotRenderFrame<TSnapshot & TimedSnapshot> | undefined {
    const now = localNowMs ?? (typeof performance !== "undefined" ? performance.now() : Date.now());
    return this.snapshotTimeline.sample(now);
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
          const slot = this.remoteSlot(message.slot);
          if (message.seq <= slot.lastSeq) return;
          slot.lastSeq = message.seq;
          slot.receivedAtMs = message.receivedAtMs;
          const held = unpackInputState(message.bits);
          for (const action of Object.keys(held) as Array<keyof GameplayInputState>) {
            if (held[action] && !slot.held[action]) slot.pressed[action] = true;
          }
          slot.held = held;
        }),
      );
    }
    if (this.isGuest) {
      this.unbinds.push(
        this.transport.onSnapshot<TSnapshot>((snapshot) => {
          if (this.latest && snapshot.seq <= this.latest.seq) return;
          if (typeof snapshot.hostTimeMs !== "number") return;
          if (this.latest && snapshot.seq > this.latest.seq + 1) {
            this.transport.recordDesync?.();
          }
          
          if (this.latest) {
            const snapAny = snapshot as Record<string, unknown>;
            const latestAny = this.latest as Record<string, unknown>;
            for (const key of OPTIONAL_SECTIONS) {
              if (!(key in snapAny) && (key in latestAny)) {
                snapAny[key] = latestAny[key];
              }
            }
          }
          
          const accepted = this.snapshotTimeline.push(
            snapshot as TSnapshot & TimedSnapshot,
            typeof performance !== "undefined" ? performance.now() : Date.now(),
          );
          if (accepted) this.latest = snapshot;
        }),
      );
    }
    this.unbinds.push(this.transport.onEnd((message) => hooks.onRemoteEnd(message.reason, message.slot)));
    this.unbinds.push(this.transport.onPeerLeft(() => hooks.onPeerLeft()));
    if (this.transport.onParticipantLeft && hooks.onParticipantLeft) {
      this.unbinds.push(this.transport.onParticipantLeft((slot) => {
        if (this.isHost) this.clearRemoteInput(slot);
        hooks.onParticipantLeft!(slot);
      }));
    }
    if (this.transport.onParticipantRejoined) {
      this.unbinds.push(this.transport.onParticipantRejoined((slot) => {
        if (this.isHost) {
          this.forceFullSnapshot = true;
          if (this.endedReason) this.transport.sendEnd(this.endedReason, this.localSlot);
        }
        hooks.onParticipantRejoined?.(slot);
      }));
    }
    if (this.transport.onParticipantReconnectExpired && hooks.onParticipantReconnectExpired) {
      this.unbinds.push(this.transport.onParticipantReconnectExpired((slot) => {
        hooks.onParticipantReconnectExpired!(slot);
      }));
    }
    if (this.transport.onStart && hooks.onStartNextLevel) {
      this.unbinds.push(this.transport.onStart((message) => hooks.onStartNextLevel!(message)));
    }
    if (this.transport.onCharges && hooks.onRemoteCharges) {
      this.unbinds.push(this.transport.onCharges((message) => hooks.onRemoteCharges!(message)));
    }
    if (this.isGuest && this.transport.onConnectionState && hooks.onPredictionReset) {
      this.unbinds.push(this.transport.onConnectionState((state) => {
        if (state === "reconnecting") hooks.onPredictionReset!();
      }));
    }
  }

  // Guest: las compras durante la partida estan deshabilitadas en co-op remoto (Fase 1).
  sendChargeDelta(healingDelta: number, powerDelta: number): void {
    void healingDelta;
    void powerDelta;
    // this.transport.sendCharges?.({ slot: this.localSlot, healingDelta, powerDelta });
  }

  private remoteSlot(slot: number): RemoteInputSlot {
    let state = this.remoteInputs.get(slot);
    if (!state) {
      state = createRemoteInputSlot();
      this.remoteInputs.set(slot, state);
    }
    return state;
  }

  // Host: convierte el ultimo estado sostenido recibido del guest en el `slot`
  // dado en un frame con flancos "justPressed" derivados de la transicion
  // respecto del consumo anterior, mas los flancos acumulados entre mensajes
  // para que ningun tap se pierda aunque su press y release lleguen en el mismo
  // lote de red. Un slot sin input aun devuelve un frame vacio.
  consumeRemoteInputFrame(slot: number): GameplayInputFrame {
    const state = this.remoteSlot(slot);
    const { held, prevHeld, pressed } = state;
    const frame: GameplayInputFrame = {
      ...held,
      jumpJustPressed: (held.jump && !prevHeld.jump) || pressed.jump,
      meleeJustPressed: (held.melee && !prevHeld.melee) || pressed.melee,
      spinJustPressed: (held.spin && !prevHeld.spin) || pressed.spin,
      healJustPressed: (held.heal && !prevHeld.heal) || pressed.heal,
      powerJustPressed: (held.power && !prevHeld.power) || pressed.power,
      pauseJustPressed: (held.pause && !prevHeld.pause) || pressed.pause,
    };
    state.pressed = { ...emptyGameplayInputState };
    state.prevHeld = { ...held };
    state.processedSeq = state.lastSeq;
    if (state.receivedAtMs !== undefined) {
      const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
      this.transport.recordInputApplied?.(slot, Math.max(0, nowMs - state.receivedAtMs));
      state.receivedAtMs = undefined;
    }
    return frame;
  }

  clearRemoteInput(slot: number): void {
    this.remoteInputs.set(slot, createRemoteInputSlot());
  }

  // Guest: envia el input inmediatamente cuando cambia (con un tope de
  // COOP_INPUT_RATE_HZ) y, sin cambios, solo como keepalive espaciado.
  // Los taps mobile pueden vivir un unico frame solo como "justPressed", sin
  // estado sostenido (cola de TouchInputStore): se funden en los bits para que
  // el host siempre reciba al menos un mensaje con la accion activa.
  sendLocalInput(timeMs: number, frame: GameplayInputFrame): number {
    for (const [action, edge] of LOCAL_PRESS_EDGES) {
      if (frame[edge]) {
        this.pendingLocalPresses[action] = (this.pendingLocalPresses[action] ?? 0) + 1;
      }
    }

    const effective: GameplayInputState = {
      left: frame.left,
      right: frame.right,
      jump: frame.jump,
      melee: frame.melee,
      spin: frame.spin,
      heal: frame.heal,
      power: frame.power,
      pause: frame.pause,
    };
    const lastSent = this.lastInputBits < 0
      ? emptyGameplayInputState
      : unpackInputState(this.lastInputBits);
    const deliveredPresses: Array<keyof GameplayInputState> = [];

    for (const [action] of LOCAL_PRESS_EDGES) {
      if ((this.pendingLocalPresses[action] ?? 0) <= 0) continue;
      if (lastSent[action]) {
        // Una pulsacion nueva necesita antes un paquete de liberacion; conservar
        // el contador hace que el flanco se envie en la siguiente oportunidad.
        effective[action] = false;
      } else {
        effective[action] = true;
        deliveredPresses.push(action);
      }
    }

    const bits = packInputState(effective);
    const elapsed = timeMs - this.lastInputSentAt;
    const changed = bits !== this.lastInputBits;
    if (changed ? elapsed < MIN_INPUT_INTERVAL_MS : elapsed < COOP_INPUT_KEEPALIVE_MS) {
      // Los frames locales posteriores al ultimo paquete pertenecen al proximo
      // seq: asi un ACK del paquete sostenido anterior no borra prediccion que
      // ocurrio despues del snapshot autoritativo.
      return this.lastLocalInputSeq + 1;
    }

    const nextSeq = this.transport.generateInputSeq();
    this.transport.sendInput({ slot: this.localSlot, seq: nextSeq, bits });
    this.lastLocalInputSeq = nextSeq;

    // Solo consumir flancos y avanzar el estado despues de que el transporte
    // haya aceptado el envio; si lanza un error, la cola queda intacta.
    for (const action of deliveredPresses) {
      const remaining = (this.pendingLocalPresses[action] ?? 0) - 1;
      if (remaining > 0) this.pendingLocalPresses[action] = remaining;
      else delete this.pendingLocalPresses[action];
    }
    this.lastInputBits = bits;
    this.lastInputSentAt = timeMs;
    return nextSeq;
  }

  // Host: construye y transmite un snapshot como maximo a COOP_SNAPSHOT_RATE_HZ.
  maybeSendSnapshot(timeMs: number, build: (seq: number) => TSnapshot): void {
    if (timeMs - this.lastSnapshotSentAt < SNAPSHOT_INTERVAL_MS) return;
    this.lastSnapshotSentAt = timeMs;
    this.snapshotSeq += 1;
    
    const snap = build(this.snapshotSeq) as Record<string, unknown>;
    snap.hostTimeMs = timeMs;
    const highestSlot = Math.max(0, ...this.remoteInputs.keys());
    snap.inputSeqBySlot = Array.from(
      { length: highestSlot + 1 },
      (_, slot) => slot === 0 ? 0 : this.remoteInputs.get(slot)?.processedSeq ?? -1,
    );
    const out: Record<string, unknown> = {};
    const isKeyframe = this.forceFullSnapshot
      || this.snapshotSeq % COOP_SNAPSHOT_RATE_HZ === 0;
    this.forceFullSnapshot = false;
    this.transport.recordSnapshotKind?.(isKeyframe);
    
    for (const key of Object.keys(snap)) {
      if (OPTIONAL_SECTIONS.has(key)) {
        const serialized = JSON.stringify(snap[key]);
        if (isKeyframe || this.lastSentSections[key] !== serialized) {
          out[key] = snap[key];
          this.lastSentSections[key] = serialized;
        }
      } else {
        out[key] = snap[key];
      }
    }
    
    this.transport.sendSnapshot(out as TSnapshot);
  }

  // Notifica el fin de partida exactamente una vez. Devuelve false si la sesion
  // ya habia terminado (la escena no debe repetir su propio cierre).
  finish(reason: CoopEndReason): boolean {
    if (this.ended) return false;
    this.ended = true;
    this.endedReason = reason;
    this.transport.sendEnd(reason, this.localSlot);
    return true;
  }

  // Marca el fin sin notificar (el cierre vino del peer o de presence).
  markEnded(): boolean {
    if (this.ended) return false;
    this.ended = true;
    return true;
  }

  // `keepSession = true` desuscribe los callbacks pero conserva el canal vivo:
  // se usa al encadenar el siguiente nivel co-op, donde la nueva escena crea un
  // link nuevo sobre la misma sala.
  dispose(keepSession = false): void {
    for (const unbind of this.unbinds) unbind();
    this.unbinds.length = 0;
    if (!keepSession) this.transport.leave();
  }
}
