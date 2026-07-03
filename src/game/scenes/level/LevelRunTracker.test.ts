import { describe, expect, it } from "vitest";
import type { PlayerStatistics } from "../../../shared/types/game";
import { LevelRunTracker } from "./LevelRunTracker";

const idleInput = {
  left: false,
  right: false,
  jumpJustPressed: false,
  meleeJustPressed: false,
  spinJustPressed: false,
  healJustPressed: false,
  powerJustPressed: false,
};

function createStatistics(): PlayerStatistics {
  return { runsPlayed: 0, completedRuns: 0, defeats: 0, gameplaySeconds: 0, actions: 0 };
}

describe("LevelRunTracker", () => {
  it("counts direction changes and discrete actions", () => {
    const tracker = new LevelRunTracker();
    tracker.advance(30_000);
    tracker.trackInput({ ...idleInput, right: true });
    tracker.trackInput({ ...idleInput, right: true, jumpJustPressed: true });
    tracker.trackInput({ ...idleInput, left: true, meleeJustPressed: true });

    expect(tracker.actionsPerMinute).toBe(8);
  });

  it("records each run only once", () => {
    const tracker = new LevelRunTracker();
    const statistics = createStatistics();
    tracker.advance(1_600);
    tracker.trackInput({ ...idleInput, spinJustPressed: true });

    expect(tracker.record(statistics, "completed")).toBe(true);
    expect(tracker.record(statistics, "defeat")).toBe(false);
    expect(statistics).toEqual({ runsPlayed: 1, completedRuns: 1, defeats: 0, gameplaySeconds: 2, actions: 1 });
  });
});
