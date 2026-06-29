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
      ? Math.min(1.65, Number((enemy.aggression * multiplier).toFixed(2)))
      : undefined,
  }));
}

function keepPitsAndHazards(
  hazards: LevelHazardDefinition[],
  hazardIds: string[],
): LevelHazardDefinition[] {
  const keptHazards = new Set(hazardIds);
  return hazards.filter((hazard) => hazard.type === "pit" || keptHazards.has(hazard.id));
}

function createColossusHazards(
  hazards: LevelHazardDefinition[],
  levelPrefix: string,
  speedMultiplier = 1,
): LevelHazardDefinition[] {
  return hazards
    .filter((hazard) => hazard.type === "pit" || [1765, 4980, 7160].includes(hazard.x))
    .map((hazard, index) => ({
      ...hazard,
      id: `${levelPrefix}-${index + 1}`,
      speed: hazard.speed ? Math.round(hazard.speed * speedMultiplier) : undefined,
    }));
}

const enchantedCoinPositions = [
  { x: 300, y: 500 },
  { x: 520, y: 610 },
  { x: 920, y: 470 },
  { x: 1220, y: 395 },
  { x: 1700, y: 470 },
  { x: 2050, y: 400 },
  { x: 2640, y: 470 },
  { x: 2920, y: 390 },
  { x: 3400, y: 480 },
  { x: 3680, y: 405 },
  { x: 4200, y: 470 },
  { x: 4480, y: 400 },
  { x: 4920, y: 475 },
  { x: 335, y: 610 },
  { x: 1000, y: 400 },
  { x: 1850, y: 390 },
  { x: 2740, y: 390 },
  { x: 3100, y: 500 },
  { x: 4320, y: 400 },
  { x: 5000, y: 400 },
];

const enchantedPitTemplates: LevelHazardDefinition[] = [
  { id: "pit-1", type: "pit", x: 650, y: 682, width: 150, height: 38, damage: 1 },
  { id: "pit-2", type: "pit", x: 1400, y: 682, width: 160, height: 38, damage: 1 },
  { id: "pit-3", type: "pit", x: 2300, y: 682, width: 160, height: 38, damage: 1 },
  { id: "pit-4", type: "pit", x: 3040, y: 682, width: 180, height: 38, damage: 1 },
  { id: "pit-5", type: "pit", x: 3900, y: 682, width: 170, height: 38, damage: 1 },
  { id: "pit-6", type: "pit", x: 4650, y: 682, width: 150, height: 38, damage: 1 },
];

const enchantedOffensiveHazardTemplates: LevelHazardDefinition[] = [
  { id: "thorns-1", type: "spike", x: 520, y: 635, width: 76, height: 25, damage: 1 },
  { id: "wisp-saw-1", type: "moving", x: 3650, y: 520, width: 34, height: 34, damage: 1, axis: "y", distance: 92, speed: 88 },
  { id: "thorns-2", type: "spike", x: 1280, y: 635, width: 82, height: 25, damage: 1 },
  { id: "wisp-saw-2", type: "moving", x: 2850, y: 520, width: 34, height: 34, damage: 1, axis: "x", distance: 118, speed: 102 },
  { id: "thorns-3", type: "spike", x: 2050, y: 635, width: 90, height: 25, damage: 1 },
  { id: "wisp-saw-3", type: "moving", x: 3350, y: 500, width: 34, height: 34, damage: 1, axis: "y", distance: 110, speed: 112 },
  { id: "thorns-4", type: "spike", x: 4450, y: 635, width: 94, height: 25, damage: 2 },
  { id: "wisp-saw-4", type: "moving", x: 1050, y: 500, width: 34, height: 34, damage: 2, axis: "x", distance: 126, speed: 122 },
  { id: "thorns-5", type: "spike", x: 2650, y: 635, width: 100, height: 25, damage: 2 },
  { id: "wisp-saw-5", type: "moving", x: 1800, y: 500, width: 36, height: 36, damage: 1, axis: "y", distance: 118, speed: 126 },
  { id: "wisp-saw-6", type: "moving", x: 2350, y: 540, width: 36, height: 36, damage: 1, axis: "y", distance: 96, speed: 132 },
  { id: "wisp-saw-7", type: "moving", x: 4950, y: 515, width: 38, height: 38, damage: 2, axis: "x", distance: 112, speed: 138 },
  { id: "wisp-saw-8", type: "moving", x: 725, y: 535, width: 38, height: 38, damage: 2, axis: "y", distance: 104, speed: 144 },
  { id: "wisp-saw-9", type: "moving", x: 4000, y: 525, width: 40, height: 40, damage: 2, axis: "y", distance: 112, speed: 150 },
];

const enchantedOffensiveHazardCount = [0, 2, 4, 5, 7, 9, 10, 11, 12, 13, 14];

