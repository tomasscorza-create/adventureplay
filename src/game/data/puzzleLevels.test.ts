import { describe, expect, it } from "vitest";
import { PLAYER_DEFAULTS } from "../../shared/constants/game";
import { itemDefinitions } from "./items";
import {
  puzzleLevelDefinitions,
  puzzleLevelOrder,
} from "./puzzleLevels";

describe("puzzle level campaign", () => {
  const levels = puzzleLevelOrder.map((levelId) => puzzleLevelDefinitions[levelId]);

  it("chains six chambers and increases difficulty by 20 to 25 percent", () => {
    expect(levels).toHaveLength(6);
    levels.forEach((level, index) => {
      expect(level.stageNumber).toBe(index + 1);
      expect(level.nextLevelId).toBe(levels[index + 1]?.id);
      if (index === 0) return;
      const increase = level.difficultyRating / levels[index - 1].difficultyRating - 1;
      expect(increase).toBeGreaterThanOrEqual(0.2);
      expect(increase).toBeLessThanOrEqual(0.25);
    });
  });

  it("moves the six chamber art from night into daylight, armory and treasure", () => {
    expect(levels.map((level) => level.visualTheme.backgroundTextureKey)).toEqual([
      "ancient-trials-chamber-1",
      "ancient-trials-chamber-2",
      "ancient-trials-chamber-3",
      "ancient-trials-chamber-4",
      "ancient-trials-chamber-5",
      "ancient-trials-chamber-6",
    ]);
    levels.slice(1).forEach((level, index) => {
      expect(level.visualTheme.shadeAlpha).toBeLessThan(levels[index].visualTheme.shadeAlpha);
    });
  });

  it("keeps rewards valid and raises obstacle pressure every chamber", () => {
    levels.forEach((level, index) => {
      expect(level.supportsCooperative).toBe(true);
      expect(itemDefinitions[level.inventoryReward.itemId]?.inventoryCategory).toBeDefined();
      
      if (index < 2) {
        expect(level.requiredActivations).toEqual(["crate-plate", "upper-lever"]);
      } else {
        expect(level.requiredActivations.length).toBeGreaterThanOrEqual(3);
      }
      
      if (index === 0) return;
      
      if (index < 4) {
        expect(level.seals.length).toBeGreaterThan(levels[index - 1].seals.length);
        expect(level.hazards.length).toBeGreaterThan(levels[index - 1].hazards.length);
      }
      
      expect(level.worldWidth).toBeGreaterThan(levels[index - 1].worldWidth);
      expect(level.experienceReward).toBeGreaterThan(levels[index - 1].experienceReward);
    });
  });

  it("requires the crate for the lever and the lever for an unjumpable door (first 2 levels)", () => {
    const maximumJumpHeight = (PLAYER_DEFAULTS.jumpPower ** 2) / (2 * 900);
    const crateHeight = 70;

    levels.forEach((level, index) => {
      // Este test geométrico de un solo salto con una sola caja solo aplica a los niveles 1 y 2.
      // Los niveles 3 en adelante agregan múltiples plataformas para puzles de disparo, apilamiento, etc.
      if (index >= 2) return;

      const leverPlatform = level.platforms.find((platform) => (
        level.lever!.x >= platform.x
        && level.lever!.x <= platform.x + platform.width
        && platform.y < 640
      ));
      expect(leverPlatform).toBeDefined();
      const elevatedPlatformsBeforeGate = level.platforms.filter((platform) => (
        platform.y < 640 && platform.x < level.gate!.x
      ));
      expect(elevatedPlatformsBeforeGate).toEqual([leverPlatform]);
      const ledgeHeight = 640 - (leverPlatform?.y ?? 640);
      expect(ledgeHeight).toBeGreaterThan(maximumJumpHeight + 30);
      expect(ledgeHeight).toBeLessThan(maximumJumpHeight + crateHeight);
      expect(level.boxJumpZone!.x).toBeLessThan(level.gate!.x);
      expect(level.boxJumpZone!.x).toBeLessThan(leverPlatform?.x ?? 0);
      expect((leverPlatform?.x ?? 0) - level.boxJumpZone!.x).toBeLessThanOrEqual(60);
      expect(level.plate!.x).toBeGreaterThan(level.gate!.x + level.gate!.width);
      expect(level.gate!.y).toBe(0);
      expect(level.gate!.y + level.gate!.height).toBeGreaterThanOrEqual(640);
    });
  });

  it("keeps the sixth chamber ranged lever reachable from a crate jump", () => {
    const level = puzzleLevelDefinitions.trialChamber6;
    const channelWall = level.platforms.find((platform) => (
      platform.x === 2900 && platform.width === 40
    ));
    const channelCeiling = level.platforms.find((platform) => (
      platform.x === 2900 && platform.width === 160
    ));
    const rangedLever = level.levers.find((lever) => lever.id === "lever-dist");

    expect(channelWall).toBeDefined();
    expect(channelCeiling).toBeDefined();
    expect(rangedLever).toBeDefined();

    const projectileHalfHeight = 10;
    const crateHeight = 70;
    // Player.body termina 36 px debajo de player.y y el disparo nace en player.y - 12.
    const projectileOffsetAboveFeet = 48;
    const maximumJumpHeight = (PLAYER_DEFAULTS.jumpPower ** 2) / (2 * 900);
    const projectileCenterAtCrateRest = 640 - crateHeight - projectileOffsetAboveFeet;
    const projectileCenterAtJumpApex = projectileCenterAtCrateRest - maximumJumpHeight;
    const channelTop = (channelCeiling?.y ?? 0) + (channelCeiling?.height ?? 0);
    const channelBottom = channelWall?.y ?? 0;
    const minimumSafeShotY = channelTop + projectileHalfHeight;
    const maximumSafeShotY = channelBottom - projectileHalfHeight;

    expect(maximumSafeShotY).toBeGreaterThanOrEqual(projectileCenterAtJumpApex);
    expect(minimumSafeShotY).toBeLessThanOrEqual(projectileCenterAtCrateRest);
    expect(rangedLever?.y).toBe(channelBottom);
    expect(channelBottom - channelTop).toBeGreaterThanOrEqual(projectileHalfHeight * 2);
  });

  it("gives every sixth chamber lever a door and keeps a crate on each side of the ranged barrier", () => {
    const level = puzzleLevelDefinitions.trialChamber6;
    const firstLeverGate = level.gates.find((gate) => gate.id === "gate-lever-1");
    const rangedLeverGate = level.gates.find((gate) => gate.id === "gate-dist");
    const finalGate = level.gates.find((gate) => gate.id === "gate-3");
    const rangedBarrierX = 2900;

    expect(firstLeverGate?.requiredActivations).toEqual(["lever-1"]);
    expect(rangedLeverGate?.requiredActivations).toEqual(["lever-dist"]);
    expect(finalGate?.requiredActivations).toEqual(["plate-3"]);
    expect(level.crates.some((crate) => (
      crate.x > (firstLeverGate?.x ?? 0) && crate.x < rangedBarrierX
    ))).toBe(true);
    expect(level.crates.some((crate) => (
      crate.x > rangedBarrierX && crate.x < level.plates.find((plate) => plate.id === "plate-3")!.x
    ))).toBe(true);
  });
});
