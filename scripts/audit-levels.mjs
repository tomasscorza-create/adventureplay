import { getPathCoinTarget, levelDefinitions } from "../src/game/data/levels.ts";

const errors = [];
const warnings = [];
const levels = Object.values(levelDefinitions).sort((a, b) =>
  a.theme.localeCompare(b.theme) || a.stageNumber - b.stageNumber,
);
const levelIds = new Set(levels.map((level) => level.id));
const rewardBoxIds = new Set();
const groundEnemyIds = new Set(["m0", "m1", "m3"]);
let previousM3Intelligence = 0;

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

  const pathGold = level.coins
    .filter((coin) => coin.itemId === "bronzeCoin")
    .reduce((sum, coin) => sum + (coin.value ?? 1), 0);
  const expectedGold = getPathCoinTarget(level.stageNumber);
  if (pathGold !== expectedGold) {
    errors.push(`${level.id}: ORO del camino ${pathGold}, esperado ${expectedGold}`);
  }

  const expectedHealthPickups = level.theme === "verdant-frontier" && level.stageNumber >= 3 ? 1 : 0;
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
  const regionLabel = level.theme === "enchanted-forest" ? "Bosque encantado" : "Frontera Verde";
  console.log(
    `${regionLabel} LV${level.stageNumber}: ${level.enemies.length} enemigos, ${offensiveHazards} peligros, ${pathGold} ORO, ${level.healthPickups.length} corazones${level.m3Intelligence ? `, M3 IA ${level.m3Intelligence}` : ""}`,
  );
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
