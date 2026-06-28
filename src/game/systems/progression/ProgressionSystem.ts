import type { PlayerStats, SkillId } from "../../../shared/types/game";
import { experienceByLevel, skillDefinitions } from "../../data/progression";

export class ProgressionSystem {
  addExperience(player: PlayerStats, amount: number): SkillId[] {
    player.experience += amount;
    const unlocked: SkillId[] = [];

    while (player.experience >= player.experienceToNextLevel) {
      player.experience -= player.experienceToNextLevel;
      player.level += 1;
      player.experienceToNextLevel =
        experienceByLevel[player.level] ?? player.experienceToNextLevel + 160;

      for (const skill of skillDefinitions) {
        const canUnlock =
          skill.requiredLevel <= player.level && !player.unlockedSkills.includes(skill.id);
        if (canUnlock) {
          player.unlockedSkills.push(skill.id);
          unlocked.push(skill.id);
          if (skill.id === "stronger-strike") {
            player.meleeDamage += 1;
          } else if (skill.id === "quick-steps") {
            player.speed += 20;
          }
        }
      }

      player.health = player.maxHealth;
    }

    return unlocked;
  }
}