function createEnchantedCoins(stageNumber: number): LevelCoinSpawn[] {
  const positions = stageNumber <= 5
    ? enchantedCoinPositions.slice(0, 13)
    : enchantedCoinPositions;
  const target = getPathCoinTarget(stageNumber);
  if (target < positions.length || target > positions.length * 3) {
    throw new Error(`Bosque encantado LV${stageNumber}: presupuesto de ORO fuera de capacidad`);
  }
  const values = positions.map((_, index) => 1 + ((index + stageNumber) % 3));
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

function createEnchantedHazards(stageNumber: number): LevelHazardDefinition[] {
  const prefix = `enchanted-l${stageNumber}`;
  const speedMultiplier = stageNumber <= 5 ? 1 : 1 + (stageNumber - 5) * 0.05;
  const distanceMultiplier = stageNumber <= 5 ? 1 : 1 + (stageNumber - 5) * 0.02;
  return [
    ...enchantedPitTemplates.map((hazard) => ({ ...hazard, id: `${prefix}-${hazard.id}` })),
    ...enchantedOffensiveHazardTemplates
      .slice(0, enchantedOffensiveHazardCount[stageNumber] ?? 0)
      .map((hazard) => ({
        ...hazard,
        id: `${prefix}-${hazard.id}`,
        speed: hazard.speed ? Math.round(hazard.speed * speedMultiplier) : undefined,
        distance: hazard.distance
          ? Math.round(hazard.distance * distanceMultiplier)
          : undefined,
      })),
  ];
}

export const levelDefinitions: Record<string, LevelDefinition> = {
  meadowOutpost: {
    id: "meadowOutpost",
    name: "Sendero I",
    stageNumber: 1,
    theme: "verdant-frontier",
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
    hazards: keepPitsAndHazards([
      { id: "pit-river-1", type: "pit", x: 560, y: 682, width: 140, height: 38, damage: 1 },
      { id: "pit-river-2", type: "pit", x: 1220, y: 682, width: 140, height: 38, damage: 1 },
      { id: "spikes-1", type: "spike", x: 1535, y: 635, width: 95, height: 25, damage: 1 },
      { id: "pit-river-3", type: "pit", x: 1980, y: 682, width: 160, height: 38, damage: 1 },
      { id: "pit-river-4", type: "pit", x: 2660, y: 682, width: 160, height: 38, damage: 1 },
      { id: "pit-river-4b", type: "pit", x: 3250, y: 682, width: 170, height: 38, damage: 1 },
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
    ], ["spikes-1", "moving-saw-1", "spikes-2", "moving-saw-2", "moving-saw-3"]),
    enemies: [
      { enemyId: "m0", x: 1765, y: 615, patrolDistance: 0 },
      { enemyId: "m1", x: 3650, y: 615, patrolDistance: 95 },
      { enemyId: "m0", x: 4440, y: 615, patrolDistance: 0 },
      { enemyId: "m2", x: 6980, y: 430, patrolDistance: 560, aggression: 0.9 },
      { enemyId: "m1", x: 7640, y: 615, patrolDistance: 120 },
      { enemyId: "m0", x: 8330, y: 615, patrolDistance: 0 },
    ],
    coins: [
      ...createPathCoinSpawns(1),
      { itemId: "forestGatePlan", x: 4120, y: 372 },
      { itemId: "fieldHook", x: 5960, y: 432 },
    ],
    healthPickups: [],
    rewardBox: { id: "reward-box-l1", x: 390, y: 642 },
    checkpoint: { id: "meadow-midpoint", x: 4300, y: 610 },
    goal: { x: 8530, y: 595 },
  },
};

levelDefinitions.meadowOutpost2 = {
  ...levelDefinitions.meadowOutpost,
  id: "meadowOutpost2",
  name: "Sendero II",
  stageNumber: 2,
  nextLevelId: "meadowOutpost3",
  timeLimitSeconds: 82,
  autoScrollSpeed: 52,
  hazards: keepPitsAndHazards([
    { id: "l2-pit-river-1", type: "pit", x: 560, y: 682, width: 140, height: 38, damage: 1 },
    { id: "l2-pit-river-2", type: "pit", x: 1220, y: 682, width: 140, height: 38, damage: 1 },
    { id: "l2-spikes-1", type: "spike", x: 1535, y: 635, width: 110, height: 25, damage: 1 },
    { id: "l2-pit-river-3", type: "pit", x: 1980, y: 682, width: 160, height: 38, damage: 1 },
    { id: "l2-moving-saw-1", type: "moving", x: 2410, y: 612, width: 34, height: 34, damage: 1, axis: "x", distance: 150, speed: 88 },
    { id: "l2-pit-river-4", type: "pit", x: 2660, y: 682, width: 160, height: 38, damage: 1 },
    { id: "l2-pit-river-4b", type: "pit", x: 3250, y: 682, width: 170, height: 38, damage: 1 },
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
  ], ["l2-spikes-1", "l2-moving-saw-1", "l2-moving-saw-2", "l2-spikes-2", "l2-moving-saw-3", "l2-spikes-4", "l2-moving-saw-5"]),
  enemies: [
    { enemyId: "m0", x: 1765, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 2235, y: 615, patrolDistance: 120 },
    { enemyId: "m0", x: 3150, y: 615, patrolDistance: 0 },
    { enemyId: "m2", x: 3650, y: 420, patrolDistance: 520, aggression: 1.08 },
    { enemyId: "m1", x: 4440, y: 615, patrolDistance: 130 },
    { enemyId: "m2", x: 4800, y: 410, patrolDistance: 540, aggression: 1.12 },
    { enemyId: "m0", x: 5700, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 6500, y: 615, patrolDistance: 125 },
    { enemyId: "m2", x: 8330, y: 425, patrolDistance: 420, aggression: 1.22 },
  ],
  coins: [
    ...createPathCoinSpawns(2),
    ...levelDefinitions.meadowOutpost.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
    { itemId: "oldIronKey", x: 2410, y: 566 },
    { itemId: "trainingBlade", x: 7085, y: 468 },
  ],
  healthPickups: [],
  rewardBox: { id: "reward-box-l2", x: 1080, y: 462 },
  checkpoint: { id: "meadow-ii-midpoint", x: 4300, y: 610 },
};

levelDefinitions.meadowOutpost3 = {
  ...levelDefinitions.meadowOutpost2,
  id: "meadowOutpost3",
  name: "Sendero III",
  stageNumber: 3,
  nextLevelId: "meadowOutpost4",
  timeLimitSeconds: 74,
  autoScrollSpeed: 62,
  hazards: keepPitsAndHazards([
    { id: "l3-pit-river-1", type: "pit", x: 560, y: 682, width: 150, height: 38, damage: 1 },
    { id: "l3-pit-river-2", type: "pit", x: 1220, y: 682, width: 150, height: 38, damage: 1 },
    { id: "l3-spikes-1", type: "spike", x: 1515, y: 635, width: 125, height: 25, damage: 1 },
    { id: "l3-pit-river-3", type: "pit", x: 1980, y: 682, width: 170, height: 38, damage: 1 },
    { id: "l3-moving-saw-1", type: "moving", x: 2390, y: 612, width: 34, height: 34, damage: 1, axis: "x", distance: 170, speed: 105 },
    { id: "l3-pit-river-4", type: "pit", x: 2660, y: 682, width: 170, height: 38, damage: 1 },
    { id: "l3-pit-river-4b", type: "pit", x: 3250, y: 682, width: 170, height: 38, damage: 1 },
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
  ], ["l3-spikes-1", "l3-moving-saw-1", "l3-moving-saw-2", "l3-spikes-2", "l3-spikes-3", "l3-moving-saw-3", "l3-moving-saw-4", "l3-spikes-4", "l3-moving-saw-5", "l3-spikes-5"]),
  enemies: [
    { enemyId: "m0", x: 1765, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 2235, y: 615, patrolDistance: 135 },
    { enemyId: "m2", x: 2830, y: 420, patrolDistance: 440, aggression: 1.24 },
    { enemyId: "m2", x: 3650, y: 420, patrolDistance: 560, aggression: 1.28 },
    { enemyId: "m1", x: 4440, y: 615, patrolDistance: 145 },
    { enemyId: "m2", x: 4800, y: 410, patrolDistance: 580, aggression: 1.34 },
    { enemyId: "m0", x: 5700, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 6500, y: 615, patrolDistance: 140 },
    { enemyId: "m2", x: 6900, y: 430, patrolDistance: 620, aggression: 1.42 },
    { enemyId: "m1", x: 7800, y: 615, patrolDistance: 150 },
    { enemyId: "m0", x: 8420, y: 615, patrolDistance: 0 },
  ],
  coins: [
    ...createPathCoinSpawns(3),
    ...levelDefinitions.meadowOutpost2.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
    { itemId: "smallHealthPotion", x: 6785, y: 420 },
  ],
  healthPickups: [{ x: 6550, y: 452 }],
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
    { enemyId: "m1", x: 4180, y: 615, patrolDistance: 155 },
    { enemyId: "m2", x: 7420, y: 405, patrolDistance: 520, aggression: 1.62 },
  ],
  coins: [
    ...createPathCoinSpawns(4),
    ...levelDefinitions.meadowOutpost3.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
  ],
  healthPickups: [{ x: 6865, y: 612 }],
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
    { id: "l5-platform-spikes", type: "spike", x: 8120, y: 635, width: 138, height: 25, damage: 2 },
  ],
  enemies: [
    ...increaseEnemyPressure(levelDefinitions.meadowOutpost4.enemies, 1.16),
    { enemyId: "m1", x: 3750, y: 615, patrolDistance: 170 },
    { enemyId: "m2", x: 6120, y: 390, patrolDistance: 560, aggression: 1.82 },
  ],
  coins: [
    ...createPathCoinSpawns(5),
    ...levelDefinitions.meadowOutpost4.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
  ],
  healthPickups: [{ x: 5835, y: 612 }],
  rewardBox: { id: "reward-box-l5", x: 5900, y: 462 },
  checkpoint: { id: "meadow-v-midpoint", x: 4300, y: 610 },
};

