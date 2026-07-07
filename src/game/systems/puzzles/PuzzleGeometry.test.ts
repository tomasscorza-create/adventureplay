import { describe, expect, it } from "vitest";
import {
  getSourceBodyDimension,
  PUZZLE_CRATE_COLLISION_SIZE,
  PUZZLE_CRATE_DISPLAY_SIZE,
  shouldCrateStaySolid,
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

describe("crate solidity while landing", () => {
  // Geometria de referencia (mundo, y crece hacia abajo). Caja 70px.
  // Caja del piso: top 570. Caja de arriba de una pila: top 500.
  const groundCrate = { left: 545, right: 615, top: 570 };
  const stackedTopCrate = { left: 545, right: 615, top: 500 };

  it("keeps a crate solid while the player rests on top of it", () => {
    // Jugador parado sobre la caja del piso: pies en 570, centro en 548.
    const player = { left: 566, right: 594, centerY: 548, velocityY: 0 };
    expect(shouldCrateStaySolid(player, groundCrate)).toBe(true);
  });

  it("keeps the upper crate of a stack solid so the player does not fall through", () => {
    // Jugador aterrizando sobre la caja de arriba: pies en 500, centro en 478.
    const player = { left: 566, right: 594, centerY: 478, velocityY: 0 };
    expect(shouldCrateStaySolid(player, stackedTopCrate)).toBe(true);
  });

  it("makes the crate solid during the fall, before contact, to avoid a one-frame sink", () => {
    // Cayendo (velocityY positiva) con los pies aun por encima del techo.
    const player = { left: 566, right: 594, centerY: 528, velocityY: 300 };
    expect(shouldCrateStaySolid(player, groundCrate)).toBe(true);
  });

  it("keeps a crate pushable when the player is beside it on the ground", () => {
    // Empujando desde el suelo: el centro del jugador queda por debajo del techo.
    const player = { left: 512, right: 546, centerY: 618, velocityY: 0 };
    expect(shouldCrateStaySolid(player, groundCrate)).toBe(false);
  });

  it("keeps a crate pushable while the player is jumping upward past it", () => {
    // Subiendo (velocityY muy negativa): no debe volverse solida al pasar al lado.
    const player = { left: 566, right: 594, centerY: 478, velocityY: -400 };
    expect(shouldCrateStaySolid(player, stackedTopCrate)).toBe(false);
  });
});
