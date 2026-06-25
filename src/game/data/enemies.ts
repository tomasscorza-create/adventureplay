import type { EnemyDefinition } from "../../shared/types/game";

export const enemyDefinitions: Record<string, EnemyDefinition> = {
  emberling: {
    id: "emberling",
    name: "Emberling",
    health: 3,
    damage: 1,
    speed: 70,
    experienceReward: 55,
  },
  m1: {
    id: "m1",
    name: "M1",
    health: 1,
    damage: 1,
    speed: 92,
    experienceReward: 35,
    chaseRange: 1050,
  },
};
