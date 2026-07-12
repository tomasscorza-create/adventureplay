import { describe, expect, it } from "vitest";
import { emptyGameplayInputState, type GameplayInputFrame } from "../../../shared/types/input";
import type { NetPlayerState } from "./coopMessages";
import {
  GuestCoopController,
  type GuestCoopLink,
  type GuestCoopSnapshot,
  type GuestCoopUpdateAdapter,
} from "./GuestCoopController";
import type { SnapshotRenderFrame } from "./CoopSnapshotInterpolator";

interface TestSnapshot extends GuestCoopSnapshot {
  marker: string;
}

const input: GameplayInputFrame = {
  ...emptyGameplayInputState,
  jumpJustPressed: false,
  meleeJustPressed: false,
  spinJustPressed: false,
  healJustPressed: false,
  powerJustPressed: false,
  pauseJustPressed: false,
};

function player(x: number, y = 0): NetPlayerState {
  return {
    x, y, vx: 0, vy: 0, facing: 1, state: "idle", health: 5, maxHealth: 5,
    healCharges: 0, powerCharges: 0, spinCdMs: 0,
  };
}

function snapshot(seq: number, selfX: number, selfY = 0): TestSnapshot {
  return {
    seq,
    hostTimeMs: seq * 50,
    inputSeqBySlot: [0, seq],
    players: [player(0), player(selfX, selfY)],
    timeMs: 10_000 - seq * 50,
    marker: `s${seq}`,
  };
}

class FakeGuestLink implements GuestCoopLink<TestSnapshot> {
  latestSnapshot: TestSnapshot | undefined;
  frame: SnapshotRenderFrame<TestSnapshot> | undefined;
  readonly corrections: string[] = [];
  metrics = 0;
  sent = 0;

  sendLocalInput() {
    this.sent += 1;
    return { seq: this.sent, continuous: { left: false, right: false } };
  }
  renderSnapshot() {
    return this.frame;
  }
  recordGuestSnapshotMetrics() {
    this.metrics += 1;
  }
  recordGuestCorrection(reason: string) {
    this.corrections.push(reason);
  }
  setSnapshot(value: TestSnapshot): void {
    this.latestSnapshot = value;
    this.frame = { previous: value, alpha: 0, extrapolationMs: 0 };
  }
}

function adapter(
  localPlayer: { x: number; y: number },
  overrides: Partial<GuestCoopUpdateAdapter<TestSnapshot>> = {},
) {
  const calls = {
    prediction: [] as boolean[],
    movementResets: 0,
    simulations: 0,
    degradedApplications: 0,
    snapshots: [] as boolean[],
    remainingTime: 0,
  };
  const value: GuestCoopUpdateAdapter<TestSnapshot> = {
    timeMs: 100,
    deltaMs: 16,
    input,
    localPlayer,
    localSlot: 1,
    outOfWorld: false,
    nearestDynamicDistancePx: Number.POSITIVE_INFINITY,
    degradedEnterDistancePx: 120,
    setPredictionEnabled: (enabled) => { calls.prediction.push(enabled); },
    resetMovement: () => { calls.movementResets += 1; },
    simulatePredicted: () => { calls.simulations += 1; },
    applyDegradedPlayer: (_net, position) => {
      calls.degradedApplications += 1;
      localPlayer.x = position.x;
      localPlayer.y = position.y;
    },
    interpolateSnapshot: (frame) => frame.previous,
    applySnapshot: (_value, isNew) => { calls.snapshots.push(isNew); },
    applyRemainingTime: (timeMs) => { calls.remainingTime = timeMs; },
    ...overrides,
  };
  return { value, calls };
}

describe("GuestCoopController", () => {
  it("orquesta input, prediccion, metricas y aplicacion de snapshot", () => {
    const link = new FakeGuestLink();
    link.setSnapshot(snapshot(1, 20));
    const controller = new GuestCoopController(link);
    const local = { x: 0, y: 0 };
    const update = adapter(local);

    controller.update(update.value);
    controller.update(update.value);

    expect(link.sent).toBe(2);
    expect(link.metrics).toBe(1);
    expect(update.calls.prediction).toEqual([true]);
    expect(update.calls.simulations).toBe(2);
    expect(update.calls.snapshots).toEqual([true, false]);
    expect(update.calls.remainingTime).toBe(9950);
  });

  it("mantiene degradacion con histeresis y sale una sola vez", () => {
    const link = new FakeGuestLink();
    link.setSnapshot(snapshot(1, 100));
    const controller = new GuestCoopController(link);
    const local = { x: 0, y: 0 };
    const entering = adapter(local, { nearestDynamicDistancePx: 100 });
    controller.update(entering.value);

    const insideHysteresis = adapter(local, { nearestDynamicDistancePx: 150 });
    controller.update(insideHysteresis.value);
    const exiting = adapter(local, { nearestDynamicDistancePx: 181 });
    controller.update(exiting.value);

    expect(entering.calls.prediction).toEqual([false]);
    expect(entering.calls.movementResets).toBe(1);
    expect(insideHysteresis.calls.prediction).toEqual([false]);
    expect(exiting.calls.prediction).toEqual([true]);
    expect(link.corrections.filter((value) => value === "degraded-enter")).toHaveLength(1);
    expect(link.corrections.filter((value) => value === "degraded-exit")).toHaveLength(1);
  });

  it("hace snap cuando el host publica un teleport y reset limpia el lifecycle", () => {
    const link = new FakeGuestLink();
    const controller = new GuestCoopController(link);
    const local = { x: 0, y: 0 };
    link.setSnapshot(snapshot(1, 10));
    controller.update(adapter(local).value);

    link.setSnapshot(snapshot(2, 200));
    controller.update(adapter(local).value);
    expect(local.x).toBe(200);
    expect(link.corrections).toContain("snap");

    controller.reset();
    const afterReset = adapter(local);
    controller.update(afterReset.value);
    expect(afterReset.calls.prediction).toEqual([true]);
    expect(afterReset.calls.snapshots).toEqual([true]);
  });
});
