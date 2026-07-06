import { getPathCoinTarget, levelDefinitions } from "../src/game/data/levels.ts";

const errors = [];
const warnings = [];
const levels = Object.values(levelDefinitions).sort((a, b) =>
  a.theme.localeCompare(b.theme) || a.stageNumber - b.stageNumber,
);
const levelIds = new Set(levels.map((level) => level.id));
const rewardBoxIds = new Set();
const groundEnemyIds = new Set(["m0", "m1", "m3", "e2m3", "e3m3"]);
const enchantedLevels = levels.filter((level) => level.theme === "enchanted-forest");
const activeVolcanoLevels = levels.filter((level) => level.theme === "active-volcano");
const enchantedProgression = [
  { time: 72, pressure: 52, enemies: 5, m2: 1, e2m3: 0, hazards: 2, movingPlatforms: 0 },
  { time: 69, pressure: 60, enemies: 7, m2: 2, e2m3: 0, hazards: 4, movingPlatforms: 0 },
  { time: 66, pressure: 68, enemies: 9, m2: 3, e2m3: 1, hazards: 5, movingPlatforms: 3 },
  { time: 63, pressure: 78, enemies: 11, m2: 4, e2m3: 2, hazards: 7, movingPlatforms: 5 },
  { time: 60, pressure: 88, enemies: 13, m2: 5, e2m3: 3, hazards: 9, movingPlatforms: 7 },
  { time: 58, pressure: 100, enemies: 14, m2: 5, e2m3: 4, hazards: 10, movingPlatforms: 8 },
  { time: 56, pressure: 108, enemies: 15, m2: 5, e2m3: 5, hazards: 11, movingPlatforms: 9 },
  { time: 54, pressure: 116, enemies: 16, m2: 5, e2m3: 6, hazards: 12, movingPlatforms: 10 },
  { time: 52, pressure: 124, enemies: 17, m2: 5, e2m3: 7, hazards: 13, movingPlatforms: 11 },
  { time: 50, pressure: 132, enemies: 18, m2: 5, e2m3: 8, hazards: 14, movingPlatforms: 12 },
];
const activeVolcanoProgression = [
  { time: 68, pressure: 60, enemies: 6, m2: 1, e3m3: 0, hazards: 3, movingPlatforms: 0 },
  { time: 64, pressure: 70, enemies: 8, m2: 2, e3m3: 0, hazards: 5, movingPlatforms: 0 },
  { time: 60, pressure: 82, enemies: 10, m2: 3, e3m3: 0, hazards: 7, movingPlatforms: 3 },
  { time: 57, pressure: 94, enemies: 12, m2: 4, e3m3: 1, hazards: 9, movingPlatforms: 5 },
  { time: 54, pressure: 106, enemies: 14, m2: 5, e3m3: 2, hazards: 11, movingPlatforms: 7 },
  { time: 52, pressure: 118, enemies: 15, m2: 4, e3m3: 4, hazards: 12, movingPlatforms: 8 },
  { time: 50, pressure: 128, enemies: 16, m2: 4, e3m3: 5, hazards: 13, movingPlatforms: 9 },
  { time: 48, pressure: 138, enemies: 17, m2: 4, e3m3: 6, hazards: 14, movingPlatforms: 10 },
  { time: 46, pressure: 148, enemies: 18, m2: 4, e3m3: 7, hazards: 15, movingPlatforms: 11 },
  { time: 44, pressure: 158, enemies: 19, m2: 4, e3m3: 8, hazards: 16, movingPlatforms: 12 },
];
let previousM3Intelligence = 0;
let previousE2M3Intelligence = 0;
let previousE3M3Intelligence = 0;

