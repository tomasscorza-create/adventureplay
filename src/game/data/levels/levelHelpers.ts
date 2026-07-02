import type {
  LevelCoinSpawn,
  LevelEnemySpawn,
  LevelHazardDefinition,
  PlatformDefinition,
} from "../../../shared/types/game";

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

export function createPathCoinSpawns(stageNumber: number): LevelCoinSpawn[] {
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

export function addPlatformMovement(
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

export function increaseHazardPressure(
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

export function increaseEnemyPressure(
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

export function keepPitsAndHazards(
  hazards: LevelHazardDefinition[],
  hazardIds: string[],
): LevelHazardDefinition[] {
  const keptHazards = new Set(hazardIds);
  return hazards.filter((hazard) => hazard.type === "pit" || keptHazards.has(hazard.id));
}

export function createColossusHazards(
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

export function createEnchantedCoins(stageNumber: number): LevelCoinSpawn[] {
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

export function createEnchantedHazards(stageNumber: number): LevelHazardDefinition[] {
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
