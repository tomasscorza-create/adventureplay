import { PLAYER_DEFAULTS } from "../../../shared/constants/game";
import type { SaveData } from "../../../shared/types/game";
import { experienceByLevel } from "../../data/progression";

export const SAVE_SCHEMA_VERSION = 1;

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
  unlockedLevels: ["meadowOutpost"],
  completedLevels: [],
};

export function createDefaultSave(): SaveData {
  return structuredClone(defaultSave);
}

export function normalizeSaveData(data: Partial<SaveData> | null | undefined): SaveData {
  if (!data) {
    return createDefaultSave();
  }

  return {
    ...createDefaultSave(),
    ...data,
    player: {
      ...createDefaultSave().player,
      ...data.player,
    },
  };
}
