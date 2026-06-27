import type {
  LevelCoinSpawn,
  LevelDefinition,
  LevelEnemySpawn,
  LevelHazardDefinition,
  PlatformDefinition,
} from "../../shared/types/game";

const pathCoinPositions = [
  { x: 315, y: 500 },
  { x: 430, y: 500 },
  { x: 825, y: 510 },
  { x: 1085, y: 435 },
  { x: 1150, y: 435 },
  { x: 1480, y: 515 },
  { x: 1770, y: 445 },
  { x: 2365, y: 455 },
  { x: 2625, y: 385 },
  { x: 2965, y: 510 },
  { x: 3220, y: 430 },
  { x: 3500, y: 515 },
  { x: 3820, y: 450 },
  { x: 4065, y: 375 },
  { x: 4385, y: 515 },
  { x: 4640, y: 455 },
  { x: 4970, y: 505 },
  { x: 5240, y: 425 },
  { x: 5450, y: 610 },
  { x: 5610, y: 515 },
  { x: 5905, y: 435 },
  { x: 6295, y: 515 },
  { x: 6545, y: 455 },
  { x: 6820, y: 610 },
  { x: 6960, y: 500 },
  { x: 7235, y: 425 },
  { x: 7590, y: 510 },
  { x: 7855, y: 440 },
  { x: 8255, y: 500 },
  { x: 8470, y: 425 },
];

export function getPathCoinTarget(stageNumber: number): number {
  return Math.round(25 * 1.1 ** (stageNumber - 1));
}

function createPathCoinSpawns(stageNumber: number): LevelCoinSpawn[] {
  const target = getPathCoinTarget(stageNumber);
  const coinCount = Math.min(pathCoinPositions.length, Math.ceil(target / 2));
  const positions = Array.from({ length: coinCount }, (_, index) => {
    const positionIndex = Math.round((index * (pathCoinPositions.length - 1)) / (coinCount - 1));
    return pathCoinPositions[positionIndex];
  });
  const values = positions.map((_, index) => 1 + ((index + stageNumber - 1) % 3));
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

  return positions.map((position, index) => ({
    itemId: "bronzeCoin",
    ...position,
    value: values[index],
  }));
}

type PlatformRoute = NonNullable<PlatformDefinition["movement"]> & { x: number };

function addPlatformMovement(
  platforms: PlatformDefinition[],
  routes: PlatformRoute[],
): PlatformDefinition[] {
  return platforms.map((platform) => {
    const route = routes.find((candidate) => candidate.x === platform.x);
    if (!route) {
      return { ...platform, movement: undefined };
    }

    return {
      ...platform,
      movement: {
        axis: route.axis,
        distance: route.distance,
        speed: route.speed,
      },
    };
  });
}

function increaseHazardPressure(
  hazards: LevelHazardDefinition[],
  levelPrefix: string,
  speedMultiplier: number,
  distanceMultiplier: number,
): LevelHazardDefinition[] {
  return hazards.map((hazard, index) => ({
    ...hazard,
    id: `${levelPrefix}-${index + 1}`,
    distance: hazard.distance ? Math.round(hazard.distance * distanceMultiplier) : undefined,
    speed: hazard.speed ? Math.round(hazard.speed * speedMultiplier) : undefined,
  }));
}

function increaseEnemyPressure(
  enemies: LevelEnemySpawn[],
  multiplier: number,
): LevelEnemySpawn[] {
  return enemies.map((enemy) => ({
    ...enemy,
    patrolDistance: Math.round(enemy.patrolDistance * multiplier),
    aggression: enemy.aggression
      ? Number((enemy.aggression * multiplier).toFixed(2))
      : undefined,
  }));
}