levelDefinitions.meadowOutpost6 = {
  ...levelDefinitions.meadowOutpost5,
  id: "meadowOutpost6",
  name: "Piedras Errantes III",
  stageNumber: 6,
  nextLevelId: "meadowOutpost7",
  timeLimitSeconds: 62,
  autoScrollSpeed: 98,
  m3Intelligence: 0.55,
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
  hazards: createColossusHazards([
    ...increaseHazardPressure(levelDefinitions.meadowOutpost5.hazards, "l6-hazard", 1.17, 1.08),
    { id: "l6-lethal-saw-1", type: "moving", x: 1765, y: 420, width: 38, height: 38, damage: 3, axis: "y", distance: 124, speed: 154 },
    { id: "l6-lethal-saw-2", type: "moving", x: 4980, y: 430, width: 38, height: 38, damage: 3, axis: "x", distance: 150, speed: 164 },
    { id: "l6-heavy-spikes", type: "spike", x: 7160, y: 635, width: 152, height: 25, damage: 2 },
  ], "l6-colossus"),
  enemies: [
    { enemyId: "m1", x: 1500, y: 615, patrolDistance: 150 },
    { enemyId: "m3", x: 3150, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 4440, y: 405, patrolDistance: 500, aggression: 1.55 },
    { enemyId: "m3", x: 5700, y: 598, patrolDistance: 0 },
    { enemyId: "m1", x: 7640, y: 615, patrolDistance: 165 },
    { enemyId: "m3", x: 8250, y: 598, patrolDistance: 0 },
  ],
  coins: [
    ...createPathCoinSpawns(6),
    ...levelDefinitions.meadowOutpost5.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
  ],
  healthPickups: [{ x: 6435, y: 612 }],
  rewardBox: { id: "reward-box-l6", x: 6545, y: 482 },
  checkpoint: { id: "meadow-vi-midpoint", x: 4300, y: 610 },
};

levelDefinitions.meadowOutpost7 = {
  ...levelDefinitions.meadowOutpost6,
  id: "meadowOutpost7",
  name: "Caceria del Coloso I",
  stageNumber: 7,
  nextLevelId: "meadowOutpost8",
  timeLimitSeconds: 64,
  autoScrollSpeed: 104,
  m3Intelligence: 0.65,
  platforms: addPlatformMovement(levelDefinitions.meadowOutpost.platforms, [
    { x: 770, axis: "y", distance: 78, speed: 82 },
    { x: 1700, axis: "x", distance: 108, speed: 88 },
    { x: 3175, axis: "y", distance: 94, speed: 90 },
    { x: 4580, axis: "x", distance: 116, speed: 94 },
    { x: 6235, axis: "y", distance: 102, speed: 96 },
    { x: 7805, axis: "x", distance: 126, speed: 100 },
  ]),
  hazards: createColossusHazards(levelDefinitions.meadowOutpost6.hazards, "l7-colossus", 1.06),
  enemies: [
    { enemyId: "m3", x: 850, y: 598, patrolDistance: 0 },
    { enemyId: "m1", x: 2440, y: 615, patrolDistance: 150 },
    { enemyId: "m3", x: 3500, y: 598, patrolDistance: 0 },
    { enemyId: "m3", x: 5250, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 6285, y: 405, patrolDistance: 500, aggression: 1.48 },
    { enemyId: "m3", x: 6900, y: 598, patrolDistance: 0 },
  ],
  coins: [
    ...createPathCoinSpawns(7),
    ...levelDefinitions.meadowOutpost6.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
  ],
  healthPickups: [{ x: 5775, y: 612 }],
  rewardBox: { id: "reward-box-l7", x: 1700, y: 462 },
  checkpoint: { id: "colossus-i-midpoint", x: 4300, y: 610 },
};

