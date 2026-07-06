import { describe, expect, it } from "vitest";
import {
  getSourceBodyDimension,
  PUZZLE_CRATE_COLLISION_SIZE,
  PUZZLE_CRATE_DISPLAY_SIZE,
} from "./PuzzleGeometry";

describe("puzzle geometry", () => {
  it("keeps an illustrated scaled crate at the original 70px collision size", () => {
    const sourceWidth = 170;
    const sourceHeight = 180;
    const sourceBodyWidth = getSourceBodyDimension(
      sourceWidth,
      PUZZLE_CRATE_DISPLAY_SIZE,
      PUZZLE_CRATE_COLLISION_SIZE,
    );
    const sourceBodyHeight = getSourceBodyDimension(
      sourceHeight,
      PUZZLE_CRATE_DISPLAY_SIZE,
      PUZZLE_CRATE_COLLISION_SIZE,
    );
    const displayScaleX = PUZZLE_CRATE_DISPLAY_SIZE / sourceWidth;
    const displayScaleY = PUZZLE_CRATE_DISPLAY_SIZE / sourceHeight;

    expect(sourceBodyWidth * displayScaleX).toBeCloseTo(PUZZLE_CRATE_COLLISION_SIZE);
    expect(sourceBodyHeight * displayScaleY).toBeCloseTo(PUZZLE_CRATE_COLLISION_SIZE);
  });

  it("rejects invalid dimensions instead of silently creating a broken body", () => {
    expect(() => getSourceBodyDimension(170, 0, 70)).toThrow(RangeError);
  });
});