export const levelDefinitions: Record<string, LevelDefinition> = {
  meadowOutpost: {
    id: "meadowOutpost",
    name: "Meadow Outpost I",
    stageNumber: 1,
    nextLevelId: "meadowOutpost2",
    worldWidth: 8640,
    timeLimitSeconds: 90,
    autoScrollSpeed: 42,
    playerStart: { x: 110, y: 548 },
    platforms: [
      { x: 0, y: 660, width: 560, height: 60 },
      { x: 700, y: 660, width: 520, height: 60 },
      { x: 1360, y: 660, width: 620, height: 60 },
      { x: 2140, y: 660, width: 520, height: 60 },
      { x: 2820, y: 660, width: 430, height: 60 },
      { x: 3420, y: 660, width: 520, height: 60 },
      { x: 4080, y: 660, width: 560, height: 60 },
      { x: 4800, y: 660, width: 500, height: 60 },
      { x: 5450, y: 660, width: 520, height: 60 },
      { x: 6150, y: 660, width: 470, height: 60 },
      { x: 6820, y: 660, width: 520, height: 60 },
      { x: 7500, y: 660, width: 430, height: 60 },
      { x: 8100, y: 660, width: 540, height: 60 },
      { x: 270, y: 545, width: 180, height: 28 },
      { x: 770, y: 555, width: 150, height: 28 },
      { x: 1010, y: 480, width: 180, height: 28 },
      { x: 1430, y: 560, width: 160, height: 28 },
      { x: 1700, y: 490, width: 190, height: 28 },
      { x: 2060, y: 570, width: 120, height: 28 },
      { x: 2320, y: 505, width: 160, height: 28 },
      { x: 2570, y: 435, width: 140, height: 28 },
      { x: 2920, y: 555, width: 125, height: 28 },
      { x: 3175, y: 475, width: 125, height: 28 },
      { x: 3500, y: 560, width: 150, height: 28 },
      { x: 3770, y: 495, width: 155, height: 28 },
      { x: 4025, y: 420, width: 120, height: 28 },
      { x: 4320, y: 560, width: 150, height: 28 },
      { x: 4580, y: 500, width: 145, height: 28 },
      { x: 4910, y: 550, width: 130, height: 28 },
      { x: 5180, y: 470, width: 135, height: 28 },
      { x: 5550, y: 560, width: 125, height: 28 },
      { x: 5840, y: 480, width: 150, height: 28 },
      { x: 6235, y: 560, width: 115, height: 28 },
      { x: 6485, y: 500, width: 125, height: 28 },
      { x: 6900, y: 545, width: 120, height: 28 },
      { x: 7175, y: 470, width: 130, height: 28 },
      { x: 7535, y: 555, width: 110, height: 28 },
      { x: 7805, y: 485, width: 120, height: 28 },
      { x: 8200, y: 545, width: 130, height: 28 },
      { x: 8420, y: 470, width: 120, height: 28 },
    ],
    hazards: [
      { id: "pit-river-1", type: "pit", x: 560, y: 682, width: 140, height: 38, damage: 1 },
      { id: "pit-river-2", type: "pit", x: 1220, y: 682, width: 140, height: 38, damage: 1 },
      { id: "spikes-1", type: "spike", x: 1535, y: 635, width: 95, height: 25, damage: 1 },
      { id: "pit-river-3", type: "pit", x: 1980, y: 682, width: 160, height: 38, damage: 1 },
      { id: "pit-river-4", type: "pit", x: 2660, y: 682, width: 160, height: 38, damage: 1 },
      { id: "moving-saw-1", type: "moving", x: 3000, y: 510, width: 34, height: 34, damage: 1, axis: "y", distance: 80, speed: 58 },
      { id: "spikes-2", type: "spike", x: 3565, y: 635, width: 120, height: 25, damage: 1 },
      { id: "pit-river-5", type: "pit", x: 3940, y: 682, width: 140, height: 38, damage: 1 },
      { id: "spikes-3", type: "spike", x: 4350, y: 635, width: 105, height: 25, damage: 1 },
      { id: "pit-river-6", type: "pit", x: 4640, y: 682, width: 160, height: 38, damage: 1 },
      { id: "moving-saw-2", type: "moving", x: 5050, y: 605, width: 34, height: 34, damage: 1, axis: "x", distance: 145, speed: 86 },
      { id: "pit-river-7", type: "pit", x: 5300, y: 682, width: 150, height: 38, damage: 1 },
      { id: "pit-river-8", type: "pit", x: 5970, y: 682, width: 180, height: 38, damage: 1 },
      { id: "spikes-4", type: "spike", x: 6310, y: 635, width: 120, height: 25, damage: 1 },
      { id: "pit-river-9", type: "pit", x: 6620, y: 682, width: 200, height: 38, damage: 1 },
      { id: "moving-saw-3", type: "moving", x: 7080, y: 515, width: 34, height: 34, damage: 1, axis: "x", distance: 155, speed: 100 },
      { id: "pit-river-10", type: "pit", x: 7340, y: 682, width: 160, height: 38, damage: 1 },
      { id: "spikes-5", type: "spike", x: 7590, y: 635, width: 130, height: 25, damage: 1 },
      { id: "pit-river-11", type: "pit", x: 7930, y: 682, width: 170, height: 38, damage: 1 },
      { id: "moving-saw-4", type: "moving", x: 7860, y: 440, width: 34, height: 34, damage: 1, axis: "y", distance: 110, speed: 82 },
      { id: "moving-saw-5", type: "moving", x: 8260, y: 505, width: 34, height: 34, damage: 1, axis: "x", distance: 130, speed: 118 },
    ],
    enemies: [
      { enemyId: "m0", x: 1765, y: 615, patrolDistance: 0 },
      { enemyId: "m0", x: 2440, y: 615, patrolDistance: 0 },
      { enemyId: "m1", x: 3650, y: 615, patrolDistance: 95 },
      { enemyId: "m0", x: 4440, y: 615, patrolDistance: 0 },
      { enemyId: "m1", x: 4980, y: 615, patrolDistance: 105 },
      { enemyId: "m2", x: 5700, y: 420, patrolDistance: 520, aggression: 0.82 },
      { enemyId: "m0", x: 6285, y: 615, patrolDistance: 0 },
      { enemyId: "m2", x: 6980, y: 430, patrolDistance: 560, aggression: 0.9 },
      { enemyId: "m1", x: 7640, y: 615, patrolDistance: 120 },
      { enemyId: "m0", x: 8330, y: 615, patrolDistance: 0 },
      { enemyId: "m2", x: 8420, y: 425, patrolDistance: 340, aggression: 0.95 },
    ],
    coins: [
      ...createPathCoinSpawns(1),
      { itemId: "forestGatePlan", x: 4120, y: 372 },
      { itemId: "fieldHook", x: 5960, y: 432 },
    ],
    lifePickups: [
      { id: "meadow-extra-life", x: 5585, y: 515 },
    ],
    rewardBox: { id: "reward-box-l1", x: 390, y: 642 },
    checkpoint: { id: "meadow-midpoint", x: 4300, y: 610 },
    goal: { x: 8530, y: 595 },
  },
};

