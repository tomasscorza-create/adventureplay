import type {
  LevelCoinSpawn,
  LevelDefinition,
  LevelHazardDefinition,
  PlatformDefinition,
} from "../../../shared/types/game";
import { addPlatformMovement, getPathCoinTarget } from "./levelHelpers.ts";

const volcanicPlatforms: PlatformDefinition[] = [
  { x: 0, y: 660, width: 720, height: 60 },
  { x: 860, y: 660, width: 680, height: 60 },
  { x: 1690, y: 660, width: 760, height: 60 },
  { x: 2610, y: 660, width: 690, height: 60 },
  { x: 3470, y: 660, width: 740, height: 60 },
  { x: 4380, y: 660, width: 620, height: 60 },
  { x: 5160, y: 660, width: 440, height: 60 },
  { x: 310, y: 535, width: 210, height: 28 },
  { x: 930, y: 520, width: 190, height: 28 },
  { x: 1230, y: 440, width: 210, height: 28 },
  { x: 1770, y: 515, width: 200, height: 28 },
  { x: 2110, y: 435, width: 210, height: 28 },
  { x: 2700, y: 515, width: 205, height: 28 },
  { x: 3030, y: 430, width: 210, height: 28 },
  { x: 3550, y: 520, width: 205, height: 28 },
  { x: 3900, y: 440, width: 210, height: 28 },
  { x: 4460, y: 515, width: 205, height: 28 },
  { x: 4780, y: 430, width: 205, height: 28 },
  { x: 5230, y: 515, width: 210, height: 28 },
];

const volcanicPits: LevelHazardDefinition[] = [
  { id: "pit-1", type: "pit", x: 720, y: 682, width: 140, height: 38, damage: 1 },
  { id: "pit-2", type: "pit", x: 1540, y: 682, width: 150, height: 38, damage: 1 },
  { id: "pit-3", type: "pit", x: 2450, y: 682, width: 160, height: 38, damage: 1 },
  { id: "pit-4", type: "pit", x: 3300, y: 682, width: 170, height: 38, damage: 1 },
  { id: "pit-5", type: "pit", x: 4210, y: 682, width: 170, height: 38, damage: 1 },
  { id: "pit-6", type: "pit", x: 5000, y: 682, width: 160, height: 38, damage: 1 },
];

const volcanicThreats: LevelHazardDefinition[] = [
  { id: "spike-1", type: "spike", x: 590, y: 635, width: 78, height: 25, damage: 1 },
  { id: "magma-orb-1", type: "moving", x: 1260, y: 520, width: 36, height: 36, damage: 1, axis: "y", distance: 96, speed: 94 },
  { id: "spike-2", type: "spike", x: 2250, y: 635, width: 92, height: 25, damage: 1 },
  { id: "magma-orb-2", type: "moving", x: 3060, y: 515, width: 38, height: 38, damage: 1, axis: "x", distance: 120, speed: 108 },
  { id: "spike-3", type: "spike", x: 3610, y: 635, width: 96, height: 25, damage: 1 },
  { id: "magma-orb-3", type: "moving", x: 4680, y: 500, width: 40, height: 40, damage: 1, axis: "y", distance: 116, speed: 122 },
  { id: "spike-4", type: "spike", x: 5270, y: 635, width: 102, height: 25, damage: 2 },
];

const volcanicCoinPositions = [
  { x: 320, y: 500 }, { x: 540, y: 610 }, { x: 980, y: 480 },
  { x: 1280, y: 395 }, { x: 1810, y: 470 }, { x: 2160, y: 390 },
  { x: 2720, y: 470 }, { x: 3090, y: 385 }, { x: 3500, y: 610 },
  { x: 3760, y: 475 }, { x: 4320, y: 500 }, { x: 4750, y: 390 },
  { x: 5290, y: 470 },
];

function createVolcanicCoins(stageNumber: number): LevelCoinSpawn[] {
  const target = getPathCoinTarget(stageNumber);
  const values = volcanicCoinPositions.map((_, index) => 1 + ((index + stageNumber) % 3));
  let difference = target - values.reduce((sum, value) => sum + value, 0);
  while (difference !== 0) {
    for (let index = 0; index < values.length && difference !== 0; index += 1) {
      if (difference > 0 && values[index] < 3) {
        values[index] += 1;
        difference -= 1;
      } else if (difference < 0 && values[index] > 1) {
        values[index] -= 1;
        difference += 1;
      }
    }
  }
  return volcanicCoinPositions.map((position, index) => ({
    itemId: "bronzeCoin",
    ...position,
    value: values[index],
  }));
}

