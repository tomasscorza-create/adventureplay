import {
  experienceByLevel,
  getExperienceToNextLevel,
  getLevelRewardLabels,
  levelRewardDefinitions,
  MAX_PLAYER_LEVEL,
} from "../src/game/data/progression.ts";

const errors = [];
const requirements = Array.from(
  { length: MAX_PLAYER_LEVEL - 1 },
  (_entry, index) => getExperienceToNextLevel(index + 1),
);

for (let index = 1; index < requirements.length; index += 1) {
  if (requirements[index] <= requirements[index - 1]) {
    errors.push(`La XP no aumenta entre LV${index + 1} y LV${index + 2}`);
  }
}

if (Object.keys(experienceByLevel).length !== MAX_PLAYER_LEVEL - 1) {
  errors.push("La tabla de XP no cubre todos los niveles hasta LV80");
}
if (getExperienceToNextLevel(1) !== 100) {
  errors.push("LV1 debe comenzar con un requisito rapido de 100 XP");
}
if (getExperienceToNextLevel(MAX_PLAYER_LEVEL) !== 0) {
  errors.push("LV80 debe ser el nivel maximo y no exigir mas XP");
}

const totalExperience = requirements.reduce((total, requirement) => total + requirement, 0);
if (totalExperience < 2_000_000) {
  errors.push("La XP total es demasiado baja para una progresion de varios meses");
}
if (getExperienceToNextLevel(79) < 90_000) {
  errors.push("El ultimo tramo no es suficientemente exigente");
}

const expectedFirstRewards = [
  { level: 1, healingCharges: 3, powerCharges: 5 },
  { level: 2, skillId: "stronger-strike", meleeDamage: 1 },
  { level: 3, skillId: "quick-steps", speed: 10 },
  { level: 4, gold: 100, healingCharges: 1 },
  { level: 5, gold: 150, healingCharges: 2, powerCharges: 3 },
  { level: 6, maxHealth: 1 },
  { level: 7, speed: 10 },
  { level: 8, gold: 8_000, healingCharges: 5 },
  { level: 9, meleeDamage: 1 },
  { level: 10, maxHealth: 1 },
  { level: 11, rangedDamage: 1 },
  { level: 12, gold: 10_000, powerCharges: 10 },
  { level: 13, speed: 10 },
  { level: 14, gold: 12_000, healingCharges: 5, powerCharges: 10 },
  { level: 15, gold: 15_000, maxHealth: 1 },
];
if (JSON.stringify(levelRewardDefinitions) !== JSON.stringify(expectedFirstRewards)) {
  errors.push("Las recompensas definidas para LV1-LV15 no coinciden con el plan");
}
for (const reward of levelRewardDefinitions) {
  if (getLevelRewardLabels(reward).length === 0) {
    errors.push(`LV${reward.level} no tiene texto visible de recompensa`);
  }
}

const permanentTotals = levelRewardDefinitions.reduce(
  (totals, reward) => ({
    maxHealth: totals.maxHealth + (reward.maxHealth ?? 0),
    speed: totals.speed + (reward.speed ?? 0),
    meleeDamage: totals.meleeDamage + (reward.meleeDamage ?? 0),
    rangedDamage: totals.rangedDamage + (reward.rangedDamage ?? 0),
  }),
  { maxHealth: 4, speed: 280, meleeDamage: 1, rangedDamage: 1 },
);
if (
  permanentTotals.maxHealth !== 7
  || permanentTotals.speed !== 310
  || permanentTotals.meleeDamage !== 3
  || permanentTotals.rangedDamage !== 2
) {
  errors.push("Los atributos permanentes acumulados de LV15 son incorrectos");
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Auditoria superada: LV1-LV80, ${totalExperience.toLocaleString("es-AR")} XP acumulada, `
      + `${getExperienceToNextLevel(79).toLocaleString("es-AR")} XP para el ultimo nivel.`,
  );
}