for (const level of levels) {
  if (level.nextLevelId && !levelIds.has(level.nextLevelId)) {
    errors.push(`${level.id}: nextLevelId inexistente (${level.nextLevelId})`);
  }

  if (rewardBoxIds.has(level.rewardBox.id)) {
    errors.push(`${level.id}: rewardBox ID duplicado (${level.rewardBox.id})`);
  }
  rewardBoxIds.add(level.rewardBox.id);

  if (level.theme === "verdant-frontier" && level.stageNumber >= 6) {
    if (
      typeof level.m3Intelligence !== "number" ||
      level.m3Intelligence < 0.35 ||
      level.m3Intelligence > 1
    ) {
      errors.push(`${level.id}: inteligencia M3 invalida (${level.m3Intelligence})`);
    } else {
      if (level.m3Intelligence < previousM3Intelligence) {
        errors.push(`${level.id}: la inteligencia M3 disminuye respecto al nivel anterior`);
      }
      previousM3Intelligence = level.m3Intelligence;
    }
  }

  const e2m3Count = level.enemies.filter((enemy) => enemy.enemyId === "e2m3").length;
  const e3m3Count = level.enemies.filter((enemy) => enemy.enemyId === "e3m3").length;
  if (level.theme === "enchanted-forest" && e2m3Count > 0) {
    if (
      typeof level.m3Intelligence !== "number" ||
      level.m3Intelligence < 0.35 ||
      level.m3Intelligence > 1
    ) {
      errors.push(`${level.id}: inteligencia E2M3 invalida (${level.m3Intelligence})`);
    } else {
      if (level.m3Intelligence <= previousE2M3Intelligence) {
        errors.push(`${level.id}: la inteligencia E2M3 no aumenta respecto al nivel anterior`);
      }
      previousE2M3Intelligence = level.m3Intelligence;
    }
  }

  if (level.theme === "active-volcano" && e3m3Count > 0) {
    if (
      typeof level.m3Intelligence !== "number" ||
      level.m3Intelligence < 0.35 ||
      level.m3Intelligence > 1
    ) {
      errors.push(`${level.id}: inteligencia E3M3 invalida (${level.m3Intelligence})`);
    } else {
      if (level.m3Intelligence <= previousE3M3Intelligence) {
        errors.push(`${level.id}: la inteligencia E3M3 no aumenta respecto al nivel anterior`);
      }
      previousE3M3Intelligence = level.m3Intelligence;
    }
  }

  const pathGold = level.coins
    .filter((coin) => coin.itemId === "bronzeCoin")
    .reduce((sum, coin) => sum + (coin.value ?? 1), 0);
  const expectedGold = getPathCoinTarget(level.stageNumber);
  if (pathGold !== expectedGold) {
    errors.push(`${level.id}: ORO del camino ${pathGold}, esperado ${expectedGold}`);
  }

  const expectedHealthPickups = level.stageNumber >= 3 ? 1 : 0;
  if (level.healthPickups.length !== expectedHealthPickups) {
    errors.push(
      `${level.id}: tiene ${level.healthPickups.length} corazones, esperado ${expectedHealthPickups}`,
    );
  }

  const groundPlatforms = level.platforms
    .filter((platform) => platform.y >= 640)
    .sort((a, b) => a.x - b.x);
  for (let index = 0; index < groundPlatforms.length - 1; index += 1) {
    const gapStart = groundPlatforms[index].x + groundPlatforms[index].width;
    const gapEnd = groundPlatforms[index + 1].x;
    if (gapEnd <= gapStart) {
      continue;
    }

    const matchingPit = level.hazards.find(
      (hazard) =>
        hazard.type === "pit" &&
        hazard.x <= gapStart + 12 &&
        hazard.x + hazard.width >= gapEnd - 12,
    );
    if (!matchingPit) {
      errors.push(`${level.id}: hueco ${gapStart}-${gapEnd} sin pozo que lo cubra`);
    }
  }
  for (const pickup of level.healthPickups) {
    const healthSectionStart = level.worldWidth * 0.6;
    const healthSectionEnd = level.worldWidth * 0.8;
    if (pickup.x < healthSectionStart || pickup.x > healthSectionEnd) {
      errors.push(`${level.id}: corazon en x=${pickup.x} fuera del tramo 60%-80%`);
    }

    const nearbyCoin = level.coins.find(
      (coin) => Math.hypot(pickup.x - coin.x, pickup.y - coin.y) < 70,
    );
    const nearbyEnemy = level.enemies.find(
      (enemy) => Math.hypot(pickup.x - enemy.x, pickup.y - enemy.y) < 90,
    );
    const nearbyHazard = level.hazards.find(
      (hazard) =>
        hazard.type !== "pit" &&
        Math.abs(pickup.x - hazard.x) < hazard.width / 2 + 35 &&
        Math.abs(pickup.y - hazard.y) < hazard.height / 2 + 35,
    );
    const nearRewardBox =
      Math.hypot(pickup.x - level.rewardBox.x, pickup.y - level.rewardBox.y) < 90;
    if (nearbyCoin || nearbyEnemy || nearbyHazard || nearRewardBox) {
      errors.push(`${level.id}: el corazon esta superpuesto o demasiado cerca de otro elemento`);
    }
  }

  for (const enemy of level.enemies.filter((spawn) => groundEnemyIds.has(spawn.enemyId))) {
    const supportingPlatforms = level.platforms.filter(
      (platform) =>
        enemy.x >= platform.x &&
        enemy.x <= platform.x + platform.width &&
        platform.y >= enemy.y &&
        platform.y - enemy.y <= 90,
    );

    if (supportingPlatforms.length === 0) {
      errors.push(`${level.id}: ${enemy.enemyId} en x=${enemy.x} aparece sin suelo`);
      continue;
    }

    const edgeMargin = Math.max(
      ...supportingPlatforms.map((platform) =>
        Math.min(enemy.x - platform.x, platform.x + platform.width - enemy.x),
      ),
    );
    if (edgeMargin < 45) {
      warnings.push(`${level.id}: ${enemy.enemyId} en x=${enemy.x} esta a ${edgeMargin}px de un borde`);
    }
  }

  for (const enemy of level.enemies) {
    for (const hazard of level.hazards.filter((item) => item.type !== "pit")) {
      if (Math.abs(enemy.x - hazard.x) < 70) {
        warnings.push(`${level.id}: ${enemy.enemyId} y ${hazard.id} estan demasiado juntos`);
      }
    }
  }

  const offensiveHazards = level.hazards.filter((hazard) => hazard.type !== "pit").length;
  const regionLabel = level.theme === "enchanted-forest"
    ? "Bosque encantado"
    : level.theme === "active-volcano"
      ? "Volcan activo"
      : "Frontera Verde";
  console.log(
    `${regionLabel} LV${level.stageNumber}: ${level.enemies.length} enemigos, ${offensiveHazards} peligros, ${pathGold} ORO, ${level.healthPickups.length} corazones${level.m3Intelligence ? `, ${e3m3Count > 0 ? "E3M3" : e2m3Count > 0 ? "E2M3" : "M3"} IA ${level.m3Intelligence}` : ""}`,
  );
}

