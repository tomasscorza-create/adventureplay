import type { AchievementId, AchievementProgress } from "../../shared/types/game";

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  target: number;
  getProgress: (progress: AchievementProgress) => number;
}

export const achievementDefinitions: AchievementDefinition[] = [
  {
    id: "first-level",
    title: "Primer paso",
    description: "Completa el nivel 1 de Frontera Verde.",
    icon: "I",
    target: 1,
    getProgress: (progress) => progress.unlockedIds.includes("first-level") ? 1 : 0,
  },
  {
    id: "flawless-level",
    title: "Paso impecable",
    description: "Completa cualquier nivel sin perder salud.",
    icon: "V",
    target: 1,
    getProgress: (progress) => progress.unlockedIds.includes("flawless-level") ? 1 : 0,
  },
  {
    id: "monster-hunter",
    title: "Cazador de monstruos",
    description: "Derrota 10 monstruos en total.",
    icon: "X",
    target: 10,
    getProgress: (progress) => Math.min(progress.monstersDefeated, 10),
  },
];

export const achievementIds = achievementDefinitions.map((achievement) => achievement.id);
