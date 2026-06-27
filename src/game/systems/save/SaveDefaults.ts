import { PLAYER_DEFAULTS } from "../../../shared/constants/game";
import type {
  CharacterId,
  CharacterPowerCharges,
  PlayerStats,
  PowerChargeState,
  SaveData,
} from "../../../shared/types/game";
import { experienceByLevel } from "../../data/progression";

export const SAVE_SCHEMA_VERSION = 5;

const characterIds: CharacterId[] = ["ruder", "amy", "dunel", "sarix"];
const levelSequence = [
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
];
const defaultPowerCharges: PowerChargeState = {
  healingCharges: 3,
  powerCharges: 25,
};

function createDefaultCharacterPowerCharges(): CharacterPowerCharges {
  return Object.fromEntries(
    characterIds.map((characterId) => [characterId, { ...defaultPowerCharges }]),
  ) as CharacterPowerCharges;
}

export const defaultSave: SaveData = {
  player: {
    health: PLAYER_DEFAULTS.maxHealth,
    maxHealth: PLAYER_DEFAULTS.maxHealth,
    level: 1,
    experience: 0,
    experienceToNextLevel: experienceByLevel[1],
    coins: 0,
    speed: PLAYER_DEFAULTS.speed,
    jumpPower: PLAYER_DEFAULTS.jumpPower,
    meleeDamage: PLAYER_DEFAULTS.meleeDamage,
    rangedDamage: PLAYER_DEFAULTS.rangedDamage,
    unlockedSkills: [],
    inventory: [],
  },
  selectedCharacterId: "ruder",
  primaryCharacterId: undefined,
  unlockedCharacterIds: [],
  characterPowerCharges: createDefaultCharacterPowerCharges(),
  unlockedLevels: ["meadowOutpost"],
  completedLevels: [],
  claimedRewardBoxes: [],
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
  unlockedLevels.add(levelSequence[0]);

  for (let index = 0; index < levelSequence.length - 1; index += 1) {
    if (completedLevels.includes(levelSequence[index])) {
      unlockedLevels.add(levelSequence[index + 1]);
    }
  }

  return {
    ...defaults,
    ...data,
    selectedCharacterId,
    primaryCharacterId,
    unlockedCharacterIds,
    characterPowerCharges,
    player,
    unlockedLevels: [...unlockedLevels],
    completedLevels,
  };
}

function normalizeCharge(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : fallback;
}