if (enchantedLevels.length !== 10) {
  errors.push(`Bosque encantado: tiene ${enchantedLevels.length} niveles, esperado 10`);
}

if (activeVolcanoLevels.length !== 10) {
  errors.push(`Volcan activo: tiene ${activeVolcanoLevels.length} niveles, esperado 10`);
}

for (const [index, level] of activeVolcanoLevels.entries()) {
  const expectedStage = index + 1;
  const expectedProgression = activeVolcanoProgression[index];
  if (level.stageNumber !== expectedStage) {
    errors.push(`Volcan activo: falta LV${expectedStage} o la secuencia esta desordenada`);
  }
  const expectedNextLevelId = index < activeVolcanoLevels.length - 1
    ? activeVolcanoLevels[index + 1].id
    : undefined;
  if (level.nextLevelId !== expectedNextLevelId) {
    errors.push(
      `${level.id}: nextLevelId ${level.nextLevelId ?? "ausente"}, esperado ${expectedNextLevelId ?? "ninguno"}`,
    );
  }
  if (
    level.stageNumber <= 3 &&
    level.enemies.some((enemy) =>
      enemy.enemyId === "m3" || enemy.enemyId === "e2m3" || enemy.enemyId === "e3m3",
    )
  ) {
    errors.push(`${level.id}: M3 no debe aparecer en los tres primeros niveles volcanicos`);
  }
  if (expectedProgression) {
    const actualProgression = {
      time: level.timeLimitSeconds,
      pressure: level.autoScrollSpeed,
      enemies: level.enemies.length,
      m2: level.enemies.filter((enemy) => enemy.enemyId === "m2").length,
      e3m3: level.enemies.filter((enemy) => enemy.enemyId === "e3m3").length,
      hazards: level.hazards.filter((hazard) => hazard.type !== "pit").length,
      movingPlatforms: level.platforms.filter((platform) => platform.movement).length,
    };
    for (const key of Object.keys(expectedProgression)) {
      if (actualProgression[key] !== expectedProgression[key]) {
        errors.push(
          `${level.id}: ${key}=${actualProgression[key]}, esperado ${expectedProgression[key]}`,
        );
      }
    }
  }
  if (index > 0) {
    const previousLevel = activeVolcanoLevels[index - 1];
    if (level.autoScrollSpeed <= previousLevel.autoScrollSpeed) {
      errors.push(`${level.id}: la presion roja no aumenta respecto a ${previousLevel.id}`);
    }
    if (level.timeLimitSeconds >= previousLevel.timeLimitSeconds) {
      errors.push(`${level.id}: el tiempo limite no disminuye respecto a ${previousLevel.id}`);
    }
    if (level.enemies.length <= previousLevel.enemies.length) {
      errors.push(`${level.id}: la cantidad de enemigos no aumenta respecto a ${previousLevel.id}`);
    }
    const previousHazards = previousLevel.hazards.filter((hazard) => hazard.type !== "pit").length;
    const currentHazards = level.hazards.filter((hazard) => hazard.type !== "pit").length;
    if (currentHazards <= previousHazards) {
      errors.push(`${level.id}: los peligros ofensivos no aumentan respecto a ${previousLevel.id}`);
    }
  }
}

