import type { AchievementId, SaveData } from "../../shared/types/game";

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  target: number;
  getProgress: (save: SaveData) => number;
}

export const achievementDefinitions: AchievementDefinition[] = [
  {
    id: "first-level",
    title: "Primer paso",
    description: "Completa el nivel 1 de Frontera Verde.",
    icon: "I",
    target: 1,
    getProgress: (save) => save.achievements.unlockedIds.includes("first-level") ? 1 : 0,
  },
  {
    id: "flawless-level",
    title: "Paso impecable",
    description: "Completa cualquier nivel sin perder salud.",
    icon: "V",
    target: 1,
    getProgress: (save) => save.achievements.unlockedIds.includes("flawless-level") ? 1 : 0,
  },
  {
    id: "monster-hunter",
    title: "Cazador de monstruos",
    description: "Derrota 10 monstruos en total.",
    icon: "X",
    target: 10,
    getProgress: (save) => Math.min(save.achievements.monstersDefeated, 10),
  },
  {
    id: "first-monster",
    title: "Primer rival",
    description: "Derrota tu primer monstruo.",
    icon: "M",
    target: 1,
    getProgress: (save) => Math.min(save.achievements.monstersDefeated, 1),
  },
  {
    id: "first-gold",
    title: "Bolsillos con brillo",
    description: "Recoge tu primera pieza de ORO.",
    icon: "O",
    target: 1,
    getProgress: (save) => save.achievements.unlockedIds.includes("first-gold") ? 1 : 0,
  },
  {
    id: "first-checkpoint",
    title: "Camino asegurado",
    description: "Activa tu primer checkpoint.",
    icon: "C",
    target: 1,
    getProgress: (save) => save.achievements.unlockedIds.includes("first-checkpoint") ? 1 : 0,
  },
  {
    id: "first-treasure",
    title: "Tesoro encontrado",
    description: "Abre tu primera caja de recompensa.",
    icon: "T",
    target: 1,
    getProgress: (save) => Math.min(save.claimedRewardBoxes.length, 1),
  },
  {
    id: "three-levels",
    title: "Explorador constante",
    description: "Completa 3 niveles de Frontera Verde.",
    icon: "III",
    target: 3,
    getProgress: (save) => Math.min(save.completedLevels.length, 3),
  },
];

export const achievementIds = achievementDefinitions.map((achievement) => achievement.id);

export function getAchievementDefinition(achievementId: AchievementId): AchievementDefinition | undefined {
  return achievementDefinitions.find((achievement) => achievement.id === achievementId);
}
