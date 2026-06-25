import { PLAYER_DEFAULTS } from "../../../shared/constants/game";
import type { SaveData } from "../../../shared/types/game";
import { experienceByLevel } from "../../data/progression";

const STORAGE_KEY = "superjuego:save:v1";

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

export class LocalSaveAdapter {
  load(): SaveData {
    const rawSave = window.localStorage.getItem(STORAGE_KEY);
    if (!rawSave) {
      return structuredClone(defaultSave);
    }

    try {
      const parsed = JSON.parse(rawSave) as SaveData;
      return {
        ...structuredClone(defaultSave),
        ...parsed,
        player: {
          ...structuredClone(defaultSave.player),
          ...parsed.player,
        },
      };
    } catch {
      return structuredClone(defaultSave);
    }
  }

  save(data: SaveData): void {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  reset(): SaveData {
    const freshSave = structuredClone(defaultSave);
    this.save(freshSave);
    return freshSave;
  }
}