for (const volcanicLevel of activeVolcanoLevels) {
  const enchantedLevel = enchantedLevels.find(
    (level) => level.stageNumber === volcanicLevel.stageNumber,
  );
  if (!enchantedLevel) {
    errors.push(`${volcanicLevel.id}: no existe nivel equivalente de Bosque encantado`);
    continue;
  }

  const volcanicThreatDensity = (
    volcanicLevel.enemies.length +
    volcanicLevel.hazards.filter((hazard) => hazard.type !== "pit").length
  ) / volcanicLevel.worldWidth;
  const enchantedThreatDensity = (
    enchantedLevel.enemies.length +
    enchantedLevel.hazards.filter((hazard) => hazard.type !== "pit").length
  ) / enchantedLevel.worldWidth;
  if (volcanicLevel.autoScrollSpeed <= enchantedLevel.autoScrollSpeed) {
    errors.push(`${volcanicLevel.id}: presion roja no supera a ${enchantedLevel.id}`);
  }
  if (volcanicThreatDensity <= enchantedThreatDensity) {
    errors.push(`${volcanicLevel.id}: densidad de amenazas no supera a ${enchantedLevel.id}`);
  }
}

for (const [index, level] of enchantedLevels.entries()) {
  const expectedStage = index + 1;
  const expectedProgression = enchantedProgression[index];
  if (level.stageNumber !== expectedStage) {
    errors.push(`Bosque encantado: falta LV${expectedStage} o la secuencia esta desordenada`);
  }

  const expectedNextLevelId = index < enchantedLevels.length - 1
    ? enchantedLevels[index + 1].id
    : undefined;
  if (level.nextLevelId !== expectedNextLevelId) {
    errors.push(
      `${level.id}: nextLevelId ${level.nextLevelId ?? "ausente"}, esperado ${expectedNextLevelId ?? "ninguno"}`,
    );
  }

  if (expectedProgression) {
    const m2Count = level.enemies.filter((enemy) => enemy.enemyId === "m2").length;
    const e2m3Count = level.enemies.filter((enemy) => enemy.enemyId === "e2m3").length;
    const hazardCount = level.hazards.filter((hazard) => hazard.type !== "pit").length;
    const movingPlatformCount = level.platforms.filter((platform) => platform.movement).length;
    const actualProgression = {
      time: level.timeLimitSeconds,
      pressure: level.autoScrollSpeed,
      enemies: level.enemies.length,
      m2: m2Count,
      e2m3: e2m3Count,
      hazards: hazardCount,
      movingPlatforms: movingPlatformCount,
    };
    for (const key of Object.keys(expectedProgression)) {
      if (actualProgression[key] !== expectedProgression[key]) {
        errors.push(
          `${level.id}: ${key}=${actualProgression[key]}, esperado ${expectedProgression[key]}`,
        );
      }
    }
  }

  if (index === 0) {
    continue;
  }

  const previousLevel = enchantedLevels[index - 1];
  const previousHazards = previousLevel.hazards.filter((hazard) => hazard.type !== "pit").length;
  const currentHazards = level.hazards.filter((hazard) => hazard.type !== "pit").length;
  if (level.autoScrollSpeed <= previousLevel.autoScrollSpeed) {
    errors.push(`${level.id}: la presion roja no aumenta respecto a ${previousLevel.id}`);
  }
  if (level.timeLimitSeconds >= previousLevel.timeLimitSeconds) {
    errors.push(`${level.id}: el tiempo limite no disminuye respecto a ${previousLevel.id}`);
  }
  if (level.enemies.length <= previousLevel.enemies.length) {
    errors.push(`${level.id}: la cantidad de enemigos no aumenta respecto a ${previousLevel.id}`);
  }
  if (currentHazards <= previousHazards) {
    errors.push(`${level.id}: los peligros ofensivos no aumentan respecto a ${previousLevel.id}`);
  }
}