levelDefinitions.meadowOutpost8 = {
  ...levelDefinitions.meadowOutpost7,
  id: "meadowOutpost8",
  name: "Caceria del Coloso II",
  stageNumber: 8,
  nextLevelId: "meadowOutpost9",
  timeLimitSeconds: 62,
  autoScrollSpeed: 110,
  m3Intelligence: 0.75,
  platforms: addPlatformMovement(levelDefinitions.meadowOutpost.platforms, [
    { x: 270, axis: "x", distance: 92, speed: 88 },
    { x: 1010, axis: "y", distance: 88, speed: 86 },
    { x: 2570, axis: "x", distance: 116, speed: 94 },
    { x: 4025, axis: "y", distance: 104, speed: 94 },
    { x: 5550, axis: "x", distance: 122, speed: 100 },
    { x: 7175, axis: "y", distance: 112, speed: 102 },
    { x: 8200, axis: "x", distance: 130, speed: 106 },
  ]),
  hazards: createColossusHazards(levelDefinitions.meadowOutpost6.hazards, "l8-colossus", 1.12),
  enemies: [
    { enemyId: "m3", x: 1430, y: 598, patrolDistance: 0 },
    { enemyId: "m3", x: 2960, y: 598, patrolDistance: 0 },
    { enemyId: "m1", x: 3770, y: 615, patrolDistance: 165 },
    { enemyId: "m3", x: 5200, y: 598, patrolDistance: 0 },
    { enemyId: "m3", x: 6280, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 6980, y: 405, patrolDistance: 480, aggression: 1.54 },
    { enemyId: "m3", x: 8250, y: 598, patrolDistance: 0 },
  ],
  coins: [
    ...createPathCoinSpawns(8),
    ...levelDefinitions.meadowOutpost7.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
  ],
  healthPickups: [{ x: 6455, y: 612 }],
  rewardBox: { id: "reward-box-l8", x: 4025, y: 392 },
  checkpoint: { id: "colossus-ii-midpoint", x: 4300, y: 610 },
};

levelDefinitions.meadowOutpost9 = {
  ...levelDefinitions.meadowOutpost8,
  id: "meadowOutpost9",
  name: "Caceria del Coloso III",
  stageNumber: 9,
  nextLevelId: "meadowOutpost10",
  timeLimitSeconds: 60,
  autoScrollSpeed: 116,
  m3Intelligence: 0.85,
  platforms: addPlatformMovement(levelDefinitions.meadowOutpost.platforms, [
    { x: 770, axis: "x", distance: 96, speed: 94 },
    { x: 1700, axis: "y", distance: 94, speed: 92 },
    { x: 3175, axis: "x", distance: 122, speed: 100 },
    { x: 4910, axis: "y", distance: 108, speed: 100 },
    { x: 6485, axis: "x", distance: 132, speed: 106 },
    { x: 7805, axis: "y", distance: 116, speed: 108 },
  ]),
  hazards: createColossusHazards(levelDefinitions.meadowOutpost6.hazards, "l9-colossus", 1.18),
  enemies: [
    { enemyId: "m3", x: 1500, y: 598, patrolDistance: 0 },
    { enemyId: "m3", x: 2440, y: 598, patrolDistance: 0 },
    { enemyId: "m3", x: 3550, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 4320, y: 405, patrolDistance: 500, aggression: 1.58 },
    { enemyId: "m3", x: 5600, y: 598, patrolDistance: 0 },
    { enemyId: "m3", x: 6900, y: 598, patrolDistance: 0 },
    { enemyId: "m1", x: 7650, y: 615, patrolDistance: 180 },
    { enemyId: "m3", x: 8250, y: 598, patrolDistance: 0 },
  ],
  coins: [
    ...createPathCoinSpawns(9),
    ...levelDefinitions.meadowOutpost8.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
  ],
  healthPickups: [{ x: 6455, y: 612 }],
  rewardBox: { id: "reward-box-l9", x: 5840, y: 462 },
  checkpoint: { id: "colossus-iii-midpoint", x: 4300, y: 610 },
};

levelDefinitions.meadowOutpost10 = {
  ...levelDefinitions.meadowOutpost9,
  id: "meadowOutpost10",
  name: "Caceria del Coloso IV",
  stageNumber: 10,
  nextLevelId: undefined,
  timeLimitSeconds: 58,
  autoScrollSpeed: 122,
  m3Intelligence: 0.95,
  platforms: addPlatformMovement(levelDefinitions.meadowOutpost.platforms, [
    { x: 270, axis: "y", distance: 94, speed: 96 },
    { x: 1010, axis: "x", distance: 104, speed: 98 },
    { x: 2570, axis: "y", distance: 104, speed: 102 },
    { x: 4025, axis: "x", distance: 132, speed: 106 },
    { x: 5550, axis: "y", distance: 114, speed: 108 },
    { x: 6900, axis: "x", distance: 138, speed: 112 },
    { x: 8200, axis: "y", distance: 122, speed: 114 },
  ]),
  hazards: createColossusHazards(levelDefinitions.meadowOutpost6.hazards, "l10-colossus", 1.25),
  enemies: [
    { enemyId: "m3", x: 1510, y: 598, patrolDistance: 0 },
    { enemyId: "m3", x: 2300, y: 598, patrolDistance: 0 },
    { enemyId: "m3", x: 3150, y: 598, patrolDistance: 0 },
    { enemyId: "m3", x: 4250, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 4600, y: 395, patrolDistance: 520, aggression: 1.62 },
    { enemyId: "m3", x: 5600, y: 598, patrolDistance: 0 },
    { enemyId: "m3", x: 6900, y: 598, patrolDistance: 0 },
    { enemyId: "m1", x: 7650, y: 615, patrolDistance: 190 },
    { enemyId: "m3", x: 8250, y: 598, patrolDistance: 0 },
  ],
  coins: [
    ...createPathCoinSpawns(10),
    ...levelDefinitions.meadowOutpost9.coins.filter((spawn) => spawn.itemId !== "bronzeCoin"),
  ],
  healthPickups: [{ x: 5795, y: 612 }],
  rewardBox: { id: "reward-box-l10", x: 8200, y: 517 },
  checkpoint: { id: "colossus-iv-midpoint", x: 4300, y: 610 },
};

