import { describe, expect, it } from "vitest";
import { MOBILE_GAMEPLAY_VISIBLE_TOP } from "../../../shared/constants/game";
import { getMobileJumpFollowTop } from "./mobileJumpFollow";

describe("getMobileJumpFollowTop", () => {
  const visibleHeight = 626;
  const followStartY = MOBILE_GAMEPLAY_VISIBLE_TOP + visibleHeight * 0.34;

  it("keeps the resting mobile framing inside the comfortable zone", () => {
    expect(getMobileJumpFollowTop(followStartY, visibleHeight)).toBe(
      MOBILE_GAMEPLAY_VISIBLE_TOP,
    );
  });

  it("lifts the view progressively as the player rises", () => {
    const shallowLift = getMobileJumpFollowTop(followStartY - 40, visibleHeight);
    const highLift = getMobileJumpFollowTop(followStartY - 120, visibleHeight);

    expect(shallowLift).toBeLessThan(MOBILE_GAMEPLAY_VISIBLE_TOP);
    expect(highLift).toBeLessThan(shallowLift);
  });

  it("limits the lift at extreme jump heights", () => {
    expect(getMobileJumpFollowTop(-1000, visibleHeight)).toBe(
      MOBILE_GAMEPLAY_VISIBLE_TOP - 150,
    );
  });
});