for (const enchantedLevel of enchantedLevels) {
  const frontierLevel = levels.find(
    (level) => level.theme === "verdant-frontier" && level.stageNumber === enchantedLevel.stageNumber,
  );
  if (!frontierLevel) {
    errors.push(`${enchantedLevel.id}: no existe nivel equivalente de Frontera Verde`);
    continue;
  }

  const enchantedThreatCount = enchantedLevel.enemies.length +
    enchantedLevel.hazards.filter((hazard) => hazard.type !== "pit").length;
  const frontierThreatCount = frontierLevel.enemies.length +
    frontierLevel.hazards.filter((hazard) => hazard.type !== "pit").length;
  const enchantedThreatDensity = enchantedThreatCount / enchantedLevel.worldWidth;
  const frontierThreatDensity = frontierThreatCount / frontierLevel.worldWidth;
  if (enchantedLevel.autoScrollSpeed <= frontierLevel.autoScrollSpeed) {
    errors.push(`${enchantedLevel.id}: presion roja no supera a ${frontierLevel.id}`);
  }
  if (enchantedThreatDensity <= frontierThreatDensity) {
    errors.push(`${enchantedLevel.id}: densidad de amenazas no supera a ${frontierLevel.id}`);
  }
}

for (const warning of warnings) {
  console.warn(`WARN: ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Auditoria superada: ${levels.length} niveles, ${warnings.length} advertencias.`);
}