levelDefinitions.enchantedGrove1 = {
  id: "enchantedGrove1",
  name: "Umbral encantado",
  stageNumber: 1,
  theme: "enchanted-forest",
  nextLevelId: "enchantedGrove2",
  worldWidth: 5200,
  timeLimitSeconds: 72,
  autoScrollSpeed: 52,
  playerStart: { x: 110, y: 548 },
  platforms: [
    { x: 0, y: 660, width: 650, height: 60 },
    { x: 800, y: 660, width: 600, height: 60 },
    { x: 1560, y: 660, width: 740, height: 60 },
    { x: 2460, y: 660, width: 580, height: 60 },
    { x: 3220, y: 660, width: 680, height: 60 },
    { x: 4070, y: 660, width: 580, height: 60 },
    { x: 4800, y: 660, width: 400, height: 60 },
    { x: 320, y: 545, width: 190, height: 28 },
    { x: 880, y: 520, width: 170, height: 28 },
    { x: 1150, y: 445, width: 190, height: 28 },
    { x: 1650, y: 520, width: 180, height: 28 },
    { x: 1960, y: 450, width: 185, height: 28 },
    { x: 2550, y: 520, width: 185, height: 28 },
    { x: 2820, y: 440, width: 200, height: 28 },
    { x: 3310, y: 530, width: 180, height: 28 },
    { x: 3590, y: 455, width: 185, height: 28 },
    { x: 4130, y: 520, width: 190, height: 28 },
    { x: 4400, y: 450, width: 190, height: 28 },
    { x: 4850, y: 525, width: 190, height: 28 },
  ],
  hazards: createEnchantedHazards(1),
  enemies: [
    { enemyId: "m0", x: 1180, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 1900, y: 615, patrolDistance: 120 },
    { enemyId: "m0", x: 2700, y: 615, patrolDistance: 0 },
    { enemyId: "m2", x: 3480, y: 390, patrolDistance: 520, aggression: 0.9 },
    { enemyId: "m1", x: 4300, y: 615, patrolDistance: 135 },
  ],
  coins: createEnchantedCoins(1),
  healthPickups: [],
  rewardBox: { id: "reward-box-enchanted-l1", x: 1040, y: 642 },
  checkpoint: { id: "enchanted-grove-midpoint", x: 2700, y: 610 },
  goal: { x: 5090, y: 595 },
};

levelDefinitions.enchantedGrove2 = {
  ...levelDefinitions.enchantedGrove1,
  id: "enchantedGrove2",
  name: "Raices despiertas",
  stageNumber: 2,
  nextLevelId: "enchantedGrove3",
  timeLimitSeconds: 69,
  autoScrollSpeed: 60,
  hazards: createEnchantedHazards(2),
  enemies: [
    { enemyId: "m0", x: 930, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 1650, y: 615, patrolDistance: 145 },
    { enemyId: "m2", x: 2050, y: 380, patrolDistance: 540, aggression: 0.98 },
    { enemyId: "m0", x: 2700, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 3300, y: 615, patrolDistance: 150 },
    { enemyId: "m2", x: 3900, y: 370, patrolDistance: 580, aggression: 1.02 },
    { enemyId: "m1", x: 4400, y: 615, patrolDistance: 155 },
  ],
  coins: createEnchantedCoins(2),
  healthPickups: [],
  rewardBox: { id: "reward-box-enchanted-l2", x: 1780, y: 642 },
  checkpoint: { id: "enchanted-grove-l2-midpoint", x: 2700, y: 610 },
};

levelDefinitions.enchantedGrove3 = {
  ...levelDefinitions.enchantedGrove2,
  id: "enchantedGrove3",
  name: "Dosel vigilante",
  stageNumber: 3,
  nextLevelId: "enchantedGrove4",
  timeLimitSeconds: 66,
  autoScrollSpeed: 68,
  m3Intelligence: 0.5,
  platforms: addPlatformMovement(levelDefinitions.enchantedGrove1.platforms, [
    { x: 1150, axis: "y", distance: 72, speed: 76 },
    { x: 2550, axis: "x", distance: 92, speed: 82 },
    { x: 4130, axis: "y", distance: 82, speed: 80 },
  ]),
  hazards: createEnchantedHazards(3),
  enemies: [
    { enemyId: "m0", x: 1000, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 1750, y: 615, patrolDistance: 165 },
    { enemyId: "m2", x: 2200, y: 355, patrolDistance: 570, aggression: 1.06 },
    { enemyId: "e2m3", x: 2600, y: 598, patrolDistance: 0 },
    { enemyId: "m1", x: 2950, y: 615, patrolDistance: 165 },
    { enemyId: "m2", x: 3450, y: 365, patrolDistance: 610, aggression: 1.1 },
    { enemyId: "m1", x: 3500, y: 615, patrolDistance: 175 },
    { enemyId: "m0", x: 4250, y: 615, patrolDistance: 0 },
    { enemyId: "m2", x: 4750, y: 350, patrolDistance: 620, aggression: 1.12 },
  ],
  coins: createEnchantedCoins(3),
  healthPickups: [{ x: 3820, y: 612 }],
  rewardBox: { id: "reward-box-enchanted-l3", x: 3340, y: 642 },
  checkpoint: { id: "enchanted-grove-l3-midpoint", x: 2700, y: 610 },
};

