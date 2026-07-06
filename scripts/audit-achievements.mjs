import {
  achievementCategories,
  achievementDefinitions,
  getAchievementRewardLabels,
} from "../src/game/data/achievements.ts";

const errors = [];
const achievementIds = new Set();

for (const achievement of achievementDefinitions) {
  if (achievementIds.has(achievement.id)) {
    errors.push(`ID duplicado: ${achievement.id}`);
  }
  achievementIds.add(achievement.id);

  if (getAchievementRewardLabels(achievement.reward).length === 0) {
    errors.push(`${achievement.id}: no tiene recompensa`);
  }
  if (achievement.target <= 0) {
    errors.push(`${achievement.id}: objetivo invalido`);
  }
}

for (const category of achievementCategories) {
  const categoryAchievements = achievementDefinitions.filter(
    (achievement) => achievement.category === category.id,
  );
  const mediumAchievements = categoryAchievements.filter(
    (achievement) => achievement.difficulty === "medium",
  );

  if (mediumAchievements.length !== 4) {
    errors.push(`${category.name}: se esperaban 4 logros medios y hay ${mediumAchievements.length}`);
  }
}

if (achievementDefinitions.length !== 21) {
  errors.push(`Se esperaban 21 logros totales y hay ${achievementDefinitions.length}`);
}

if (!achievementIds.has("first-puzzle")) {
  errors.push("Falta el logro inicial propio del modo Desafio");
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Auditoria superada: 21 logros, 12 medios, 4 por categoria y Desafio conectado.");
}
