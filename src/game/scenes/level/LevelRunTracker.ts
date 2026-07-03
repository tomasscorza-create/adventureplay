import type { PlayerStatistics } from "../../../shared/types/game";

export interface TrackedGameplayInput {
  left: boolean;
  right: boolean;
  jumpJustPressed: boolean;
  meleeJustPressed: boolean;
  spinJustPressed: boolean;
  healJustPressed: boolean;
  powerJustPressed: boolean;
}

export type RunResult = "completed" | "defeat" | "abandoned";

export class LevelRunTracker {
  private elapsedMs = 0;
  private actionCount = 0;
  private previousMovementDirection: -1 | 0 | 1 = 0;
  private statisticsRecorded = false;

  reset(): void {
    this.elapsedMs = 0;
    this.actionCount = 0;
    this.previousMovementDirection = 0;
    this.statisticsRecorded = false;
  }

  advance(deltaMs: number): void {
    this.elapsedMs += deltaMs;
  }

  trackInput(input: TrackedGameplayInput): void {
    const movementDirection: -1 | 0 | 1 = input.left === input.right
      ? 0
      : input.left
        ? -1
        : 1;
    if (movementDirection !== 0 && movementDirection !== this.previousMovementDirection) {
      this.actionCount += 1;
    }
    this.previousMovementDirection = movementDirection;
    this.actionCount += [
      input.jumpJustPressed,
      input.meleeJustPressed,
      input.spinJustPressed,
      input.healJustPressed,
      input.powerJustPressed,
    ].filter(Boolean).length;
  }

  record(statistics: PlayerStatistics, result: RunResult): boolean {
    if (this.statisticsRecorded) {
      return false;
    }

    this.statisticsRecorded = true;
    statistics.runsPlayed += 1;
    statistics.gameplaySeconds += this.durationSeconds;
    statistics.actions += this.actionCount;
    if (result === "completed") {
      statistics.completedRuns += 1;
    } else if (result === "defeat") {
      statistics.defeats += 1;
    }
    return true;
  }

  get durationSeconds(): number {
    return Math.max(1, Math.round(this.elapsedMs / 1000));
  }

  get actionsPerMinute(): number {
    return Math.round(this.actionCount / Math.max(this.elapsedMs / 60_000, 1 / 60));
  }
}
