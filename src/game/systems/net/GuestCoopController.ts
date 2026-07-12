import type { GameplayInputFrame } from "../../../shared/types/input";
import type { NetPlayerState } from "./coopMessages";
import { CoopLocalPrediction } from "./CoopLocalPrediction";
import {
  interpolatePlayer,
  type SnapshotRenderFrame,
  type TimedSnapshot,
} from "./CoopSnapshotInterpolator";
import {
  computeGuestPositionCorrection,
  isAuthoritativeTeleport,
  shouldUseDegradedMode,
  type CoopPosition,
} from "./coopGuestReconciliation";
import type { CoopPredictionCommand } from "./CoopLocalPrediction";

export interface GuestCoopSnapshot extends TimedSnapshot {
  inputSeqBySlot: number[];
  players: NetPlayerState[];
  timeMs: number;
}

export interface GuestCoopLink<TSnapshot extends GuestCoopSnapshot> {
  latestSnapshot: TSnapshot | undefined;
  sendLocalInput(timeMs: number, frame: GameplayInputFrame): CoopPredictionCommand | undefined;
  renderSnapshot(localNowMs?: number): SnapshotRenderFrame<TSnapshot> | undefined;
  recordGuestSnapshotMetrics(
    snapshot: TSnapshot,
    localX: number,
    localY: number,
    authoritativeX: number,
    authoritativeY: number,
    localNowMs?: number,
  ): void;
  recordGuestCorrection(reason: string): void;
}

export interface GuestCoopUpdateAdapter<TSnapshot extends GuestCoopSnapshot> {
  timeMs: number;
  deltaMs: number;
  input: GameplayInputFrame;
  localPlayer: CoopPosition;
  localSlot: number;
  outOfWorld: boolean;
  nearestDynamicDistancePx: number;
  degradedEnterDistancePx: number;
  setPredictionEnabled(enabled: boolean): void;
  resetMovement(): void;
  simulatePredicted(): void;
  applyDegradedPlayer(net: NetPlayerState, position: CoopPosition): void;
  interpolateSnapshot(frame: SnapshotRenderFrame<TSnapshot>): TSnapshot;
  applySnapshot(snapshot: TSnapshot, isNew: boolean): void;
  applyRemainingTime(timeMs: number): void;
}

// Ciclo comun del guest. Phaser permanece detras de adaptadores pequenos: el
// controlador decide ACK, timeline, prediccion, convergencia, degradacion y
// aplicacion del snapshot sin conocer escenas, cuerpos ni efectos concretos.
export class GuestCoopController<TSnapshot extends GuestCoopSnapshot> {
  private readonly prediction = new CoopLocalPrediction();
  private lastAppliedSnapshotSeq = -1;
  private lastReconciledSnapshotSeq = -1;
  private predictionActive = false;
  private degraded = false;
  private lastAuthoritativePosition?: CoopPosition;

  constructor(private readonly link: GuestCoopLink<TSnapshot>) {}

  update(adapter: GuestCoopUpdateAdapter<TSnapshot>): void {
    const sentCommand = this.link.sendLocalInput(adapter.timeMs, adapter.input);
    if (sentCommand) this.prediction.record(sentCommand);

    const latest = this.link.latestSnapshot;
    const frame = this.link.renderSnapshot();
    const previousRenderedSelf = frame?.previous.players[adapter.localSlot];
    const renderedSelf = frame && previousRenderedSelf
      ? interpolatePlayer(
        previousRenderedSelf,
        frame.next?.players[adapter.localSlot],
        frame.alpha,
        frame.extrapolationMs,
      )
      : undefined;
    let forceAuthoritativeSnap = false;

    if (latest && latest.seq !== this.lastReconciledSnapshotSeq) {
      this.lastReconciledSnapshotSeq = latest.seq;
      this.prediction.acknowledge(latest.inputSeqBySlot[adapter.localSlot] ?? -1);
      this.prediction.traceCorrection("none");
      const authoritative = latest.players[adapter.localSlot];
      if (authoritative) {
        forceAuthoritativeSnap = isAuthoritativeTeleport(
          this.lastAuthoritativePosition,
          authoritative,
        );
        this.lastAuthoritativePosition = { x: authoritative.x, y: authoritative.y };
        this.link.recordGuestSnapshotMetrics(
          latest,
          adapter.localPlayer.x,
          adapter.localPlayer.y,
          authoritative.x,
          authoritative.y,
        );
      }
    }

    const authoritative = latest?.players[adapter.localSlot];
    const useDegradedMode = adapter.outOfWorld || shouldUseDegradedMode(
      adapter.nearestDynamicDistancePx,
      this.degraded,
      adapter.degradedEnterDistancePx,
    );
    const degradedTarget = forceAuthoritativeSnap || adapter.outOfWorld
      ? authoritative
      : renderedSelf ?? authoritative;

    if (useDegradedMode && degradedTarget) {
      if (!this.degraded) {
        this.recordCorrection(adapter.outOfWorld ? "out-of-world" : "degraded-enter");
        adapter.resetMovement();
      }
      this.degraded = true;
      this.predictionActive = false;
      adapter.setPredictionEnabled(false);
      const correction = computeGuestPositionCorrection(
        adapter.localPlayer,
        degradedTarget,
        adapter.deltaMs,
        forceAuthoritativeSnap || adapter.outOfWorld,
        false,
        0,
      );
      adapter.applyDegradedPlayer(degradedTarget, correction);
      if (correction.kind !== "none") this.recordCorrection(correction.kind);
    } else {
      if (this.degraded) {
        this.degraded = false;
        this.recordCorrection("degraded-exit");
      }
      if (!this.predictionActive) {
        adapter.setPredictionEnabled(true);
        this.predictionActive = true;
      }
      adapter.simulatePredicted();
      const correctionTarget = forceAuthoritativeSnap ? authoritative : renderedSelf;
      if (correctionTarget) {
        const correction = computeGuestPositionCorrection(
          adapter.localPlayer,
          correctionTarget,
          adapter.deltaMs,
          forceAuthoritativeSnap,
        );
        if (correction.kind !== "none") {
          adapter.localPlayer.x = correction.x;
          adapter.localPlayer.y = correction.y;
          this.recordCorrection(correction.kind);
        }
      }
    }

    if (frame) {
      const snapshot = adapter.interpolateSnapshot(frame);
      const isNew = frame.previous.seq !== this.lastAppliedSnapshotSeq;
      this.lastAppliedSnapshotSeq = frame.previous.seq;
      adapter.applySnapshot(snapshot, isNew);
      adapter.applyRemainingTime(frame.previous.timeMs);
    }
  }

  traceEdge(action: "jump" | "melee" | "spin" | "power"): void {
    this.prediction.traceEdge(action);
  }

  reset(): void {
    this.prediction.reset();
    this.lastAppliedSnapshotSeq = -1;
    this.lastReconciledSnapshotSeq = -1;
    this.predictionActive = false;
    this.degraded = false;
    this.lastAuthoritativePosition = undefined;
  }

  private recordCorrection(kind: Parameters<CoopLocalPrediction["traceCorrection"]>[0]): void {
    this.prediction.traceCorrection(kind);
    this.link.recordGuestCorrection(kind);
  }
}
