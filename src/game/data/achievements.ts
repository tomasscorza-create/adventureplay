import type { AchievementId, SaveData } from "../../shared/types/game";

export type AchievementCategoryId = "adventure" | "combat" | "discovery";
export type AchievementDifficulty = "easy" | "medium";
export type AchievementIconId =
  | "flag"
  | "shield"
  | "swords"
  | "claw"
  | "coin"
  | "checkpoint"
  | "chest"
  | "map";

export interface AchievementReward {
  gold?: number;
  experience?: number;
  healingCharges?: number;
  powerCharges?: number;
}

export const achievementCategories: Array<{
  id: AchievementCategoryId;
  name: string;
  icon: AchievementIconId;
}> = [
  { id: "adventure", name: "Aventura", icon: "map" },
  { id: "combat", name: "Combate", icon: "swords" },
  { id: "discovery", name: "Descubrimiento", icon: "chest" },
];

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  category: AchievementCategoryId;
  difficulty: AchievementDifficulty;
  icon: AchievementIconId;
  target: number;
  reward: AchievementReward;
  getProgress: (save: SaveData) => number;
}

export const achievementDefinitions: AchievementDefinition[] = [
  {
    id: "first-level",
    title: "Primer paso",
    description: "Completa el nivel 1 de Frontera Verde.",
    category: "adventure",
    difficulty: "easy",
    icon: "flag",
    target: 1,
    reward: { gold: 100 },
    getProgress: (save) => save.achievements.unlockedIds.includes("first-level") ? 1 : 0,
  },
  {
    id: "flawless-level",
    title: "Paso impecable",
    description: "Completa cualquier nivel sin perder salud.",
    category: "adventure",
    difficulty: "easy",
    icon: "shield",
    target: 1,
    reward: { experience: 75 },
    getProgress: (save) => save.achievements.unlockedIds.includes("flawless-level") ? 1 : 0,
  },
  {
    id: "monster-hunter",
    title: "Cazador de monstruos",
    description: "Derrota 10 monstruos en total.",
    category: "combat",
    difficulty: "easy",
    icon: "swords",
    target: 10,
    reward: { gold: 80 },
    getProgress: (save) => Math.min(save.achievements.monstersDefeated, 10),
  },
  {
    id: "first-monster",
    title: "Primer rival",
    description: "Derrota tu primer monstruo.",
    category: "combat",
    difficulty: "easy",
    icon: "claw",
    target: 1,
    reward: { experience: 25 },
    getProgress: (save) => Math.min(save.achievements.monstersDefeated, 1),
  },
  {
    id: "first-gold",
    title: "Bolsillos con brillo",
    description: "Recoge tu primera pieza de ORO.",
    category: "discovery",
    difficulty: "easy",
    icon: "coin",
    target: 1,
    reward: { gold: 50 },
    getProgress: (save) => save.achievements.unlockedIds.includes("first-gold") ? 1 : 0,
  },
  {
    id: "first-checkpoint",
    title: "Camino asegurado",
    description: "Activa tu primer checkpoint.",
    category: "discovery",
    difficulty: "easy",
    icon: "checkpoint",
    target: 1,
    reward: { healingCharges: 1 },
    getProgress: (save) => save.achievements.unlockedIds.includes("first-checkpoint") ? 1 : 0,
  },
  {
    id: "first-treasure",
    title: "Tesoro encontrado",
    description: "Abre tu primera caja de recompensa.",
    category: "discovery",
    difficulty: "easy",
    icon: "chest",
    target: 1,
    reward: { healingCharges: 1, powerCharges: 2 },
    getProgress: (save) => Math.min(save.claimedRewardBoxes.length, 1),
  },
  {
    id: "three-levels",
    title: "Explorador constante",
    description: "Completa 3 niveles de Frontera Verde.",
    category: "adventure",
    difficulty: "easy",
    icon: "map",
    target: 3,
    reward: { experience: 100 },
    getProgress: (save) => Math.min(save.completedLevels.length, 3),
  },
  {
    id: "five-levels",
    title: "Camino recorrido",
    description: "Completa 5 niveles distintos.",
    category: "adventure",
    difficulty: "medium",
    icon: "flag",
    target: 5,
    reward: { gold: 250 },
    getProgress: (save) => Math.min(save.completedLevels.length, 5),
  },
  {
    id: "three-flawless-levels",
    title: "Guardia intacta",
    description: "Completa 3 niveles distintos sin perder salud.",
    category: "adventure",
    difficulty: "medium",
    icon: "shield",
    target: 3,
    reward: { experience: 150 },
    getProgress: (save) => Math.min(save.achievements.flawlessLevelIds.length, 3),
  },
  {
    id: "three-day-advance-streak",
    title: "Paso diario",
    description: "Avanza al menos un nivel durante 3 dias seguidos.",
    category: "adventure",
    difficulty: "medium",
    icon: "map",
    target: 3,
    reward: { gold: 300 },
    getProgress: (save) => save.achievements.unlockedIds.includes("three-day-advance-streak")
      ? 3
      : Math.min(save.achievements.levelAdvanceStreak.count, 3),
  },
  {
    id: "dual-region-explorer",
    title: "Dos fronteras",
    description: "Completa 3 niveles de Frontera Verde y 3 de Bosque encantado.",
    category: "adventure",
    difficulty: "medium",
    icon: "map",
    target: 6,
    reward: { experience: 180 },
    getProgress: (save) => Math.min(
      countCompletedLevelsInRegion(save, "meadowOutpost", 3)
        + countCompletedLevelsInRegion(save, "enchantedGrove", 3),
      6,
    ),
  },
  {
    id: "monster-hunter-25",
    title: "Batallador",
    description: "Derrota 25 monstruos en total.",
    category: "combat",
    difficulty: "medium",
    icon: "swords",
    target: 25,
    reward: { gold: 250 },
    getProgress: (save) => Math.min(save.achievements.monstersDefeated, 25),
  },
  {
    id: "monster-hunter-50",
    title: "Exterminador",
    description: "Derrota 50 monstruos en total.",
    category: "combat",
    difficulty: "medium",
    icon: "claw",
    target: 50,
    reward: { experience: 200 },
    getProgress: (save) => Math.min(save.achievements.monstersDefeated, 50),
  },
  {
    id: "ten-in-one-level",
    title: "Sin descanso",
    description: "Derrota 10 monstruos en un mismo nivel.",
    category: "combat",
    difficulty: "medium",
    icon: "swords",
    target: 10,
    reward: { healingCharges: 2, powerCharges: 3 },
    getProgress: (save) => Math.min(save.achievements.mostEnemiesDefeatedInLevel, 10),
  },
  {
    id: "enemy-variety",
    title: "Bestiario viviente",
    description: "Derrota al menos un M0, M1, M2 y M3.",
    category: "combat",
    difficulty: "medium",
    icon: "claw",
    target: 4,
    reward: { experience: 180 },
    getProgress: (save) => countDefeatedEnemyFamilies(save),
  },
  {
    id: "gold-collector-250",
    title: "Bolsa abundante",
    description: "Recoge 250 de ORO durante tus recorridos.",
    category: "discovery",
    difficulty: "medium",
    icon: "coin",
    target: 250,
    reward: { gold: 250 },
    getProgress: (save) => Math.min(save.achievements.goldCollected, 250),
  },
  {
    id: "five-checkpoints",
    title: "Ruta asegurada",
    description: "Activa checkpoints en 5 niveles distintos.",
    category: "discovery",
    difficulty: "medium",
    icon: "checkpoint",
    target: 5,
    reward: { experience: 150 },
    getProgress: (save) => Math.min(save.achievements.activatedCheckpointIds.length, 5),
  },
  {
    id: "five-treasures",
    title: "Cazatesoros",
    description: "Abre 5 cajas de recompensa distintas.",
    category: "discovery",
    difficulty: "medium",
    icon: "chest",
    target: 5,
    reward: { healingCharges: 2, powerCharges: 4 },
    getProgress: (save) => Math.min(save.claimedRewardBoxes.length, 5),
  },
  {
    id: "three-day-treasure-streak",
    title: "Hallazgo diario",
    description: "Abre al menos una caja durante 3 dias seguidos.",
    category: "discovery",
    difficulty: "medium",
    icon: "chest",
    target: 3,
    reward: { gold: 300 },
    getProgress: (save) => save.achievements.unlockedIds.includes("three-day-treasure-streak")
      ? 3
      : Math.min(save.achievements.treasureStreak.count, 3),
  },
];