levelDefinitions.meadowOutpost2 = {
  ...levelDefinitions.meadowOutpost,
  id: "meadowOutpost2",
  name: "Meadow Outpost II",
  stageNumber: 2,
  nextLevelId: "meadowOutpost3",
  timeLimitSeconds: 82,
  autoScrollSpeed: 52,
  hazards: [
    { id: "l2-pit-river-1", type: "pit", x: 560, y: 682, width: 140, height: 38, damage: 1 },
    { id: "l2-pit-river-2", type: "pit", x: 1220, y: 682, width: 140, height: 38, damage: 1 },
    { id: "l2-spikes-1", type: "spike", x: 1535, y: 635, width: 110, height: 25, damage: 1 },
    { id: "l2-pit-river-3", type: "pit", x: 1980, y: 682, width: 160, height: 38, damage: 1 },
    { id: "l2-moving-saw-1", type: "moving", x: 2410, y: 612, width: 34, height: 34, damage: 1, axis: "x", distance: 150, speed: 88 },
    { id: "l2-pit-river-4", type: "pit", x: 2660, y: 682, width: 160, height: 38, damage: 1 },
    { id: "l2-moving-saw-2", type: "moving", x: 3000, y: 510, width: 34, height: 34, damage: 1, axis: "y", distance: 95, speed: 78 },
    { id: "l2-spikes-2", type: "spike", x: 3565, y: 635, width: 130, height: 25, damage: 1 },
    { id: "l2-pit-river-5", type: "pit", x: 3940, y: 682, width: 140, height: 38, damage: 1 },
    { id: "l2-spikes-3", type: "spike", x: 4350, y: 635, width: 118, height: 25, damage: 1 },
    { id: "l2-pit-river-6", type: "pit", x: 4640, y: 682, width: 160, height: 38, damage: 1 },
    { id: "l2-moving-saw-3", type: "moving", x: 5050, y: 605, width: 34, height: 34, damage: 1, axis: "x", distance: 170, speed: 105 },
    { id: "l2-pit-river-7", type: "pit", x: 5300, y: 682, width: 150, height: 38, damage: 1 },
    { id: "l2-moving-saw-4", type: "moving", x: 5900, y: 430, width: 34, height: 34, damage: 1, axis: "y", distance: 100, speed: 84 },
    { id: "l2-pit-river-8", type: "pit", x: 5970, y: 682, width: 180, height: 38, damage: 1 },
    { id: "l2-spikes-4", type: "spike", x: 6310, y: 635, width: 130, height: 25, damage: 1 },
    { id: "l2-pit-river-9", type: "pit", x: 6620, y: 682, width: 200, height: 38, damage: 1 },
    { id: "l2-moving-saw-5", type: "moving", x: 7080, y: 515, width: 34, height: 34, damage: 1, axis: "x", distance: 165, speed: 118 },
    { id: "l2-pit-river-10", type: "pit", x: 7340, y: 682, width: 160, height: 38, damage: 1 },
    { id: "l2-spikes-5", type: "spike", x: 7590, y: 635, width: 140, height: 25, damage: 1 },
    { id: "l2-moving-saw-6", type: "moving", x: 7860, y: 440, width: 34, height: 34, damage: 1, axis: "y", distance: 115, speed: 92 },
    { id: "l2-pit-river-11", type: "pit", x: 7930, y: 682, width: 170, height: 38, damage: 1 },
    { id: "l2-moving-saw-7", type: "moving", x: 8260, y: 505, width: 34, height: 34, damage: 1, axis: "x", distance: 145, speed: 128 },
  ],
  enemies: [
    { enemyId: "m0", x: 1510, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 2235, y: 615, patrolDistance: 120 },
    { enemyId: "m0", x: 3150, y: 615, patrolDistance: 0 },
    { enemyId: "m2", x: 3650, y: 420, patrolDistance: 520, aggression: 1.08 },
    { enemyId: "m1", x: 4440, y: 615, patrolDistance: 130 },
    { enemyId: "m2", x: 5050, y: 410, patrolDistance: 540, aggression: 1.12 },
    { enemyId: "m0", x: 5700, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 6285, y: 615, patrolDistance: 125 },
    { enemyId: "m2", x: 6980, y: 430, patrolDistance: 580, aggression: 1.18 },
    { enemyId: "m0", x: 7330, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 7640, y: 615, patrolDistance: 135 },
    { enemyId: "m2", x: 8330, y: 425, patrolDistance: 420, aggression: 1.22 },
    { enemyId: "m0", x: 8420, y: 615, patrolDistance: 0 },
  ],
  coins: [
    ...createPathCoinSpawns(2),
    ...levelDefinitions.meadowOutpost.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
    { itemId: "oldIronKey", x: 2410, y: 566 },
    { itemId: "trainingBlade", x: 7085, y: 468 },
  ],
  lifePickups: [],
  rewardBox: { id: "reward-box-l2", x: 1080, y: 462 },
  checkpoint: { id: "meadow-ii-midpoint", x: 4300, y: 610 },
};