levelDefinitions.enchantedGrove4 = {
  ...levelDefinitions.enchantedGrove3,
  id: "enchantedGrove4",
  name: "Senderos cambiantes",
  stageNumber: 4,
  nextLevelId: "enchantedGrove5",
  timeLimitSeconds: 63,
  autoScrollSpeed: 78,
  m3Intelligence: 0.65,
  platforms: addPlatformMovement(levelDefinitions.enchantedGrove1.platforms, [
    { x: 880, axis: "x", distance: 78, speed: 86 },
    { x: 1650, axis: "y", distance: 84, speed: 88 },
    { x: 2550, axis: "x", distance: 104, speed: 94 },
    { x: 3590, axis: "y", distance: 92, speed: 92 },
    { x: 4400, axis: "x", distance: 98, speed: 96 },
  ]),
  hazards: createEnchantedHazards(4),
  enemies: [
    { enemyId: "m0", x: 900, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 1150, y: 615, patrolDistance: 175 },
    { enemyId: "m2", x: 1500, y: 360, patrolDistance: 590, aggression: 1.14 },
    { enemyId: "m1", x: 1800, y: 615, patrolDistance: 180 },
    { enemyId: "e2m3", x: 2150, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 2500, y: 350, patrolDistance: 620, aggression: 1.16 },
    { enemyId: "m1", x: 2750, y: 615, patrolDistance: 185 },
    { enemyId: "m2", x: 3250, y: 365, patrolDistance: 640, aggression: 1.18 },
    { enemyId: "e2m3", x: 3750, y: 598, patrolDistance: 0 },
    { enemyId: "m0", x: 4250, y: 615, patrolDistance: 0 },
    { enemyId: "m2", x: 4750, y: 350, patrolDistance: 650, aggression: 1.2 },
  ],
  coins: createEnchantedCoins(4),
  healthPickups: [{ x: 3520, y: 612 }],
  rewardBox: { id: "reward-box-enchanted-l4", x: 4200, y: 642 },
  checkpoint: { id: "enchanted-grove-l4-midpoint", x: 2700, y: 610 },
};

levelDefinitions.enchantedGrove5 = {
  ...levelDefinitions.enchantedGrove4,
  id: "enchantedGrove5",
  name: "Corazon del bosque",
  stageNumber: 5,
  nextLevelId: "enchantedGrove6",
  timeLimitSeconds: 60,
  autoScrollSpeed: 88,
  m3Intelligence: 0.8,
  platforms: addPlatformMovement(levelDefinitions.enchantedGrove1.platforms, [
    { x: 320, axis: "y", distance: 72, speed: 94 },
    { x: 880, axis: "x", distance: 88, speed: 98 },
    { x: 1650, axis: "y", distance: 96, speed: 100 },
    { x: 2550, axis: "x", distance: 116, speed: 104 },
    { x: 3310, axis: "y", distance: 94, speed: 104 },
    { x: 4130, axis: "x", distance: 108, speed: 108 },
    { x: 4850, axis: "y", distance: 88, speed: 110 },
  ]),
  hazards: createEnchantedHazards(5),
  enemies: [
    { enemyId: "m0", x: 900, y: 615, patrolDistance: 0 },
    { enemyId: "m1", x: 1200, y: 615, patrolDistance: 190 },
    { enemyId: "m2", x: 1450, y: 350, patrolDistance: 620, aggression: 1.24 },
    { enemyId: "m1", x: 1700, y: 615, patrolDistance: 195 },
    { enemyId: "e2m3", x: 2180, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 2450, y: 345, patrolDistance: 650, aggression: 1.28 },
    { enemyId: "m1", x: 2750, y: 615, patrolDistance: 205 },
    { enemyId: "m2", x: 3150, y: 360, patrolDistance: 670, aggression: 1.3 },
    { enemyId: "m1", x: 3450, y: 615, patrolDistance: 210 },
    { enemyId: "e2m3", x: 3750, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 4050, y: 350, patrolDistance: 690, aggression: 1.33 },
    { enemyId: "e2m3", x: 4350, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 4800, y: 345, patrolDistance: 700, aggression: 1.36 },
  ],
  coins: createEnchantedCoins(5),
  healthPickups: [{ x: 3850, y: 612 }],
  rewardBox: { id: "reward-box-enchanted-l5", x: 4920, y: 642 },
  checkpoint: { id: "enchanted-grove-l5-midpoint", x: 2700, y: 610 },
};

levelDefinitions.enchantedGrove6 = {
  ...levelDefinitions.enchantedGrove5,
  id: "enchantedGrove6",
  name: "Santuario quebrado",
  stageNumber: 6,
  nextLevelId: "enchantedGrove7",
  timeLimitSeconds: 58,
  autoScrollSpeed: 100,
  m3Intelligence: 0.84,
  platforms: addPlatformMovement(levelDefinitions.enchantedGrove1.platforms, [
    { x: 320, axis: "x", distance: 82, speed: 100 },
    { x: 880, axis: "y", distance: 88, speed: 102 },
    { x: 1150, axis: "x", distance: 98, speed: 104 },
    { x: 1650, axis: "y", distance: 96, speed: 106 },
    { x: 1960, axis: "x", distance: 104, speed: 108 },
    { x: 2550, axis: "y", distance: 102, speed: 110 },
    { x: 2820, axis: "x", distance: 112, speed: 112 },
    { x: 3310, axis: "y", distance: 108, speed: 114 },
  ]),
  hazards: createEnchantedHazards(6),
  enemies: [
    { enemyId: "m0", x: 930, y: 615, patrolDistance: 0 },
    { enemyId: "e2m3", x: 1150, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 1450, y: 350, patrolDistance: 650, aggression: 1.38 },
    { enemyId: "m1", x: 1650, y: 615, patrolDistance: 210 },
    { enemyId: "e2m3", x: 2180, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 2450, y: 345, patrolDistance: 680, aggression: 1.42 },
    { enemyId: "m1", x: 2950, y: 615, patrolDistance: 215 },
    { enemyId: "m2", x: 3150, y: 360, patrolDistance: 690, aggression: 1.44 },
    { enemyId: "e2m3", x: 3500, y: 598, patrolDistance: 0 },
    { enemyId: "m0", x: 3850, y: 615, patrolDistance: 0 },
    { enemyId: "m2", x: 4150, y: 350, patrolDistance: 710, aggression: 1.46 },
    { enemyId: "m1", x: 4300, y: 615, patrolDistance: 220 },
    { enemyId: "e2m3", x: 4600, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 4750, y: 345, patrolDistance: 720, aggression: 1.48 },
  ],
  coins: createEnchantedCoins(6),
  healthPickups: [{ x: 3780, y: 360 }],
  rewardBox: { id: "reward-box-enchanted-l6", x: 1220, y: 422 },
  checkpoint: { id: "enchanted-grove-l6-midpoint", x: 2700, y: 610 },
};

