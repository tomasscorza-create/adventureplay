import type { EnemyDefinition } from "../../shared/types/game";

export const enemyDefinitions: Record<string, EnemyDefinition> = {
  m0: {
    id: "m0",
    name: "M0",
    health: 2,
    damage: 1,
    speed: 0,
    experienceReward: 35,
  },
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
  m2: {
    id: "m2",
    name: "M2",
    health: 1,
    damage: 1,
    speed: 175,
    experienceReward: 45,
    chaseRange: 920,
  },
};
