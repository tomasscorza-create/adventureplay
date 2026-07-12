import { describe, expect, it } from "vitest";
import {
  COOP_MAX_EXTRAPOLATION_MS,
  CoopSnapshotInterpolator,
  interpolatePlayer,
  interpolatePositionTuples,
} from "./CoopSnapshotInterpolator";
import type { NetPlayerState } from "./coopMessages";

const player = (x: number, vx = 100): NetPlayerState => ({
  x, y: 20, vx, vy: 0, facing: 1, state: "idle", health: 5, maxHealth: 5,
  healCharges: 0, powerCharges: 0, spinCdMs: 0,
});

describe("CoopSnapshotInterpolator", () => {
  it("interpola entre los snapshots que rodean el tiempo de render", () => {
    const buffer = new CoopSnapshotInterpolator<{ seq: number; hostTimeMs: number }>();
    buffer.push({ seq: 1, hostTimeMs: 100 }, 1100);
    buffer.push({ seq: 2, hostTimeMs: 150 }, 1150);
    buffer.push({ seq: 3, hostTimeMs: 200 }, 1200);

    const frame = buffer.sample(1210)!; // host estimado 210; render 125
    expect(frame.previous.seq).toBe(1);
    expect(frame.next?.seq).toBe(2);
    expect(frame.alpha).toBeCloseTo(0.5);
  });

  it("ignora snapshots duplicados o atrasados y conserva solo tres", () => {
    const buffer = new CoopSnapshotInterpolator<{ seq: number; hostTimeMs: number }>();
    expect(buffer.push({ seq: 1, hostTimeMs: 50 }, 1050)).toBe(true);
    expect(buffer.push({ seq: 1, hostTimeMs: 50 }, 1060)).toBe(false);
    expect(buffer.push({ seq: 0, hostTimeMs: 0 }, 1060)).toBe(false);
    expect(buffer.push({ seq: 2, hostTimeMs: 40 }, 1060)).toBe(false);
    buffer.push({ seq: 2, hostTimeMs: 100 }, 1100);
    buffer.push({ seq: 3, hostTimeMs: 150 }, 1150);
    buffer.push({ seq: 4, hostTimeMs: 200 }, 1200);
    expect(buffer.sample(1200)?.previous.seq).toBe(2);
  });

  it("limita la extrapolacion aunque dejen de llegar snapshots", () => {
    const buffer = new CoopSnapshotInterpolator<{ seq: number; hostTimeMs: number }>();
    buffer.push({ seq: 1, hostTimeMs: 100 }, 1100);
    expect(buffer.sample(5000)?.extrapolationMs).toBe(COOP_MAX_EXTRAPOLATION_MS);
    expect(interpolatePlayer(player(10), undefined, 0, 100).x).toBe(20);
  });

  it("expone la edad del snapshot usando el offset minimo observado", () => {
    const buffer = new CoopSnapshotInterpolator<{ seq: number; hostTimeMs: number }>();
    expect(buffer.snapshotAgeMs(100, 1100)).toBeUndefined();
    buffer.push({ seq: 1, hostTimeMs: 100 }, 1100);
    buffer.push({ seq: 2, hostTimeMs: 150 }, 1180);
    expect(buffer.snapshotAgeMs(150, 1180)).toBe(30);
  });

  it("interpola entidades por id sin acelerar desde la posicion renderizada previa", () => {
    const result = interpolatePositionTuples(
      [[7, 0, 20, 0]],
      [[7, 100, 40, 1]],
      0.25,
    );
    expect(result).toEqual([[7, 25, 25, 1]]);
  });

  it("produce desplazamientos lineales entre snapshots enviados a veinte hertz", () => {
    const buffer = new CoopSnapshotInterpolator<{ seq: number; hostTimeMs: number }>();
    buffer.push({ seq: 1, hostTimeMs: 0 }, 1000);
    buffer.push({ seq: 2, hostTimeMs: 50 }, 1050);
    buffer.push({ seq: 3, hostTimeMs: 100 }, 1100);
    const xs = [1090, 1100, 1110, 1120].map((now) => {
      const frame = buffer.sample(now)!;
      return interpolatePlayer(
        player(frame.previous.hostTimeMs),
        frame.next ? player(frame.next.hostTimeMs) : undefined,
        frame.alpha,
        frame.extrapolationMs,
      ).x;
    });
    expect(xs).toEqual([5, 15, 25, 35]);
  });
});
