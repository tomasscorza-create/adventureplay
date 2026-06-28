import { getPathCoinTarget, levelDefinitions } from "../src/game/data/levels.ts";

const errors = [];
const warnings = [];
const levels = Object.values(levelDefinitions).sort((a, b) => a.stageNumber - b.stageNumber);
const levelIds = new Set(levels.map((level) => level.id));
const rewardBoxIds = new Set();
const groundEnemyIds = new Set(["m0", "m1", "m3"]);

for (const level of levels) {
  if (level.nextLevelId && !levelIds.has(level.nextLevelId)) {
    errors.push(`${level.id}: nextLevelId inexistente (${level.nextLevelId})`);
  }

  if (rewardBoxIds.has(level.rewardBox.id)) {
    errors.push(`${level.id}: rewardBox ID duplicado (${level.rewardBox.id})`);
  }
  rewardBoxIds.add(level.rewardBox.id);

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
  for (const pickup of level.healthPickups) {
    const finalSectionStart = level.worldWidth * 0.6;
    if (pickup.x < finalSectionStart || pickup.x > level.worldWidth) {
      errors.push(`${level.id}: corazon en x=${pickup.x} fuera del ultimo 40%`);
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
  console.log(
    `LV${level.stageNumber}: ${level.enemies.length} enemigos, ${offensiveHazards} peligros, ${pathGold} ORO, ${level.healthPickups.length} corazones`,
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
