import type { SkillDefinition, SkillId } from "../../shared/types/game";

export const MAX_PLAYER_LEVEL = 80;

export function getExperienceToNextLevel(level: number): number {
  if (level >= MAX_PLAYER_LEVEL) {
    return 0;
  }

  const normalizedLevel = Math.max(1, Math.floor(level));
  const rawExperience = 100
    + 12 * normalizedLevel ** 2
    + 0.12 * normalizedLevel ** 2.7;
  return Math.max(100, Math.round(rawExperience / 25) * 25);
}

export const experienceByLevel: Record<number, number> = Object.fromEntries(
  Array.from(
    { length: MAX_PLAYER_LEVEL - 1 },
    (_entry, index) => [index + 1, getExperienceToNextLevel(index + 1)],
  ),
);

export interface LevelRewardDefinition {
  level: number;
  skillId?: SkillId;
  gold?: number;
  healingCharges?: number;
  powerCharges?: number;
  maxHealth?: number;
  speed?: number;
  meleeDamage?: number;
  rangedDamage?: number;
}

export const levelRewardDefinitions: LevelRewardDefinition[] = [
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

export function getLevelReward(level: number): LevelRewardDefinition | undefined {
  return levelRewardDefinitions.find((reward) => reward.level === level);
}

export function getLevelRewardLabels(reward: LevelRewardDefinition | undefined): string[] {
  if (!reward) {
    return ["VIDA RESTAURADA"];
  }

  const labels: string[] = [];
  if (reward.maxHealth) labels.push(`+${reward.maxHealth} VIDA MAXIMA`);
  if (reward.speed) labels.push(`+${reward.speed} VELOCIDAD`);
  if (reward.meleeDamage) labels.push(`+${reward.meleeDamage} DANO CUERPO A CUERPO`);
  if (reward.rangedDamage) labels.push(`+${reward.rangedDamage} DANO GIRATORIO`);
  if (reward.gold) labels.push(`+${reward.gold.toLocaleString("es-AR")} ORO`);
  if (reward.healingCharges) labels.push(`+${reward.healingCharges} REGENERACION`);
  if (reward.powerCharges) labels.push(`+${reward.powerCharges} PODER LETAL`);
  return labels.length > 0 ? labels : ["VIDA RESTAURADA"];
}

export const skillDefinitions: SkillDefinition[] = [
  {
    id: "stronger-strike",
    name: "Golpe reforzado",
    requiredLevel: 2,
    description: "+1 de dano cuerpo a cuerpo permanente.",
  },
  {
    id: "quick-steps",
    name: "Pasos rapidos",
    requiredLevel: 3,
    description: "+10 de velocidad permanente.",
  },
];
