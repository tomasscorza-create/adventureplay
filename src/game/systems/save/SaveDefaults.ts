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
  skillDefinitions,
} from "../../data/progression";
import { achievementIds } from "../../data/achievements";
import { enemyDefinitions } from "../../data/enemies";
import { itemDefinitions } from "../../data/items";
import { levelDefinitions } from "../../data/levels";

export const SAVE_SCHEMA_VERSION = 16;

const characterIds: CharacterId[] = ["ruder", "amy", "dunel", "sarix", "faust"];
const profileIconIds: ProfileIconId[] = ["icon-1", "icon-2", "icon-3", "icon-4", "icon-5", "icon-6", "icon-7", "icon-8", "icon-9"];
const characterIdSet = new Set<string>(characterIds);
const profileIconIdSet = new Set<string>(profileIconIds);
const levelIdSet = new Set(Object.keys(levelDefinitions));
const inventoryItemIdSet = new Set(
  Object.values(itemDefinitions)
    .filter((item) => Boolean(item.inventoryCategory))
    .map((item) => item.id),
);
const enemyIdSet = new Set(Object.keys(enemyDefinitions));
const rewardBoxIdSet = new Set(Object.values(levelDefinitions).map((level) => level.rewardBox.id));
const checkpointIdSet = new Set(Object.values(levelDefinitions).map((level) => level.checkpoint.id));
const achievementIdSet = new Set<string>(achievementIds);
const MAX_SAFE_COUNTER = Number.MAX_SAFE_INTEGER;
const MAX_SAVE_COLLECTION_ENTRIES = 10_000;
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