function countCompletedLevelsInRegion(save: SaveData, prefix: string, limit: number): number {
  return Math.min(save.completedLevels.filter((levelId) => levelId.startsWith(prefix)).length, limit);
}

function countDefeatedEnemyFamilies(save: SaveData): number {
  const defeatedFamilies = new Set(
    save.achievements.defeatedEnemyIds.map((enemyId) => enemyId === "e2m3" ? "m3" : enemyId),
  );
  return ["m0", "m1", "m2", "m3"].filter((enemyId) => defeatedFamilies.has(enemyId)).length;
}

export const achievementIds = achievementDefinitions.map((achievement) => achievement.id);

export function getAchievementDefinition(achievementId: AchievementId): AchievementDefinition | undefined {
  return achievementDefinitions.find((achievement) => achievement.id === achievementId);
}

export function getAchievementRewardLabels(reward: AchievementReward): string[] {
  const labels: string[] = [];

  if (reward.gold) {
    labels.push(`+${reward.gold} ORO`);
  }
  if (reward.experience) {
    labels.push(`+${reward.experience} XP`);
  }
  if (reward.healingCharges) {
    labels.push(`+${reward.healingCharges} REGENERACIÓN`);
  }
  if (reward.powerCharges) {
    labels.push(`+${reward.powerCharges} PODER LETAL`);
  }

  return labels;
}
