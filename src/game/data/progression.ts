import type { SkillDefinition } from "../../shared/types/game";

export const experienceByLevel: Record<number, number> = {
  1: 100,
  2: 180,
  3: 280,
  4: 420,
};

export const skillDefinitions: SkillDefinition[] = [
  {
    id: "stronger-strike",
    name: "Stronger Strike",
    requiredLevel: 2,
    description: "Basic melee damage upgrade.",
  },
  {
    id: "quick-steps",
    name: "Quick Steps",
    requiredLevel: 3,
    description: "Basic movement speed upgrade.",
  },
];