levelDefinitions.enchantedGrove7 = {
  ...levelDefinitions.enchantedGrove6,
  id: "enchantedGrove7",
  name: "Caceria esmeralda I",
  stageNumber: 7,
  nextLevelId: "enchantedGrove8",
  timeLimitSeconds: 56,
  autoScrollSpeed: 108,
  m3Intelligence: 0.88,
  platforms: addPlatformMovement(levelDefinitions.enchantedGrove1.platforms, [
    { x: 320, axis: "y", distance: 86, speed: 104 },
    { x: 880, axis: "x", distance: 94, speed: 106 },
    { x: 1150, axis: "y", distance: 96, speed: 108 },
    { x: 1650, axis: "x", distance: 104, speed: 110 },
    { x: 1960, axis: "y", distance: 100, speed: 112 },
    { x: 2550, axis: "x", distance: 112, speed: 114 },
    { x: 2820, axis: "y", distance: 106, speed: 116 },
    { x: 3310, axis: "x", distance: 118, speed: 118 },
    { x: 3590, axis: "y", distance: 112, speed: 120 },
  ]),
  hazards: createEnchantedHazards(7),
  enemies: [
    { enemyId: "e2m3", x: 930, y: 598, patrolDistance: 0 },
    { enemyId: "m1", x: 1150, y: 615, patrolDistance: 215 },
    { enemyId: "m2", x: 1450, y: 350, patrolDistance: 660, aggression: 1.42 },
    { enemyId: "e2m3", x: 1900, y: 598, patrolDistance: 0 },
    { enemyId: "m0", x: 2180, y: 615, patrolDistance: 0 },
    { enemyId: "m2", x: 2450, y: 345, patrolDistance: 690, aggression: 1.46 },
    { enemyId: "e2m3", x: 2550, y: 598, patrolDistance: 0 },
    { enemyId: "m1", x: 2950, y: 615, patrolDistance: 220 },
    { enemyId: "m2", x: 3150, y: 360, patrolDistance: 700, aggression: 1.48 },
    { enemyId: "e2m3", x: 3500, y: 598, patrolDistance: 0 },
    { enemyId: "m0", x: 3850, y: 615, patrolDistance: 0 },
    { enemyId: "m2", x: 4150, y: 350, patrolDistance: 720, aggression: 1.5 },
    { enemyId: "m1", x: 4300, y: 615, patrolDistance: 225 },
    { enemyId: "e2m3", x: 4600, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 4750, y: 345, patrolDistance: 730, aggression: 1.52 },
  ],
  coins: createEnchantedCoins(7),
  healthPickups: [{ x: 3780, y: 360 }],
  rewardBox: { id: "reward-box-enchanted-l7", x: 1980, y: 422 },
  checkpoint: { id: "enchanted-grove-l7-midpoint", x: 2700, y: 610 },
};

levelDefinitions.enchantedGrove8 = {
  ...levelDefinitions.enchantedGrove7,
  id: "enchantedGrove8",
  name: "Caceria esmeralda II",
  stageNumber: 8,
  nextLevelId: "enchantedGrove9",
  timeLimitSeconds: 54,
  autoScrollSpeed: 116,
  m3Intelligence: 0.92,
  platforms: addPlatformMovement(levelDefinitions.enchantedGrove1.platforms, [
    { x: 320, axis: "x", distance: 90, speed: 108 },
    { x: 880, axis: "y", distance: 96, speed: 110 },
    { x: 1150, axis: "x", distance: 104, speed: 112 },
    { x: 1650, axis: "y", distance: 102, speed: 114 },
    { x: 1960, axis: "x", distance: 110, speed: 116 },
    { x: 2550, axis: "y", distance: 108, speed: 118 },
    { x: 2820, axis: "x", distance: 118, speed: 120 },
    { x: 3310, axis: "y", distance: 114, speed: 122 },
    { x: 3590, axis: "x", distance: 122, speed: 124 },
    { x: 4130, axis: "y", distance: 118, speed: 126 },
  ]),
  hazards: createEnchantedHazards(8),
  enemies: [
    { enemyId: "e2m3", x: 930, y: 598, patrolDistance: 0 },
    { enemyId: "m1", x: 1150, y: 615, patrolDistance: 220 },
    { enemyId: "m2", x: 1450, y: 350, patrolDistance: 670, aggression: 1.46 },
    { enemyId: "e2m3", x: 1650, y: 598, patrolDistance: 0 },
    { enemyId: "m0", x: 1900, y: 615, patrolDistance: 0 },
    { enemyId: "e2m3", x: 2180, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 2450, y: 345, patrolDistance: 700, aggression: 1.5 },
    { enemyId: "m1", x: 2550, y: 615, patrolDistance: 225 },
    { enemyId: "e2m3", x: 2950, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 3150, y: 360, patrolDistance: 710, aggression: 1.52 },
    { enemyId: "m1", x: 3500, y: 615, patrolDistance: 230 },
    { enemyId: "e2m3", x: 3850, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 4150, y: 350, patrolDistance: 730, aggression: 1.54 },
    { enemyId: "m0", x: 4300, y: 615, patrolDistance: 0 },
    { enemyId: "e2m3", x: 4600, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 4750, y: 345, patrolDistance: 740, aggression: 1.56 },
  ],
  coins: createEnchantedCoins(8),
  healthPickups: [{ x: 3780, y: 360 }],
  rewardBox: { id: "reward-box-enchanted-l8", x: 2860, y: 422 },
  checkpoint: { id: "enchanted-grove-l8-midpoint", x: 2700, y: 610 },
};

