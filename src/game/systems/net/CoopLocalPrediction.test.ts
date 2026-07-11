import { describe, expect, it } from "vitest";
import { emptyGameplayInputState, type GameplayInputFrame } from "../../../shared/types/input";
import {
  COOP_PREDICTION_MAX_HISTORY,
  COOP_PREDICTION_SNAP_DISTANCE,
  CoopLocalPrediction,
} from "./CoopLocalPrediction";
import type { NetPlayerState } from "./coopMessages";

const frame: GameplayInputFrame = {
  ...emptyGameplayInputState,
  right: true,
  jumpJustPressed: false,
  meleeJustPressed: false,
  spinJustPressed: false,
  healJustPressed: false,
  powerJustPressed: false,
  pauseJustPressed: false,
};
const net = (x: number): NetPlayerState => ({
  x, y: 0, vx: 100, vy: 0, facing: 1, state: "run", health: 5, maxHealth: 5,
  healCharges: 0, powerCharges: 0, spinCdMs: 0,
});

function fakePlayer(x: number) {
  const body = { setVelocity: (vx: number, vy: number) => { body.velocity = { x: vx, y: vy }; }, velocity: { x: 0, y: 0 } };
  return {
    x, y: 0, stats: { health: 5 }, body,
    setPosition(nx: number, ny: number) { this.x = nx; this.y = ny; },
    renderNetState: () => undefined,
  };
}

describe("CoopLocalPrediction", () => {
  it("elimina inputs confirmados y reaplica solo desplazamientos pendientes", () => {
    const prediction = new CoopLocalPrediction();
    prediction.record(1, frame, 20, { x: 100, y: 0 });
    prediction.record(2, frame, 20, { x: 100, y: 0 });
    const player = fakePlayer(2);
    const result = prediction.reconcile(player as never, net(2), 1);
    expect(result).toMatchObject({ acknowledged: 1, pending: 1, snapped: false });
    expect(player.x).toBeCloseTo(2.7);
  });

  it("teletransporta solo cuando el error supera el umbral seguro", () => {
    const prediction = new CoopLocalPrediction();
    const player = fakePlayer(COOP_PREDICTION_SNAP_DISTANCE + 20);
    const result = prediction.reconcile(player as never, net(0), 0);
    expect(result.snapped).toBe(true);
    expect(player.x).toBe(0);
  });

  it("limita y limpia el historial", () => {
    const prediction = new CoopLocalPrediction();
    for (let seq = 1; seq <= 400; seq += 1) prediction.record(seq, frame, 1, { x: 1, y: 0 });
    expect(prediction.pendingCount).toBe(COOP_PREDICTION_MAX_HISTORY);
    prediction.reset();
    expect(prediction.pendingCount).toBe(0);
  });
});