export function normalizeSaveData(data: unknown): SaveData {
  const incomingSave = asRecord(data);
  if (!incomingSave) {
    return createDefaultSave();
  }

  const defaults = createDefaultSave();
  const selectedCharacterId = isKnownString(incomingSave.selectedCharacterId, characterIdSet)
    ? incomingSave.selectedCharacterId as CharacterId
    : defaults.selectedCharacterId;
  const incomingPlayer = asRecord(incomingSave.player);
  const isLegacyCharacterSave = incomingPlayer !== undefined
    && incomingSave.unlockedCharacterIds === undefined;
  const incomingUnlockedCharacters = Array.isArray(incomingSave.unlockedCharacterIds)
    ? incomingSave.unlockedCharacterIds
    : [];
  const unlockedCharacterIds = isLegacyCharacterSave
    ? [...characterIds]
    : characterIds.filter((characterId) => incomingUnlockedCharacters.includes(characterId));
  const primaryCharacterId = isKnownString(incomingSave.primaryCharacterId, characterIdSet)
    ? incomingSave.primaryCharacterId as CharacterId
    : isLegacyCharacterSave
      ? selectedCharacterId
      : undefined;
  if (primaryCharacterId && !unlockedCharacterIds.includes(primaryCharacterId)) {
    unlockedCharacterIds.push(primaryCharacterId);
  }
  const level = normalizeInteger(incomingPlayer?.level, 1, 1, MAX_PLAYER_LEVEL);
  const claimedLevelRewards = levelRewardDefinitions
    .filter((reward) => reward.level <= level)
    .map((reward) => reward.level);
  const claimedRewardDefinitions = levelRewardDefinitions.filter((reward) =>
    claimedLevelRewards.includes(reward.level)
  );
  const maxHealth = PLAYER_DEFAULTS.maxHealth + claimedRewardDefinitions.reduce(
    (total, reward) => total + (reward.maxHealth ?? 0),
    0,
  );
  const speed = PLAYER_DEFAULTS.speed + claimedRewardDefinitions.reduce(
    (total, reward) => total + (reward.speed ?? 0),
    0,
  );
  const meleeDamage = PLAYER_DEFAULTS.meleeDamage + claimedRewardDefinitions.reduce(
    (total, reward) => total + (reward.meleeDamage ?? 0),
    0,
  );
  const rangedDamage = PLAYER_DEFAULTS.rangedDamage + claimedRewardDefinitions.reduce(
    (total, reward) => total + (reward.rangedDamage ?? 0),
    0,
  );
  const experienceToNextLevel = getExperienceToNextLevel(level);
  const player: PlayerStats = {
    displayName: normalizePlayerDisplayName(incomingPlayer?.displayName),
    profileIconId: isKnownString(incomingPlayer?.profileIconId, profileIconIdSet)
      ? incomingPlayer.profileIconId as ProfileIconId
      : defaults.player.profileIconId,
    health: normalizeInteger(incomingPlayer?.health, defaults.player.health, 0, maxHealth),
    maxHealth,
    level,
    experience: level >= MAX_PLAYER_LEVEL
      ? 0
      : normalizeInteger(incomingPlayer?.experience, 0, 0, experienceToNextLevel - 1),
    experienceToNextLevel,
    coins: normalizeInteger(incomingPlayer?.coins, 0, 0, MAX_SAFE_COUNTER),
    speed,
    jumpPower: PLAYER_DEFAULTS.jumpPower,
    meleeDamage,
    rangedDamage,
    unlockedSkills: skillDefinitions
      .filter((skill) => skill.requiredLevel <= level)
      .map((skill) => skill.id),
    inventory: normalizeInventory(incomingPlayer?.inventory),
  };

  const incomingCharges = asRecord(incomingSave.characterPowerCharges);
  const characterPowerCharges = createDefaultCharacterPowerCharges();

  for (const characterId of characterIds) {
    const incoming = asRecord(incomingCharges?.[characterId]);
    if (!incoming) {
      continue;
    }

    characterPowerCharges[characterId] = {
      healingCharges: normalizeCharge(incoming.healingCharges, defaultPowerCharges.healingCharges),
      powerCharges: normalizeCharge(incoming.powerCharges, defaultPowerCharges.powerCharges),
    };
  }

  if (!asRecord(incomingCharges?.[selectedCharacterId]) && incomingPlayer) {
    characterPowerCharges[selectedCharacterId] = {
      healingCharges: normalizeCharge(
        incomingPlayer.healingCharges,
        defaultPowerCharges.healingCharges,
      ),
      powerCharges: normalizeCharge(incomingPlayer.powerCharges, defaultPowerCharges.powerCharges),
    };
  }

  const completedLevels = normalizeKnownUniqueStrings(incomingSave.completedLevels, levelIdSet);
  const unlockedLevels = new Set([
    ...defaults.unlockedLevels,
    ...normalizeKnownUniqueStrings(incomingSave.unlockedLevels, levelIdSet),
    ...completedLevels,
  ]);
  for (const levelSequence of levelSequences) {
    unlockedLevels.add(levelSequence[0]);
    for (let index = 0; index < levelSequence.length - 1; index += 1) {
      if (completedLevels.includes(levelSequence[index])) {
        unlockedLevels.add(levelSequence[index + 1]);
      }
    }
  }

  const claimedRewardBoxes = normalizeKnownUniqueStrings(
    incomingSave.claimedRewardBoxes,
    rewardBoxIdSet,
  );
  const checkpointId = isKnownString(incomingSave.checkpointId, checkpointIdSet)
    ? incomingSave.checkpointId
    : undefined;
  const incomingAchievements = asRecord(incomingSave.achievements);
  const incomingAchievementIds = new Set(
    normalizeKnownUniqueStrings(incomingAchievements?.unlockedIds, achievementIdSet),
  );
  const unlockedAchievementIds = achievementIds.filter((achievementId) =>
    incomingAchievementIds.has(achievementId),
  );
  const monstersDefeated = normalizeInteger(
    incomingAchievements?.monstersDefeated,
    0,
    0,
    MAX_SAFE_COUNTER,
  );
  const flawlessLevelIds = normalizeKnownUniqueStrings(
    incomingAchievements?.flawlessLevelIds,
    levelIdSet,
  );
  const defeatedEnemyIds = normalizeKnownUniqueStrings(
    incomingAchievements?.defeatedEnemyIds,
    enemyIdSet,
  );
  const mostEnemiesDefeatedInLevel = normalizeNonNegativeInteger(
    incomingAchievements?.mostEnemiesDefeatedInLevel,
  );
  const goldCollected = normalizeNonNegativeInteger(incomingAchievements?.goldCollected);
  const activatedCheckpointIds = normalizeKnownUniqueStrings(
    incomingAchievements?.activatedCheckpointIds,
    checkpointIdSet,
  );
  const levelAdvanceStreak = normalizeDailyStreak(
    asRecord(incomingAchievements?.levelAdvanceStreak),
  );
  const treasureStreak = normalizeDailyStreak(asRecord(incomingAchievements?.treasureStreak));
  const incomingStatistics = asRecord(incomingSave.statistics);
  const runsPlayed = normalizeNonNegativeInteger(incomingStatistics?.runsPlayed);
  const statistics = {
    runsPlayed,
    completedRuns: normalizeInteger(incomingStatistics?.completedRuns, 0, 0, runsPlayed),
    defeats: normalizeInteger(incomingStatistics?.defeats, 0, 0, runsPlayed),
    gameplaySeconds: normalizeNonNegativeInteger(incomingStatistics?.gameplaySeconds),
    actions: normalizeNonNegativeInteger(incomingStatistics?.actions),
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

function normalizeCharge(value: unknown, fallback: number): number {
  return normalizeInteger(value, fallback, 0, MAX_SAFE_COUNTER);
}

export function normalizePlayerDisplayName(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 2 ? normalized.slice(0, 20) : "";
}

function normalizeNonNegativeInteger(value: unknown): number {
  return normalizeInteger(value, 0, 0, MAX_SAFE_COUNTER);
}

function normalizeInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function normalizeKnownUniqueStrings(value: unknown, allowedValues: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = new Set<string>();
  for (const entry of value.slice(0, MAX_SAVE_COLLECTION_ENTRIES)) {
    if (isKnownString(entry, allowedValues)) {
      normalized.add(entry);
    }
  }
  return [...normalized];
}

function normalizeInventory(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, MAX_SAVE_COLLECTION_ENTRIES)
    .filter((entry): entry is string => isKnownString(entry, inventoryItemIdSet));
}

function normalizeDailyStreak(value: Record<string, unknown> | undefined): DailyStreakProgress {
  const lastDay = isValidCalendarDay(value?.lastDay)
    ? value.lastDay
    : undefined;
  return {
    count: lastDay ? normalizeNonNegativeInteger(value?.count) : 0,
    lastDay,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function isKnownString(value: unknown, allowedValues: ReadonlySet<string>): value is string {
  return typeof value === "string" && allowedValues.has(value);
}

function isValidCalendarDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
