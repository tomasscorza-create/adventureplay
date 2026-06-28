import type { AchievementId, AchievementProgress } from "../../../shared/types/game";

export class AchievementSystem {
  recordEnemyDefeat(progress: AchievementProgress): AchievementId[] {
    progress.monstersDefeated += 1;
    return progress.monstersDefeated >= 10
      ? this.unlock(progress, "monster-hunter")
      : [];
  }

  recordLevelCompleted(
    progress: AchievementProgress,
    levelId: string,
    completedWithoutDamage: boolean,
  ): AchievementId[] {
    return [
      ...(levelId === "meadowOutpost" ? this.unlock(progress, "first-level") : []),
      ...(completedWithoutDamage ? this.unlock(progress, "flawless-level") : []),
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
