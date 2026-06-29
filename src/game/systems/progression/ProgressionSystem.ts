import { EVENTS } from "../../../shared/constants/events";
import type { SaveData, SkillId } from "../../../shared/types/game";
import {
  getExperienceToNextLevel,
  getLevelReward,
  MAX_PLAYER_LEVEL,
  skillDefinitions,
  type LevelRewardDefinition,
} from "../../data/progression";
import { gameEvents } from "../../events/EventBus";

export class ProgressionSystem {
  addExperience(save: SaveData, amount: number): SkillId[] {
    const player = save.player;
    const unlocked: SkillId[] = [];
    this.grantPendingLevelRewards(save);
    if (amount <= 0) {
      return unlocked;
    }
    if (player.level >= MAX_PLAYER_LEVEL) {
      player.level = MAX_PLAYER_LEVEL;
      player.experience = 0;
      player.experienceToNextLevel = 0;
      return unlocked;
    }

    player.experience += amount;

    while (
      player.level < MAX_PLAYER_LEVEL
      && player.experienceToNextLevel > 0
      && player.experience >= player.experienceToNextLevel
    ) {
      player.experience -= player.experienceToNextLevel;
      player.level += 1;
      player.experienceToNextLevel = getExperienceToNextLevel(player.level);

      for (const skill of skillDefinitions) {
        const canUnlock =
          skill.requiredLevel <= player.level && !player.unlockedSkills.includes(skill.id);
        if (canUnlock) {
          player.unlockedSkills.push(skill.id);
          unlocked.push(skill.id);
        }
      }

      const levelReward = this.grantLevelReward(save, player.level);
      player.health = player.maxHealth;
      gameEvents.emit(EVENTS.PLAYER_LEVELED_UP, {
        level: player.level,
        reward: levelReward,
      });
    }

    if (player.level >= MAX_PLAYER_LEVEL) {
      player.level = MAX_PLAYER_LEVEL;
      player.experience = 0;
      player.experienceToNextLevel = 0;
    }

    return unlocked;
  }

  private grantLevelReward(save: SaveData, level: number): LevelRewardDefinition | undefined {
    if (save.claimedLevelRewards.includes(level)) {
      return undefined;
    }

    const reward = getLevelReward(level);
    if (!reward) {
      return undefined;
    }

    save.claimedLevelRewards.push(level);
    save.player.coins += reward.gold ?? 0;
    save.player.maxHealth += reward.maxHealth ?? 0;
    save.player.speed += reward.speed ?? 0;
    save.player.meleeDamage += reward.meleeDamage ?? 0;
    save.player.rangedDamage += reward.rangedDamage ?? 0;
    const activeCharges = save.characterPowerCharges[save.selectedCharacterId];
    activeCharges.healingCharges += reward.healingCharges ?? 0;
    activeCharges.powerCharges += reward.powerCharges ?? 0;
    return reward;
  }

  private grantPendingLevelRewards(save: SaveData): void {
    for (let level = 1; level <= save.player.level; level += 1) {
      this.grantLevelReward(save, level);
    }
  }
}
