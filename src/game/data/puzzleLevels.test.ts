import { describe, expect, it } from "vitest";
import { PLAYER_DEFAULTS } from "../../shared/constants/game";
import { itemDefinitions } from "./items";
import {
  puzzleLevelDefinitions,
  puzzleLevelOrder,
} from "./puzzleLevels";

describe("puzzle level campaign", () => {
  const levels = puzzleLevelOrder.map((levelId) => puzzleLevelDefinitions[levelId]);

  it("chains four chambers and increases difficulty by 20 to 25 percent", () => {
    expect(levels).toHaveLength(4);
    levels.forEach((level, index) => {
      expect(level.stageNumber).toBe(index + 1);
      expect(level.nextLevelId).toBe(levels[index + 1]?.id);
      if (index === 0) return;
      const increase = level.difficultyRating / levels[index - 1].difficultyRating - 1;
      expect(increase).toBeGreaterThanOrEqual(0.2);
      expect(increase).toBeLessThanOrEqual(0.25);
    });
  });

  it("keeps rewards valid and raises obstacle pressure every chamber", () => {
    levels.forEach((level, index) => {
      expect(level.supportsCooperative).toBe(true);
      expect(itemDefinitions[level.inventoryReward.itemId]?.inventoryCategory).toBeDefined();
      expect(level.requiredActivations).toEqual(["crate-plate", "upper-lever"]);
      if (index === 0) return;
      expect(level.seals.length).toBeGreaterThan(levels[index - 1].seals.length);
      expect(level.hazards.length).toBeGreaterThan(levels[index - 1].hazards.length);
      expect(level.worldWidth).toBeGreaterThan(levels[index - 1].worldWidth);
      expect(level.experienceReward).toBeGreaterThan(levels[index - 1].experienceReward);
    });
  });

  it("requires the crate for the lever and the lever for an unjumpable door", () => {
    const maximumJumpHeight = (PLAYER_DEFAULTS.jumpPower ** 2) / (2 * 900);
    const crateHeight = 70;

    levels.forEach((level) => {
      const leverPlatform = level.platforms.find((platform) => (
        level.lever.x >= platform.x
        && level.lever.x <= platform.x + platform.width
        && platform.y < 640
      ));
      expect(leverPlatform).toBeDefined();
      const elevatedPlatformsBeforeGate = level.platforms.filter((platform) => (
        platform.y < 640 && platform.x < level.gate.x
      ));
      expect(elevatedPlatformsBeforeGate).toEqual([leverPlatform]);
      const ledgeHeight = 640 - (leverPlatform?.y ?? 640);
      expect(ledgeHeight).toBeGreaterThan(maximumJumpHeight + 30);
      expect(ledgeHeight).toBeLessThan(maximumJumpHeight + crateHeight);
      expect(level.boxJumpZone.x).toBeLessThan(level.gate.x);
      expect(level.boxJumpZone.x).toBeLessThan(leverPlatform?.x ?? 0);
      expect((leverPlatform?.x ?? 0) - level.boxJumpZone.x).toBeLessThanOrEqual(60);
      expect(level.plate.x).toBeGreaterThan(level.gate.x + level.gate.width);
      expect(level.gate.y).toBe(0);
      expect(level.gate.y + level.gate.height).toBeGreaterThanOrEqual(640);
    });
  });
});