levelDefinitions.enchantedGrove9 = {
  ...levelDefinitions.enchantedGrove8,
  id: "enchantedGrove9",
  name: "Caceria esmeralda III",
  stageNumber: 9,
  nextLevelId: "enchantedGrove10",
  timeLimitSeconds: 52,
  autoScrollSpeed: 124,
  m3Intelligence: 0.96,
  platforms: addPlatformMovement(levelDefinitions.enchantedGrove1.platforms, [
    { x: 320, axis: "y", distance: 94, speed: 112 },
    { x: 880, axis: "x", distance: 102, speed: 114 },
    { x: 1150, axis: "y", distance: 108, speed: 116 },
    { x: 1650, axis: "x", distance: 110, speed: 118 },
    { x: 1960, axis: "y", distance: 112, speed: 120 },
    { x: 2550, axis: "x", distance: 118, speed: 122 },
    { x: 2820, axis: "y", distance: 116, speed: 124 },
    { x: 3310, axis: "x", distance: 124, speed: 126 },
    { x: 3590, axis: "y", distance: 120, speed: 128 },
    { x: 4130, axis: "x", distance: 128, speed: 130 },
    { x: 4400, axis: "y", distance: 124, speed: 132 },
  ]),
  hazards: createEnchantedHazards(9),
  enemies: [
    { enemyId: "e2m3", x: 930, y: 598, patrolDistance: 0 },
    { enemyId: "m1", x: 1150, y: 615, patrolDistance: 225 },
    { enemyId: "m2", x: 1450, y: 350, patrolDistance: 680, aggression: 1.5 },
    { enemyId: "e2m3", x: 1650, y: 598, patrolDistance: 0 },
    { enemyId: "m0", x: 1900, y: 615, patrolDistance: 0 },
    { enemyId: "e2m3", x: 2180, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 2450, y: 345, patrolDistance: 710, aggression: 1.54 },
    { enemyId: "e2m3", x: 2550, y: 598, patrolDistance: 0 },
    { enemyId: "m1", x: 2950, y: 615, patrolDistance: 230 },
    { enemyId: "m2", x: 3150, y: 360, patrolDistance: 720, aggression: 1.56 },
    { enemyId: "e2m3", x: 3450, y: 598, patrolDistance: 0 },
    { enemyId: "m0", x: 3750, y: 615, patrolDistance: 0 },
    { enemyId: "e2m3", x: 3850, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 4150, y: 350, patrolDistance: 740, aggression: 1.58 },
    { enemyId: "m1", x: 4300, y: 615, patrolDistance: 235 },
    { enemyId: "e2m3", x: 4600, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 4750, y: 345, patrolDistance: 750, aggression: 1.6 },
  ],
  coins: createEnchantedCoins(9),
  healthPickups: [{ x: 3780, y: 360 }],
  rewardBox: { id: "reward-box-enchanted-l9", x: 4160, y: 502 },
  checkpoint: { id: "enchanted-grove-l9-midpoint", x: 2700, y: 610 },
};

levelDefinitions.enchantedGrove10 = {
  ...levelDefinitions.enchantedGrove9,
  id: "enchantedGrove10",
  name: "Corazon ancestral",
  stageNumber: 10,
  nextLevelId: undefined,
  timeLimitSeconds: 50,
  autoScrollSpeed: 132,
  m3Intelligence: 1,
  platforms: addPlatformMovement(levelDefinitions.enchantedGrove1.platforms, [
    { x: 320, axis: "x", distance: 98, speed: 116 },
    { x: 880, axis: "y", distance: 106, speed: 118 },
    { x: 1150, axis: "x", distance: 112, speed: 120 },
    { x: 1650, axis: "y", distance: 114, speed: 122 },
    { x: 1960, axis: "x", distance: 118, speed: 124 },
    { x: 2550, axis: "y", distance: 122, speed: 126 },
    { x: 2820, axis: "x", distance: 120, speed: 128 },
    { x: 3310, axis: "y", distance: 128, speed: 130 },
    { x: 3590, axis: "x", distance: 124, speed: 132 },
    { x: 4130, axis: "y", distance: 132, speed: 134 },
    { x: 4400, axis: "x", distance: 128, speed: 136 },
    { x: 4850, axis: "y", distance: 126, speed: 138 },
  ]),
  hazards: createEnchantedHazards(10),
  enemies: [
    { enemyId: "e2m3", x: 930, y: 598, patrolDistance: 0 },
    { enemyId: "m1", x: 1150, y: 615, patrolDistance: 230 },
    { enemyId: "m2", x: 1450, y: 350, patrolDistance: 690, aggression: 1.54 },
    { enemyId: "e2m3", x: 1650, y: 598, patrolDistance: 0 },
    { enemyId: "m0", x: 1900, y: 615, patrolDistance: 0 },
    { enemyId: "e2m3", x: 2180, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 2450, y: 345, patrolDistance: 720, aggression: 1.58 },
    { enemyId: "e2m3", x: 2550, y: 598, patrolDistance: 0 },
    { enemyId: "m1", x: 2950, y: 615, patrolDistance: 235 },
    { enemyId: "m2", x: 3150, y: 360, patrolDistance: 730, aggression: 1.6 },
    { enemyId: "e2m3", x: 3450, y: 598, patrolDistance: 0 },
    { enemyId: "m0", x: 3750, y: 615, patrolDistance: 0 },
    { enemyId: "e2m3", x: 3850, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 4150, y: 350, patrolDistance: 750, aggression: 1.62 },
    { enemyId: "m1", x: 4300, y: 615, patrolDistance: 240 },
    { enemyId: "e2m3", x: 4600, y: 598, patrolDistance: 0 },
    { enemyId: "m2", x: 4750, y: 345, patrolDistance: 760, aggression: 1.65 },
    { enemyId: "e2m3", x: 4850, y: 598, patrolDistance: 0 },
  ],
  coins: createEnchantedCoins(10),
  healthPickups: [{ x: 3780, y: 360 }],
  rewardBox: { id: "reward-box-enchanted-l10", x: 2860, y: 422 },
  checkpoint: { id: "enchanted-grove-l10-midpoint", x: 2700, y: 610 },
};
