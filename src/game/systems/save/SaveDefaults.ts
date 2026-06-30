import { PLAYER_DEFAULTS } from "../../../shared/constants/game";
import type {
  CharacterId,
  CharacterPowerCharges,
  DailyStreakProgress,
  PlayerStats,
  ProfileIconId,
  PowerChargeState,
  SaveData,
} from "../../../shared/types/game";
import {
  getExperienceToNextLevel,
  levelRewardDefinitions,
  MAX_PLAYER_LEVEL,
} from "../../data/progression";
import { achievementIds } from "../../data/achievements";

export const SAVE_SCHEMA_VERSION = 15;

const characterIds: CharacterId[] = ["ruder", "amy", "dunel", "sarix"];
const profileIconIds: ProfileIconId[] = ["icon-1", "icon-2", "icon-3", "icon-4", "icon-5", "icon-6", "icon-7", "icon-8", "icon-9"];
const levelSequences = [
  [
    "meadowOutpost",
    "meadowOutpost2",
    "meadowOutpost3",
    "meadowOutpost4",
    "meadowOutpost5",
    "meadowOutpost6",
    "meadowOutpost7",
    "meadowOutpost8",
    "meadowOutpost9",
    "meadowOutpost10",
  ],
  [
    "enchantedGrove1",
    "enchantedGrove2",
    "enchantedGrove3",
    "enchantedGrove4",
    "enchantedGrove5",
    "enchantedGrove6",
    "enchantedGrove7",
    "enchantedGrove8",
    "enchantedGrove9",
    "enchantedGrove10",
  ],
];
const defaultPowerCharges: PowerChargeState = {
  healingCharges: 3,
  powerCharges: 5,
};

function createDefaultCharacterPowerCharges(): CharacterPowerCharges {
  return Object.fromEntries(
    characterIds.map((characterId) => [characterId, { ...defaultPowerCharges }]),
  ) as CharacterPowerCharges;
}

export const defaultSave: SaveData = {
  player: {
    displayName: "",
    profileIconId: "icon-1",
    health: PLAYER_DEFAULTS.maxHealth,
    maxHealth: PLAYER_DEFAULTS.maxHealth,
    level: 1,
    experience: 0,
    experienceToNextLevel: getExperienceToNextLevel(1),
    coins: 0,
    speed: PLAYER_DEFAULTS.speed,
    jumpPower: PLAYER_DEFAULTS.jumpPower,
    meleeDamage: PLAYER_DEFAULTS.meleeDamage,
    rangedDamage: PLAYER_DEFAULTS.rangedDamage,
    unlockedSkills: [],
    inventory: [],
  },
  statistics: {
    runsPlayed: 0,
    completedRuns: 0,
    defeats: 0,
    gameplaySeconds: 0,
    actions: 0,
  },
  selectedCharacterId: "ruder",
  primaryCharacterId: undefined,
  unlockedCharacterIds: [],
  characterPowerCharges: createDefaultCharacterPowerCharges(),
  unlockedLevels: ["meadowOutpost", "enchantedGrove1"],
  completedLevels: [],
  claimedLevelRewards: [1],
  claimedRewardBoxes: [],
  achievements: {
    unlockedIds: [],
    monstersDefeated: 0,
    flawlessLevelIds: [],
    defeatedEnemyIds: [],
    mostEnemiesDefeatedInLevel: 0,
    goldCollected: 0,
    activatedCheckpointIds: [],
    levelAdvanceStreak: { count: 0 },
    treasureStreak: { count: 0 },
  },
};

export function createDefaultSave(): SaveData {
  return structuredClone(defaultSave);
}

