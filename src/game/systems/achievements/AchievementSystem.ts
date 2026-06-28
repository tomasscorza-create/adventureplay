import type { AchievementId, AchievementProgress } from "../../../shared/types/game";

export class AchievementSystem {
  recordEnemyDefeat(progress: AchievementProgress): AchievementId[] {
    progress.monstersDefeated += 1;
    return [
      ...this.unlock(progress, "first-monster"),
      ...(progress.monstersDefeated >= 10
        ? this.unlock(progress, "monster-hunter")
        : []),
    ];
  }

  recordCoinCollected(progress: AchievementProgress): AchievementId[] {
    return this.unlock(progress, "first-gold");
  }

  recordCheckpointActivated(progress: AchievementProgress): AchievementId[] {
    return this.unlock(progress, "first-checkpoint");
  }

  recordRewardBoxOpened(progress: AchievementProgress): AchievementId[] {
    return this.unlock(progress, "first-treasure");
  }

  recordLevelCompleted(
    progress: AchievementProgress,
    levelId: string,
    completedWithoutDamage: boolean,
    completedLevelCount: number,
  ): AchievementId[] {
    return [
      ...(levelId === "meadowOutpost" ? this.unlock(progress, "first-level") : []),
      ...(completedWithoutDamage ? this.unlock(progress, "flawless-level") : []),
      ...(completedLevelCount >= 3 ? this.unlock(progress, "three-levels") : []),
    ];
  }

  private unlock(progress: AchievementProgress, achievementId: AchievementId): AchievementId[] {
    if (progress.unlockedIds.includes(achievementId)) {
      return [];
    }

    progress.unlockedIds.push(achievementId);
    return [achievementId];
  }
}