levelDefinitions.meadowOutpost3 = {
  ...levelDefinitions.meadowOutpost2,
  id: "meadowOutpost3",
  name: "Meadow Outpost III",
  stageNumber: 3,
  nextLevelId: "meadowOutpost4",
  timeLimitSeconds: 74,
  autoScrollSpeed: 62,
  hazards: [
    { id: "l3-pit-river-1", type: "pit", x: 560, y: 682, width: 150, height: 38, damage: 1 },
    { id: "l3-pit-river-2", type: "pit", x: 1220, y: 682, width: 150, height: 38, damage: 1 },
    { id: "l3-spikes-1", type: "spike", x: 1515, y: 635, width: 125, height: 25, damage: 1 },
    { id: "l3-pit-river-3", type: "pit", x: 1980, y: 682, width: 170, height: 38, damage: 1 },
    { id: "l3-moving-saw-1", type: "moving", x: 2390, y: 612, width: 34, height: 34, damage: 1, axis: "x", distance: 170, speed: 105 },
    { id: "l3-pit-river-4", type: "pit", x: 2660, y: 682, width: 170, height: 38, damage: 1 },
    { id: "l3-moving-saw-2", type: "moving", x: 3000, y: 510, width: 34, height: 34, damage: 1, axis: "y", distance: 110, speed: 94 },
    { id: "l3-spikes-2", type: "spike", x: 3555, y: 635, width: 145, height: 25, damage: 1 },
    { id: "l3-pit-river-5", type: "pit", x: 3940, y: 682, width: 150, height: 38, damage: 1 },
    { id: "l3-spikes-3", type: "spike", x: 4338, y: 635, width: 132, height: 25, damage: 1 },
    { id: "l3-pit-river-6", type: "pit", x: 4640, y: 682, width: 175, height: 38, damage: 1 },
    { id: "l3-moving-saw-3", type: "moving", x: 5050, y: 605, width: 34, height: 34, damage: 1, axis: "x", distance: 190, speed: 126 },
    { id: "l3-pit-river-7", type: "pit", x: 5300, y: 682, width: 160, height: 38, damage: 1 },
    { id: "l3-moving-saw-4", type: "moving", x: 5900, y: 430, width: 34, height: 34, damage: 1, axis: "y", distance: 120, speed: 100 },
    { id: "l3-pit-river-8", type: "pit", x: 5970, y: 682, width: 190, height: 38, damage: 1 },
    { id: "l3-spikes-4", type: "spike", x: 6298, y: 635, width: 146, height: 25, damage: 1 },
    { id: "l3-pit-river-9", type: "pit", x: 6620, y: 682, width: 210, height: 38, damage: 1 },
    { id: "l3-moving-saw-5", type: "moving", x: 7080, y: 515, width: 34, height: 34, damage: 1, axis: "x", distance: 185, speed: 136 },
    { id: "l3-pit-river-10", type: "pit", x: 7340, y: 682, width: 175, height: 38, damage: 1 },
    { id: "l3-spikes-5", type: "spike", x: 7580, y: 635, width: 155, height: 25, damage: 1 },
    { id: "l3-moving-saw-6", type: "moving", x: 7860, y: 440, width: 34, height: 34, damage: 1, axis: "y", distance: 130, speed: 110 },
    { id: "l3-pit-river-11", type: "pit", x: 7930, y: 682, width: 185, height: 38, damage: 1 },
    { id: "l3-moving-saw-7", type: "moving", x: 8260, y: 505, width: 34, height: 34, damage: 1, axis: "x", distance: 165, speed: 148 },
    { id: "l3-moving-saw-8", type: "moving", x: 3360, y: 452, width: 34, height: 34, damage: 1, axis: "y", distance: 95, speed: 92 },
    { id: "l3-spikes-6", type: "spike", x: 5205, y: 635, width: 115, height: 25, damage: 1 },
    { id: "l3-moving-saw-9", type: "moving", x: 6780, y: 470, width: 34, height: 34, damage: 1, axis: "y", distance: 105, speed: 104 },
    { id: "l3-spikes-7", type: "spike", x: 8360, y: 635, width: 120, height: 25, damage: 1 },
  ],
  enemies: [
    { enemyId: "m0", x: 1510, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 2235, y: 615, patrolDistance: 135 },
    { enemyId: "m2", x: 2830, y: 420, patrolDistance: 440, aggression: 1.24 },
    { enemyId: "m0", x: 3150, y: 615, patrolDistance: 0 },
    { enemyId: "m2", x: 3650, y: 420, patrolDistance: 560, aggression: 1.28 },
    { enemyId: "m1", x: 4440, y: 615, patrolDistance: 145 },
    { enemyId: "m2", x: 5050, y: 410, patrolDistance: 580, aggression: 1.34 },
    { enemyId: "m0", x: 5700, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 6285, y: 615, patrolDistance: 140 },
    { enemyId: "m2", x: 6600, y: 420, patrolDistance: 500, aggression: 1.38 },
    { enemyId: "m2", x: 6980, y: 430, patrolDistance: 620, aggression: 1.42 },
    { enemyId: "m0", x: 7330, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 7640, y: 615, patrolDistance: 150 },
    { enemyId: "m2", x: 8050, y: 420, patrolDistance: 460, aggression: 1.46 },
    { enemyId: "m2", x: 8330, y: 425, patrolDistance: 460, aggression: 1.5 },
    { enemyId: "m0", x: 8420, y: 615, patrolDistance: 0 },
  ],
  coins: [
    ...createPathCoinSpawns(3),
    ...levelDefinitions.meadowOutpost2.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
    { itemId: "smallHealthPotion", x: 6785, y: 420 },
  ],
  rewardBox: { id: "reward-box-l3", x: 2380, y: 487 },
  checkpoint: { id: "meadow-iii-midpoint", x: 4300, y: 610 },
};

