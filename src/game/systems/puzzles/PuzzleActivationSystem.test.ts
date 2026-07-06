import { describe, expect, it } from "vitest";
import { PuzzleActivationSystem } from "./PuzzleActivationSystem";

describe("PuzzleActivationSystem", () => {
  it("requires every configured activation", () => {
    const system = new PuzzleActivationSystem();
    system.reset(["crate-plate", "upper-lever"]);

    system.setParticipantActive("crate-plate", "crate", true);
    expect(system.isComplete()).toBe(false);
    system.setParticipantActive("upper-lever", "player-1", true);
    expect(system.isComplete()).toBe(true);
  });

  it("keeps a shared activation active while any participant remains", () => {
    const system = new PuzzleActivationSystem();
    system.reset(["crate-plate"]);

    system.setParticipantActive("crate-plate", "player-1", true);
    system.setParticipantActive("crate-plate", "player-2", true);
    system.setParticipantActive("crate-plate", "player-1", false);
    expect(system.isActive("crate-plate")).toBe(true);
    system.setParticipantActive("crate-plate", "player-2", false);
    expect(system.isActive("crate-plate")).toBe(false);
  });
});