export function normalizeSaveData(data: Partial<SaveData> | null | undefined): SaveData {
  if (!data) {
    return createDefaultSave();
  }

  const defaults = createDefaultSave();
  const selectedCharacterId = characterIds.includes(data.selectedCharacterId as CharacterId)
    ? data.selectedCharacterId as CharacterId
    : defaults.selectedCharacterId;
  const isLegacyCharacterSave = data.unlockedCharacterIds === undefined;
  const unlockedCharacterIds = isLegacyCharacterSave
    ? [...characterIds]
    : characterIds.filter((characterId) => data.unlockedCharacterIds?.includes(characterId));
  const primaryCharacterId = characterIds.includes(data.primaryCharacterId as CharacterId)
    ? data.primaryCharacterId as CharacterId
    : isLegacyCharacterSave
      ? selectedCharacterId
      : undefined;
  if (primaryCharacterId && !unlockedCharacterIds.includes(primaryCharacterId)) {
    unlockedCharacterIds.push(primaryCharacterId);
  }
  const legacyPlayer = data.player as (Partial<PlayerStats> & Partial<PowerChargeState>) | undefined;
  const player = {
    ...defaults.player,
    ...legacyPlayer,
  } as PlayerStats & Partial<PowerChargeState>;
  player.displayName = normalizePlayerDisplayName(legacyPlayer?.displayName);
  player.profileIconId = profileIconIds.includes(legacyPlayer?.profileIconId as ProfileIconId)
    ? legacyPlayer?.profileIconId as ProfileIconId
    : defaults.player.profileIconId;
  delete player.healingCharges;
  delete player.powerCharges;

  const incomingCharges = data.characterPowerCharges as
    | Partial<Record<CharacterId, Partial<PowerChargeState>>>
    | undefined;
  const characterPowerCharges = createDefaultCharacterPowerCharges();

  for (const characterId of characterIds) {
    const incoming = incomingCharges?.[characterId];
    if (!incoming) {
      continue;
    }

    characterPowerCharges[characterId] = {
      healingCharges: normalizeCharge(incoming.healingCharges, defaultPowerCharges.healingCharges),
      powerCharges: normalizeCharge(incoming.powerCharges, defaultPowerCharges.powerCharges),
    };
  }

  if (!incomingCharges?.[selectedCharacterId] && legacyPlayer) {
    characterPowerCharges[selectedCharacterId] = {
      healingCharges: normalizeCharge(
        legacyPlayer.healingCharges,
        defaultPowerCharges.healingCharges,
      ),
      powerCharges: normalizeCharge(legacyPlayer.powerCharges, defaultPowerCharges.powerCharges),
    };
  }

  const completedLevels = Array.isArray(data.completedLevels)
    ? [...data.completedLevels]
    : [...defaults.completedLevels];
  const unlockedLevels = new Set(
    Array.isArray(data.unlockedLevels) ? data.unlockedLevels : defaults.unlockedLevels,
  );
  for (const levelSequence of levelSequences) {
    unlockedLevels.add(levelSequence[0]);
    for (let index = 0; index < levelSequence.length - 1; index += 1) {
      if (completedLevels.includes(levelSequence[index])) {
        unlockedLevels.add(levelSequence[index + 1]);
      }
    }
  }

  player.level = Math.min(
    MAX_PLAYER_LEVEL,
    Math.max(1, Math.floor(Number.isFinite(player.level) ? player.level : 1)),
  );
  player.experienceToNextLevel = getExperienceToNextLevel(player.level);
  player.experience = player.level >= MAX_PLAYER_LEVEL
    ? 0
    : Math.min(
        Math.max(0, Math.floor(Number.isFinite(player.experience) ? player.experience : 0)),
        player.experienceToNextLevel - 1,
      );
  const validRewardLevels = new Set(levelRewardDefinitions.map((reward) => reward.level));
  const claimedLevelRewards = Array.isArray(data.claimedLevelRewards)
    ? [...new Set(data.claimedLevelRewards.filter((level) => validRewardLevels.has(level)))]
    : levelRewardDefinitions
        .filter((reward) => reward.level <= player.level)
        .map((reward) => reward.level);
  const claimedRewardDefinitions = levelRewardDefinitions.filter((reward) =>
    claimedLevelRewards.includes(reward.level),
  );
  player.maxHealth = PLAYER_DEFAULTS.maxHealth + claimedRewardDefinitions.reduce(
    (total, reward) => total + (reward.maxHealth ?? 0),
    0,
  );
  player.speed = PLAYER_DEFAULTS.speed + claimedRewardDefinitions.reduce(
    (total, reward) => total + (reward.speed ?? 0),
    0,
  );
  player.meleeDamage = PLAYER_DEFAULTS.meleeDamage + claimedRewardDefinitions.reduce(
    (total, reward) => total + (reward.meleeDamage ?? 0),
    0,
  );
  player.rangedDamage = PLAYER_DEFAULTS.rangedDamage + claimedRewardDefinitions.reduce(
    (total, reward) => total + (reward.rangedDamage ?? 0),
    0,
  );
  player.health = Math.min(Math.max(0, player.health), player.maxHealth);
  const claimedRewardBoxes = Array.isArray(data.claimedRewardBoxes)
    ? [...new Set(data.claimedRewardBoxes)]
    : [...defaults.claimedRewardBoxes];
  const checkpointId = typeof data.checkpointId === "string" ? data.checkpointId : undefined;
  const incomingAchievements = data.achievements;
  const unlockedAchievementIds = achievementIds.filter((achievementId) =>
    incomingAchievements?.unlockedIds?.includes(achievementId),
  );
  const monstersDefeated = Number.isFinite(incomingAchievements?.monstersDefeated)
    ? Math.max(0, Math.floor(incomingAchievements?.monstersDefeated ?? 0))
    : 0;
  const flawlessLevelIds = normalizeStringArray(incomingAchievements?.flawlessLevelIds);
  const defeatedEnemyIds = normalizeStringArray(incomingAchievements?.defeatedEnemyIds);
  const mostEnemiesDefeatedInLevel = normalizeNonNegativeInteger(
    incomingAchievements?.mostEnemiesDefeatedInLevel,
  );
  const goldCollected = normalizeNonNegativeInteger(incomingAchievements?.goldCollected);
  const activatedCheckpointIds = normalizeStringArray(incomingAchievements?.activatedCheckpointIds);
  const levelAdvanceStreak = normalizeDailyStreak(incomingAchievements?.levelAdvanceStreak);
  const treasureStreak = normalizeDailyStreak(incomingAchievements?.treasureStreak);
  const statistics = {
    runsPlayed: normalizeNonNegativeInteger(data.statistics?.runsPlayed),
    completedRuns: normalizeNonNegativeInteger(data.statistics?.completedRuns),
    defeats: normalizeNonNegativeInteger(data.statistics?.defeats),
    gameplaySeconds: normalizeNonNegativeInteger(data.statistics?.gameplaySeconds),
    actions: normalizeNonNegativeInteger(data.statistics?.actions),
  };
  if (completedLevels.includes("meadowOutpost") && !unlockedAchievementIds.includes("first-level")) {
    unlockedAchievementIds.push("first-level");
  }
  if (monstersDefeated >= 10 && !unlockedAchievementIds.includes("monster-hunter")) {
    unlockedAchievementIds.push("monster-hunter");
  }
  if (monstersDefeated >= 1 && !unlockedAchievementIds.includes("first-monster")) {
    unlockedAchievementIds.push("first-monster");
  }
  if (goldCollected > 0 && !unlockedAchievementIds.includes("first-gold")) {
    unlockedAchievementIds.push("first-gold");
  }
  if (checkpointId && !unlockedAchievementIds.includes("first-checkpoint")) {
    unlockedAchievementIds.push("first-checkpoint");
  }
  if (claimedRewardBoxes.length > 0 && !unlockedAchievementIds.includes("first-treasure")) {
    unlockedAchievementIds.push("first-treasure");
  }
  if (completedLevels.length >= 3 && !unlockedAchievementIds.includes("three-levels")) {
    unlockedAchievementIds.push("three-levels");
  }

  return {
    player,
    statistics,
    selectedCharacterId,
    primaryCharacterId,
    unlockedCharacterIds,
    characterPowerCharges,
    unlockedLevels: [...unlockedLevels],
    completedLevels,
    claimedLevelRewards,
    claimedRewardBoxes,
    achievements: {
      unlockedIds: unlockedAchievementIds,
      monstersDefeated,
      flawlessLevelIds,
      defeatedEnemyIds,
      mostEnemiesDefeatedInLevel,
      goldCollected,
      activatedCheckpointIds,
      levelAdvanceStreak,
      treasureStreak,
    },
    checkpointId,
  };
}

function normalizeCharge(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : fallback;
}

export function normalizePlayerDisplayName(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 2 ? normalized.slice(0, 20) : "";
}

function normalizeNonNegativeInteger(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : 0;
}

function normalizeStringArray(value: string[] | undefined): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is string => typeof entry === "string"))]
    : [];
}

function normalizeDailyStreak(value: DailyStreakProgress | undefined): DailyStreakProgress {
  const lastDay = typeof value?.lastDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.lastDay)
    ? value.lastDay
    : undefined;
  return {
    count: lastDay ? normalizeNonNegativeInteger(value?.count) : 0,
    lastDay,
  };
}
