import { afterEach, describe, expect, it } from "vitest";
import { touchInputStore } from "./TouchInputStore";

describe("TouchInputStore", () => {
  afterEach(() => touchInputStore.reset());

  it("keeps held movement active while another finger taps an action", () => {
    touchInputStore.setAction("right", true);
    touchInputStore.setAction("melee", true);
    touchInputStore.setAction("melee", false);

    expect(touchInputStore.getState().right).toBe(true);
    expect(touchInputStore.wasJustPressed("melee")).toBe(true);
  });

  it("keeps a quick release and repress queued until Phaser consumes the frame", () => {
    touchInputStore.setAction("jump", true);
    touchInputStore.setAction("jump", false);
    touchInputStore.setAction("jump", true);

    expect(touchInputStore.wasJustPressed("jump")).toBe(true);
  });
});