function createVolcanicHazards(stageNumber: number): LevelHazardDefinition[] {
  const threatCounts = [0, 3, 5, 7];
  return [
    ...volcanicPits.map((hazard) => ({ ...hazard, id: `volcano-l${stageNumber}-${hazard.id}` })),
    ...volcanicThreats.slice(0, threatCounts[stageNumber] ?? 0).map((hazard) => ({
      ...hazard,
      id: `volcano-l${stageNumber}-${hazard.id}`,
      speed: hazard.speed ? Math.round(hazard.speed * (1 + (stageNumber - 1) * 0.08)) : undefined,
    })),
  ];
}

export const activeVolcanoLevelDefinitions: Record<string, LevelDefinition> = {};

activeVolcanoLevelDefinitions.activeVolcano1 = {
  id: "activeVolcano1",
  name: "Umbral de ceniza",
  stageNumber: 1,
  theme: "active-volcano",
  nextLevelId: "activeVolcano2",
  worldWidth: 5600,
  timeLimitSeconds: 68,
  autoScrollSpeed: 60,
  playerStart: { x: 110, y: 548 },
  platforms: volcanicPlatforms,
  hazards: createVolcanicHazards(1),
  enemies: [
    { enemyId: "m0", x: 1100, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 1950, y: 615, patrolDistance: 130 },
    { enemyId: "m0", x: 2850, y: 615, patrolDistance: 0 },
    { enemyId: "m2", x: 3600, y: 365, patrolDistance: 560, aggression: 0.96 },
    { enemyId: "m1", x: 4550, y: 615, patrolDistance: 145 },
    { enemyId: "m0", x: 5450, y: 615, patrolDistance: 0 },
  ],
  coins: createVolcanicCoins(1),
  healthPickups: [],
  rewardBox: { id: "reward-box-volcano-l1", x: 440, y: 642 },
  checkpoint: { id: "active-volcano-l1-midpoint", x: 2860, y: 610 },
  goal: { x: 5490, y: 595 },
};

activeVolcanoLevelDefinitions.activeVolcano2 = {
  ...activeVolcanoLevelDefinitions.activeVolcano1,
  id: "activeVolcano2",
  name: "Ríos de magma",
  stageNumber: 2,
  nextLevelId: "activeVolcano3",
  timeLimitSeconds: 64,
  autoScrollSpeed: 70,
  hazards: createVolcanicHazards(2),
  enemies: [
    { enemyId: "m0", x: 1030, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 1430, y: 615, patrolDistance: 150 },
    { enemyId: "m2", x: 1900, y: 365, patrolDistance: 580, aggression: 1.04 },
    { enemyId: "m0", x: 2800, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 3150, y: 615, patrolDistance: 165 },
    { enemyId: "m2", x: 3760, y: 355, patrolDistance: 610, aggression: 1.1 },
    { enemyId: "m1", x: 4550, y: 615, patrolDistance: 170 },
    { enemyId: "m0", x: 5420, y: 615, patrolDistance: 0 },
  ],
  coins: createVolcanicCoins(2),
  rewardBox: { id: "reward-box-volcano-l2", x: 1810, y: 642 },
  checkpoint: { id: "active-volcano-l2-midpoint", x: 2860, y: 610 },
};

activeVolcanoLevelDefinitions.activeVolcano3 = {
  ...activeVolcanoLevelDefinitions.activeVolcano2,
  id: "activeVolcano3",
  name: "Furia del cráter",
  stageNumber: 3,
  nextLevelId: undefined,
  timeLimitSeconds: 60,
  autoScrollSpeed: 82,
  platforms: addPlatformMovement(volcanicPlatforms, [
    { x: 1230, axis: "y", distance: 78, speed: 84 },
    { x: 3030, axis: "x", distance: 96, speed: 90 },
    { x: 4460, axis: "y", distance: 86, speed: 88 },
  ]),
  hazards: createVolcanicHazards(3),
  enemies: [
    { enemyId: "m0", x: 1010, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 1430, y: 615, patrolDistance: 175 },
    { enemyId: "m2", x: 1850, y: 350, patrolDistance: 620, aggression: 1.14 },
    { enemyId: "m1", x: 2150, y: 615, patrolDistance: 180 },
    { enemyId: "m0", x: 2790, y: 615, patrolDistance: 0 },
    { enemyId: "m2", x: 3300, y: 350, patrolDistance: 650, aggression: 1.2 },
    { enemyId: "m1", x: 3850, y: 615, patrolDistance: 185 },
    { enemyId: "m2", x: 4400, y: 345, patrolDistance: 680, aggression: 1.25 },
    { enemyId: "m1", x: 4750, y: 615, patrolDistance: 190 },
    { enemyId: "m0", x: 5420, y: 615, patrolDistance: 0 },
  ],
  coins: createVolcanicCoins(3),
  healthPickups: [{ x: 4030, y: 612 }],
  rewardBox: { id: "reward-box-volcano-l3", x: 3540, y: 642 },
  checkpoint: { id: "active-volcano-l3-midpoint", x: 2860, y: 610 },
};
