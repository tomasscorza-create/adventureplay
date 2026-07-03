import { describe, expect, it } from "vitest";
import { PLAYER_DEFAULTS } from "../../../shared/constants/game";
import { createDefaultSave, normalizeSaveData } from "./SaveDefaults";

describe("normalizeSaveData", () => {
  it("repairs malformed runtime values from remote JSON", () => {
    const defaults = createDefaultSave();
    const normalized = normalizeSaveData({
      ...defaults,
      player: {
        ...defaults.player,
        health: "invalid",
        coins: "invalid",
        inventory: null,
      },
      unlockedLevels: ["meadowOutpost", null, 42],
    });

    expect(normalized.player.health).toBe(PLAYER_DEFAULTS.maxHealth);
    expect(normalized.player.coins).toBe(0);
    expect(normalized.player.inventory).toEqual([]);
    expect(normalized.unlockedLevels).toEqual([
      "meadowOutpost",
      "enchantedGrove1",
      "activeVolcano1",
    ]);
  });

  it("clamps extreme counters and reconstructs progression-owned attributes", () => {
    const normalized = normalizeSaveData({
      player: {
        level: 999,
        experience: Number.MAX_VALUE,
        health: Number.POSITIVE_INFINITY,
        maxHealth: 999,
        coins: -500,
        speed: 999,
        jumpPower: -1,
        meleeDamage: 999,
        rangedDamage: 999,
        unlockedSkills: ["unknown-skill"],
        inventory: Array.from({ length: 10_005 }, () => "forestGatePlan"),
      },
      unlockedCharacterIds: [],
      claimedLevelRewards: [999, -1],
      characterPowerCharges: {
        amy: {
          healingCharges: -8,
          powerCharges: Number.POSITIVE_INFINITY,
        },
        ruder: {
          healingCharges: Number.MAX_VALUE,
          powerCharges: -1,
        },
      },
      statistics: {
        runsPlayed: 3.9,
        completedRuns: 99,
        defeats: -4,
        gameplaySeconds: Number.POSITIVE_INFINITY,
        actions: Number.NaN,
      },
    });

    expect(normalized.player).toMatchObject({
      level: 80,
      experience: 0,
      experienceToNextLevel: 0,
      health: PLAYER_DEFAULTS.maxHealth,
      maxHealth: 7,
      coins: 0,
      speed: 310,
      jumpPower: PLAYER_DEFAULTS.jumpPower,
      meleeDamage: 3,
      rangedDamage: 2,
      unlockedSkills: ["stronger-strike", "quick-steps"],
    });
    expect(normalized.player.inventory).toHaveLength(10_000);
    expect(normalized.claimedLevelRewards).toEqual(
      Array.from({ length: 15 }, (_entry, index) => index + 1),
    );
    expect(normalized.characterPowerCharges.amy).toEqual({
      healingCharges: 0,
      powerCharges: 5,
    });
    expect(normalized.characterPowerCharges.ruder).toEqual({
      healingCharges: Number.MAX_SAFE_INTEGER,
      powerCharges: 0,
    });
    expect(normalized.statistics).toEqual({
      runsPlayed: 3,
      completedRuns: 3,
      defeats: 0,
      gameplaySeconds: 0,
      actions: 0,
    });
  });

  it("filters unknown IDs, removes unique duplicates and preserves inventory quantities", () => {
    const defaults = createDefaultSave();
    const normalized = normalizeSaveData({
      player: {
        ...defaults.player,
        level: 3,
        inventory: [
          "forestGatePlan",
          "unknown-item",
          "forestGatePlan",
          "bronzeCoin",
        ],
      },
      selectedCharacterId: "amy",
      primaryCharacterId: "amy",
      unlockedCharacterIds: ["amy", "amy", "unknown-character"],
      unlockedLevels: ["meadowOutpost2", "unknown-level", "meadowOutpost2"],
      completedLevels: ["meadowOutpost", "unknown-level", "meadowOutpost"],
      claimedRewardBoxes: ["reward-box-l1", "unknown-box", "reward-box-l1"],
      checkpointId: "meadow-midpoint",
      achievements: {
        unlockedIds: ["first-gold", "unknown-achievement"],
        monstersDefeated: 2.8,
        flawlessLevelIds: ["meadowOutpost", "unknown-level", "meadowOutpost"],
        defeatedEnemyIds: ["m3", "unknown-enemy", "e2m3", "m3"],
        mostEnemiesDefeatedInLevel: 4.9,
        goldCollected: 10.2,
        activatedCheckpointIds: [
          "meadow-midpoint",
          "unknown-checkpoint",
          "meadow-midpoint",
        ],
        levelAdvanceStreak: { count: 9, lastDay: "2026-02-30" },
        treasureStreak: { count: 3.8, lastDay: "2026-07-01" },
      },
    });

    expect(normalized.player.inventory).toEqual(["forestGatePlan", "forestGatePlan"]);
    expect(normalized.player.unlockedSkills).toEqual(["stronger-strike", "quick-steps"]);
    expect(normalized.unlockedCharacterIds).toEqual(["amy"]);
    expect(normalized.unlockedLevels).toEqual([
      "meadowOutpost",
      "enchantedGrove1",
      "activeVolcano1",
      "meadowOutpost2",
    ]);
    expect(normalized.completedLevels).toEqual(["meadowOutpost"]);
    expect(normalized.claimedRewardBoxes).toEqual(["reward-box-l1"]);
    expect(normalized.checkpointId).toBe("meadow-midpoint");
    expect(normalized.achievements.flawlessLevelIds).toEqual(["meadowOutpost"]);
    expect(normalized.achievements.defeatedEnemyIds).toEqual(["m3", "e2m3"]);
    expect(normalized.achievements.activatedCheckpointIds).toEqual(["meadow-midpoint"]);
    expect(normalized.achievements.levelAdvanceStreak).toEqual({ count: 0 });
    expect(normalized.achievements.treasureStreak).toEqual({
      count: 3,
      lastDay: "2026-07-01",
    });
    expect(normalized.achievements.unlockedIds).toContain("first-gold");
  });

  it("preserves the legacy global power migration for the selected character", () => {
    const normalized = normalizeSaveData({
      player: {
        ...createDefaultSave().player,
        healingCharges: 9,
        powerCharges: 14,
      },
      selectedCharacterId: "amy",
      unlockedLevels: [],
      completedLevels: [],
    });

    expect(normalized.primaryCharacterId).toBe("amy");
    expect(normalized.unlockedCharacterIds).toEqual(["ruder", "amy", "dunel", "sarix", "faust"]);
    expect(normalized.characterPowerCharges.amy).toEqual({
      healingCharges: 9,
      powerCharges: 14,
    });
  });

  it("uses new-save defaults for empty or non-object payloads", () => {
    expect(normalizeSaveData({})).toEqual(createDefaultSave());
    expect(normalizeSaveData("corrupt")).toEqual(createDefaultSave());
    expect(normalizeSaveData([])).toEqual(createDefaultSave());
  });

  it("does not throw for invalid nested structures", () => {
    const malformedPayloads = [
      {
        player: [],
        characterPowerCharges: "invalid",
        achievements: 42,
        statistics: false,
        completedLevels: {},
      },
      {
        player: { level: "80", inventory: {} },
        unlockedCharacterIds: 12,
        achievements: { unlockedIds: 4, levelAdvanceStreak: [] },
      },
      { player: null, achievements: { treasureStreak: "invalid" } },
    ];

    for (const payload of malformedPayloads) {
      expect(() => normalizeSaveData(payload)).not.toThrow();
      expect(normalizeSaveData(payload).player.inventory).toEqual([]);
    }
  });

  it("is idempotent after repairing a payload", () => {
    const repaired = normalizeSaveData({
      player: { level: 6.8, coins: 120.9, inventory: ["oldIronKey", false] },
      unlockedCharacterIds: ["ruder", "invalid"],
      completedLevels: ["meadowOutpost", "invalid"],
      statistics: { runsPlayed: 2, completedRuns: 1 },
    });

    expect(normalizeSaveData(repaired)).toEqual(repaired);
  });
});
