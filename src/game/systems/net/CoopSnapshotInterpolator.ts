import type { NetPlayerState, NetProjectile } from "./coopMessages";

export const COOP_RENDER_DELAY_MS = 85;
export const COOP_MAX_EXTRAPOLATION_MS = 100;
const MAX_BUFFERED_SNAPSHOTS = 3;

export interface TimedSnapshot {
  seq: number;
  hostTimeMs: number;
}

export interface SnapshotRenderFrame<TSnapshot extends TimedSnapshot> {
  previous: TSnapshot;
  next?: TSnapshot;
  alpha: number;
  extrapolationMs: number;
}

// Mantiene una linea temporal corta del host. El menor offset observado evita
// que un paquete con jitter retrase todo el reloj; el delay de render absorbe
// la variacion normal de llegada.
export class CoopSnapshotInterpolator<TSnapshot extends TimedSnapshot> {
  private readonly snapshots: TSnapshot[] = [];
  private clockOffsetMs = Number.POSITIVE_INFINITY;

  push(snapshot: TSnapshot, receivedAtMs: number): boolean {
    if (!Number.isFinite(snapshot.hostTimeMs)) return false;
    const latest = this.snapshots[this.snapshots.length - 1];
    if (latest && (snapshot.seq <= latest.seq || snapshot.hostTimeMs <= latest.hostTimeMs)) {
      return false;
    }
    this.clockOffsetMs = Math.min(this.clockOffsetMs, receivedAtMs - snapshot.hostTimeMs);
    this.snapshots.push(snapshot);
    if (this.snapshots.length > MAX_BUFFERED_SNAPSHOTS) this.snapshots.shift();
    return true;
  }

  sample(localNowMs: number): SnapshotRenderFrame<TSnapshot> | undefined {
    if (this.snapshots.length === 0 || !Number.isFinite(this.clockOffsetMs)) return undefined;
    const renderHostTime = localNowMs - this.clockOffsetMs - COOP_RENDER_DELAY_MS;
    const first = this.snapshots[0];
    if (renderHostTime <= first.hostTimeMs) {
      return { previous: first, next: this.snapshots[1], alpha: 0, extrapolationMs: 0 };
    }

    for (let index = 0; index < this.snapshots.length - 1; index += 1) {
      const previous = this.snapshots[index];
      const next = this.snapshots[index + 1];
      if (renderHostTime > next.hostTimeMs) continue;
      const span = Math.max(1, next.hostTimeMs - previous.hostTimeMs);
      return {
        previous,
        next,
        alpha: Math.min(1, Math.max(0, (renderHostTime - previous.hostTimeMs) / span)),
        extrapolationMs: 0,
      };
    }

    const latest = this.snapshots[this.snapshots.length - 1];
    return {
      previous: latest,
      alpha: 0,
      extrapolationMs: Math.min(
        COOP_MAX_EXTRAPOLATION_MS,
        Math.max(0, renderHostTime - latest.hostTimeMs),
      ),
    };
  }

  snapshotAgeMs(hostTimeMs: number, localNowMs: number): number | undefined {
    if (!Number.isFinite(this.clockOffsetMs) || !Number.isFinite(hostTimeMs)
      || !Number.isFinite(localNowMs)) return undefined;
    return Math.max(0, localNowMs - (hostTimeMs + this.clockOffsetMs));
  }
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

export function interpolatePlayer(
  previous: NetPlayerState,
  next: NetPlayerState | undefined,
  alpha: number,
  extrapolationMs: number,
): NetPlayerState {
  if (!next) {
    const seconds = extrapolationMs / 1000;
    return {
      ...previous,
      x: previous.x + previous.vx * seconds,
      y: previous.y + previous.vy * seconds,
    };
  }
  return {
    ...next,
    x: lerp(previous.x, next.x, alpha),
    y: lerp(previous.y, next.y, alpha),
    vx: lerp(previous.vx, next.vx, alpha),
    vy: lerp(previous.vy, next.vy, alpha),
  };
}

type PositionedTuple = [number, number, number, ...number[]];

export function interpolatePositionTuples<T extends PositionedTuple>(
  previous: T[],
  next: T[] | undefined,
  alpha: number,
): T[] {
  if (!next) return previous;
  const nextById = new Map(next.map((entry) => [entry[0], entry]));
  const result: T[] = [];
  for (const entry of previous) {
    const target = nextById.get(entry[0]);
    if (!target) {
      if (alpha < 1) result.push(entry);
      continue;
    }
    result.push([
      entry[0],
      lerp(entry[1], target[1], alpha),
      lerp(entry[2], target[2], alpha),
      ...target.slice(3),
    ] as T);
  }
  if (alpha >= 1) {
    const previousIds = new Set(previous.map((entry) => entry[0]));
    for (const entry of next) if (!previousIds.has(entry[0])) result.push(entry);
  }
  return result;
}

export function interpolateIndexedPositions(
  previous: Array<[number, number]>,
  next: Array<[number, number]> | undefined,
  alpha: number,
): Array<[number, number]> {
  if (!next) return previous;
  return previous.map(([x, y], index) => {
    const target = next[index];
    return target ? [lerp(x, target[0], alpha), lerp(y, target[1], alpha)] : [x, y];
  });
}

export function interpolateProjectiles(
  previous: NetProjectile[],
  next: NetProjectile[] | undefined,
  alpha: number,
): NetProjectile[] {
  return interpolatePositionTuples(previous, next, alpha);
}
