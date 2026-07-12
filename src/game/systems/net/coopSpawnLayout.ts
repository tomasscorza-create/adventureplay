export const COOP_SPAWN_SPACING_PX = 70;

export function getCoopSpawnX(
  startX: number,
  slot: number,
  playerCount: number,
  minX: number,
  maxX: number,
  spacingPx = COOP_SPAWN_SPACING_PX,
): number {
  const safeCount = Math.max(1, Math.floor(playerCount));
  const safeSlot = Math.min(safeCount - 1, Math.max(0, Math.floor(slot)));
  const formationWidth = (safeCount - 1) * spacingPx;
  const left = Math.min(
    Math.max(startX - formationWidth / 2, minX),
    Math.max(minX, maxX - formationWidth),
  );
  return left + safeSlot * spacingPx;
}
