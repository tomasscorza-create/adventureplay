export const COOP_RECONCILIATION_START_PX = 32;
export const COOP_RECONCILIATION_SNAP_PX = 160;
export const COOP_AUTHORITATIVE_TELEPORT_PX = 96;
export const COOP_RECONCILIATION_RATE_PER_SECOND = 8;
export const COOP_DEGRADED_EXIT_PX = 180;
const MAX_RECONCILIATION_DELTA_MS = 50;

export interface CoopPosition {
  x: number;
  y: number;
}

export interface CoopPositionCorrection extends CoopPosition {
  kind: "none" | "soft" | "snap";
  divergencePx: number;
  appliedPx: number;
}

export function positionDistance(from: CoopPosition, to: CoopPosition): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function isAuthoritativeTeleport(
  previous: CoopPosition | undefined,
  current: CoopPosition,
): boolean {
  return previous !== undefined
    && positionDistance(previous, current) >= COOP_AUTHORITATIVE_TELEPORT_PX;
}

export function shouldUseDegradedMode(
  nearestDynamicDistancePx: number,
  currentlyDegraded: boolean,
  enterDistancePx: number,
  exitDistancePx = COOP_DEGRADED_EXIT_PX,
): boolean {
  const threshold = currentlyDegraded ? exitDistancePx : enterDistancePx;
  return nearestDynamicDistancePx < threshold;
}

// Correccion exclusivamente posicional: no recibe ni devuelve velocidades y
// por lo tanto no puede restaurar vy, repetir MovementSystem ni reejecutar
// flancos. El delta se limita para que reanudar una pestaña no parezca un snap.
export function computeGuestPositionCorrection(
  local: CoopPosition,
  authoritative: CoopPosition,
  deltaMs: number,
  forceSnap = false,
  snapAtExtremeDistance = true,
  correctionStartPx = COOP_RECONCILIATION_START_PX,
): CoopPositionCorrection {
  const divergencePx = positionDistance(local, authoritative);
  if (forceSnap || (snapAtExtremeDistance && divergencePx >= COOP_RECONCILIATION_SNAP_PX)) {
    return {
      x: authoritative.x,
      y: authoritative.y,
      kind: "snap",
      divergencePx,
      appliedPx: divergencePx,
    };
  }
  if (divergencePx <= correctionStartPx) {
    return { ...local, kind: "none", divergencePx, appliedPx: 0 };
  }

  const finiteDeltaMs = Number.isFinite(deltaMs) ? deltaMs : 0;
  const safeDeltaMs = Math.min(MAX_RECONCILIATION_DELTA_MS, Math.max(0, finiteDeltaMs));
  const alpha = 1 - Math.exp(-COOP_RECONCILIATION_RATE_PER_SECOND * safeDeltaMs / 1000);
  const x = local.x + (authoritative.x - local.x) * alpha;
  const y = local.y + (authoritative.y - local.y) * alpha;
  return {
    x,
    y,
    kind: "soft",
    divergencePx,
    appliedPx: positionDistance(local, { x, y }),
  };
}
