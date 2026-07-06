export const PUZZLE_CRATE_COLLISION_SIZE = 70;
export const PUZZLE_CRATE_DISPLAY_SIZE = 96;

export function getSourceBodyDimension(
  sourceDimension: number,
  displayDimension: number,
  desiredWorldDimension: number,
): number {
  if (sourceDimension <= 0 || displayDimension <= 0 || desiredWorldDimension <= 0) {
    throw new RangeError("Puzzle body dimensions must be positive");
  }
  return sourceDimension * (desiredWorldDimension / displayDimension);
}