levelDefinitions.meadowOutpost4 = {
  ...levelDefinitions.meadowOutpost3,
  id: "meadowOutpost4",
  name: "Piedras Errantes I",
  stageNumber: 4,
  nextLevelId: "meadowOutpost5",
  timeLimitSeconds: 70,
  autoScrollSpeed: 72,
  platforms: addPlatformMovement(levelDefinitions.meadowOutpost.platforms, [
    { x: 770, axis: "x", distance: 68, speed: 56 },
    { x: 2570, axis: "y", distance: 66, speed: 52 },
    { x: 3770, axis: "x", distance: 82, speed: 60 },
    { x: 5180, axis: "y", distance: 72, speed: 56 },
    { x: 7175, axis: "x", distance: 88, speed: 64 },
    { x: 8200, axis: "y", distance: 70, speed: 60 },
  ]),
  hazards: [
    ...increaseHazardPressure(levelDefinitions.meadowOutpost3.hazards, "l4-hazard", 1.16, 1.08),
    { id: "l4-platform-saw-1", type: "moving", x: 2625, y: 360, width: 34, height: 34, damage: 1, axis: "x", distance: 105, speed: 112 },
    { id: "l4-platform-saw-2", type: "moving", x: 5225, y: 405, width: 34, height: 34, damage: 1, axis: "y", distance: 105, speed: 108 },
    { id: "l4-platform-spikes", type: "spike", x: 7125, y: 635, width: 118, height: 25, damage: 1 },
  ],
  enemies: [
    ...increaseEnemyPressure(levelDefinitions.meadowOutpost3.enemies, 1.16),
    { enemyId: "m1", x: 3970, y: 615, patrolDistance: 155 },
    { enemyId: "m2", x: 7420, y: 405, patrolDistance: 520, aggression: 1.62 },
  ],
  coins: [
    ...createPathCoinSpawns(4),
    ...levelDefinitions.meadowOutpost3.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
  ],
  lifePickups: [],
  rewardBox: { id: "reward-box-l4", x: 4380, y: 542 },
  checkpoint: { id: "meadow-iv-midpoint", x: 4300, y: 610 },
};

