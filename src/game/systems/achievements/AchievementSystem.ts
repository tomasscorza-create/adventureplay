import type {
  AchievementId,
  DailyStreakProgress,
  SaveData,
} from "../../../shared/types/game";
import { getAchievementDefinition } from "../../data/achievements";
import { ProgressionSystem } from "../progression/ProgressionSystem";

export class AchievementSystem {
  private readonly progression = new ProgressionSystem();

  recordEnemyDefeat(save: SaveData, enemyId: string, defeatedInCurrentLevel: number): AchievementId[] {
    save.achievements.monstersDefeated += 1;
    save.achievements.mostEnemiesDefeatedInLevel = Math.max(
      save.achievements.mostEnemiesDefeatedInLevel,
      defeatedInCurrentLevel,
    );
    if (!save.achievements.defeatedEnemyIds.includes(enemyId)) {
      save.achievements.defeatedEnemyIds.push(enemyId);
    }

    const defeatedFamilies = new Set(
      save.achievements.defeatedEnemyIds.map((id) => id === "e2m3" ? "m3" : id),
    );
    return [
      ...this.unlock(save, "first-monster"),
      ...(save.achievements.monstersDefeated >= 10
        ? this.unlock(save, "monster-hunter")
        : []),
      ...(save.achievements.monstersDefeated >= 25
        ? this.unlock(save, "monster-hunter-25")
        : []),
      ...(save.achievements.monstersDefeated >= 50
        ? this.unlock(save, "monster-hunter-50")
        : []),
      ...(defeatedInCurrentLevel >= 10
        ? this.unlock(save, "ten-in-one-level")
        : []),
      ...(["m0", "m1", "m2", "m3"].every((id) => defeatedFamilies.has(id))
        ? this.unlock(save, "enemy-variety")
        : []),
    ];
  }

  recordGoldCollected(save: SaveData, amount: number): AchievementId[] {
    save.achievements.goldCollected += Math.max(0, Math.floor(amount));
    return [
      ...this.unlock(save, "first-gold"),
      ...(save.achievements.goldCollected >= 250
        ? this.unlock(save, "gold-collector-250")
        : []),
    ];
  }

  recordCheckpointActivated(save: SaveData, checkpointId: string): AchievementId[] {
    if (!save.achievements.activatedCheckpointIds.includes(checkpointId)) {
      save.achievements.activatedCheckpointIds.push(checkpointId);
    }
    return [
      ...this.unlock(save, "first-checkpoint"),
      ...(save.achievements.activatedCheckpointIds.length >= 5
        ? this.unlock(save, "five-checkpoints")
        : []),
    ];
  }

  recordRewardBoxOpened(save: SaveData, today = getLocalDayKey()): AchievementId[] {
    this.updateDailyStreak(save.achievements.treasureStreak, today);
    return [
      ...this.unlock(save, "first-treasure"),
      ...(save.claimedRewardBoxes.length >= 5
        ? this.unlock(save, "five-treasures")
        : []),
      ...(save.achievements.treasureStreak.count >= 3
        ? this.unlock(save, "three-day-treasure-streak")
        : []),
    ];
  }

  recordLevelCompleted(
    save: SaveData,
    levelId: string,
    completedWithoutDamage: boolean,
    completedLevelCount: number,
    isNewCompletion: boolean,
    today = getLocalDayKey(),
  ): AchievementId[] {
    if (completedWithoutDamage && !save.achievements.flawlessLevelIds.includes(levelId)) {
      save.achievements.flawlessLevelIds.push(levelId);
    }
    if (isNewCompletion) {
      this.updateDailyStreak(save.achievements.levelAdvanceStreak, today);
    }

    const verdantCompleted = save.completedLevels.filter((id) => id.startsWith("meadowOutpost")).length;
    const enchantedCompleted = save.completedLevels.filter((id) => id.startsWith("enchantedGrove")).length;
    return [
      ...(levelId === "meadowOutpost" ? this.unlock(save, "first-level") : []),
      ...(completedWithoutDamage ? this.unlock(save, "flawless-level") : []),
      ...(completedLevelCount >= 3 ? this.unlock(save, "three-levels") : []),
      ...(completedLevelCount >= 5 ? this.unlock(save, "five-levels") : []),
      ...(save.achievements.flawlessLevelIds.length >= 3
        ? this.unlock(save, "three-flawless-levels")
        : []),
      ...(save.achievements.levelAdvanceStreak.count >= 3
        ? this.unlock(save, "three-day-advance-streak")
        : []),
      ...(verdantCompleted >= 3 && enchantedCompleted >= 3
        ? this.unlock(save, "dual-region-explorer")
        : []),
    ];
  }

  private updateDailyStreak(streak: DailyStreakProgress, today: string): void {
    if (streak.lastDay === today) {
      return;
    }

    streak.count = streak.lastDay && daysBetween(streak.lastDay, today) === 1
      ? streak.count + 1
      : 1;
    streak.lastDay = today;
  }

  private unlock(save: SaveData, achievementId: AchievementId): AchievementId[] {
    if (save.achievements.unlockedIds.includes(achievementId)) {
      return [];
    }

    save.achievements.unlockedIds.push(achievementId);
    this.grantReward(save, achievementId);
    return [achievementId];
  }

  private grantReward(save: SaveData, achievementId: AchievementId): void {
    const reward = getAchievementDefinition(achievementId)?.reward;
    if (!reward) {
      return;
    }

    save.player.coins += reward.gold ?? 0;
    if (reward.experience) {
      this.progression.addExperience(save, reward.experience);
    }

    const activeCharges = save.characterPowerCharges[save.selectedCharacterId];
    activeCharges.healingCharges += reward.healingCharges ?? 0;
    activeCharges.powerCharges += reward.powerCharges ?? 0;
  }
}

function getLocalDayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(previousDay: string, currentDay: string): number {
  const toUtcTime = (dayKey: string) => {
    const [year, month, day] = dayKey.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtcTime(currentDay) - toUtcTime(previousDay)) / 86_400_000);
}
