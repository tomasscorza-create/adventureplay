import type { GameplayInputFrame } from "../../../shared/types/input";
import type { Player } from "../../entities/player/Player";
import type { NetPlayerState } from "./coopMessages";

export const COOP_PREDICTION_SNAP_DISTANCE = 96;
export const COOP_PREDICTION_SOFT_FACTOR = 0.35;
export const COOP_PREDICTION_MAX_HISTORY = 180;
const COOP_PREDICTION_MAX_AGE_MS = 3000;

interface PredictedInputSample {
  seq: number;
  elapsedMs: number;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  input: GameplayInputFrame;
}

export interface PredictionReconciliation {
  acknowledged: number;
  pending: number;
  error: number;
  snapped: boolean;
}

// Conserva solo el movimiento visual reproducible. No modela colisiones con
// entidades dinámicas ni consecuencias de combate: esas siguen en el host.
export class CoopLocalPrediction {
  private readonly pending: PredictedInputSample[] = [];
  private lastObservedPosition?: { x: number; y: number };

  recordPlayer(seq: number, input: GameplayInputFrame, deltaMs: number, player: Player): void {
    const body = player.body as Phaser.Physics.Arcade.Body;
    const previous = this.lastObservedPosition;
    this.record(
      seq,
      input,
      deltaMs,
      body.velocity,
      previous ? { x: player.x - previous.x, y: player.y - previous.y } : { x: 0, y: 0 },
    );
    this.lastObservedPosition = { x: player.x, y: player.y };
  }

  record(
    seq: number,
    input: GameplayInputFrame,
    deltaMs: number,
    velocity: { x: number; y: number },
    displacement?: { x: number; y: number },
  ): void {
    if (seq <= 0) return;
    const elapsedMs = Math.max(0, Math.min(50, deltaMs));
    this.pending.push({
      seq,
      elapsedMs,
      dx: displacement?.x ?? velocity.x * elapsedMs / 1000,
      dy: displacement?.y ?? velocity.y * elapsedMs / 1000,
      vx: velocity.x,
      vy: velocity.y,
      input,
    });
    while (this.pending.length > COOP_PREDICTION_MAX_HISTORY) this.pending.shift();
    while (this.pending.length > 0 && this.totalAgeMs() > COOP_PREDICTION_MAX_AGE_MS) {
      this.pending.shift();
    }
  }

  reconcile(player: Player, authoritative: NetPlayerState, acknowledgedSeq: number): PredictionReconciliation {
    let acknowledged = 0;
    while (this.pending.length > 0 && this.pending[0].seq <= acknowledgedSeq) {
      this.pending.shift();
      acknowledged += 1;
    }

    let targetX = authoritative.x;
    let targetY = authoritative.y;
    for (const sample of this.pending) {
      targetX += sample.dx;
      targetY += sample.dy;
    }
    const errorX = targetX - player.x;
    const errorY = targetY - player.y;
    const error = Math.hypot(errorX, errorY);
    const snapped = error > COOP_PREDICTION_SNAP_DISTANCE;
    if (snapped) {
      player.setPosition(targetX, targetY);
    } else {
      player.setPosition(
        player.x + errorX * COOP_PREDICTION_SOFT_FACTOR,
        player.y + errorY * COOP_PREDICTION_SOFT_FACTOR,
      );
    }

    const body = player.body as Phaser.Physics.Arcade.Body;
    const latest = this.pending[this.pending.length - 1];
    body.setVelocity(latest?.vx ?? authoritative.vx, latest?.vy ?? authoritative.vy);
    player.stats.health = authoritative.health;
    if (!latest) player.renderNetState(authoritative.state, authoritative.facing);
    this.lastObservedPosition = { x: player.x, y: player.y };
    return { acknowledged, pending: this.pending.length, error, snapped };
  }

  reset(): void {
    this.pending.length = 0;
    this.lastObservedPosition = undefined;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  private totalAgeMs(): number {
    return this.pending.reduce((total, sample) => total + sample.elapsedMs, 0);
  }
}