levelDefinitions.meadowOutpost5 = {
  ...levelDefinitions.meadowOutpost4,
  id: "meadowOutpost5",
  name: "Piedras Errantes II",
  stageNumber: 5,
  nextLevelId: "meadowOutpost6",
  timeLimitSeconds: 66,
  autoScrollSpeed: 84,
  platforms: addPlatformMovement(levelDefinitions.meadowOutpost.platforms, [
    { x: 270, axis: "y", distance: 62, speed: 64 },
    { x: 1010, axis: "x", distance: 82, speed: 68 },
    { x: 2320, axis: "y", distance: 74, speed: 66 },
    { x: 3175, axis: "x", distance: 94, speed: 72 },
    { x: 4025, axis: "y", distance: 82, speed: 68 },
    { x: 5180, axis: "x", distance: 96, speed: 76 },
    { x: 6485, axis: "y", distance: 86, speed: 72 },
    { x: 7805, axis: "x", distance: 104, speed: 80 },
  ]),
  hazards: [
    ...increaseHazardPressure(levelDefinitions.meadowOutpost4.hazards, "l5-hazard", 1.16, 1.08),
    { id: "l5-platform-saw-1", type: "moving", x: 1080, y: 415, width: 34, height: 34, damage: 1, axis: "y", distance: 108, speed: 128 },
    { id: "l5-platform-saw-2", type: "moving", x: 4100, y: 360, width: 34, height: 34, damage: 2, axis: "x", distance: 126, speed: 134 },
    { id: "l5-platform-spikes", type: "spike", x: 6450, y: 635, width: 138, height: 25, damage: 2 },
  ],
  enemies: [
    ...increaseEnemyPressure(levelDefinitions.meadowOutpost4.enemies, 1.16),
    { enemyId: "m1", x: 3350, y: 615, patrolDistance: 170 },
    { enemyId: "m2", x: 6120, y: 390, patrolDistance: 560, aggression: 1.82 },
  ],
  coins: [
    ...createPathCoinSpawns(5),
    ...levelDefinitions.meadowOutpost4.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
  ],
  rewardBox: { id: "reward-box-l5", x: 5900, y: 462 },
  checkpoint: { id: "meadow-v-midpoint", x: 4300, y: 610 },
};

levelDefinitions.meadowOutpost6 = {
  ...levelDefinitions.meadowOutpost5,
  id: "meadowOutpost6",
  name: "Piedras Errantes III",
  stageNumber: 6,
  nextLevelId: undefined,
  timeLimitSeconds: 62,
  autoScrollSpeed: 98,
  platforms: addPlatformMovement(levelDefinitions.meadowOutpost.platforms, [
    { x: 270, axis: "x", distance: 86, speed: 78 },
    { x: 1010, axis: "y", distance: 80, speed: 76 },
    { x: 1700, axis: "x", distance: 102, speed: 84 },
    { x: 2570, axis: "y", distance: 92, speed: 80 },
    { x: 3175, axis: "x", distance: 112, speed: 88 },
    { x: 4025, axis: "y", distance: 98, speed: 84 },
    { x: 4910, axis: "x", distance: 118, speed: 92 },
    { x: 5840, axis: "y", distance: 102, speed: 88 },
    { x: 7175, axis: "x", distance: 124, speed: 96 },
    { x: 8200, axis: "y", distance: 108, speed: 92 },
  ]),
  hazards: [
    ...increaseHazardPressure(levelDefinitions.meadowOutpost5.hazards, "l6-hazard", 1.17, 1.08),
    { id: "l6-lethal-saw-1", type: "moving", x: 1765, y: 420, width: 38, height: 38, damage: 3, axis: "y", distance: 124, speed: 154 },
    { id: "l6-lethal-saw-2", type: "moving", x: 4980, y: 430, width: 38, height: 38, damage: 3, axis: "x", distance: 150, speed: 164 },
    { id: "l6-heavy-spikes", type: "spike", x: 7160, y: 635, width: 152, height: 25, damage: 2 },
  ],
  enemies: [
    ...increaseEnemyPressure(levelDefinitions.meadowOutpost5.enemies, 1.16),
    { enemyId: "m2", x: 1880, y: 395, patrolDistance: 580, aggression: 2.02 },
    { enemyId: "m1", x: 5480, y: 615, patrolDistance: 190 },
  ],
  coins: [
    ...createPathCoinSpawns(6),
    ...levelDefinitions.meadowOutpost5.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
  ],
  rewardBox: { id: "reward-box-l6", x: 6545, y: 482 },
  checkpoint: { id: "meadow-vi-midpoint", x: 4300, y: 610 },
};
