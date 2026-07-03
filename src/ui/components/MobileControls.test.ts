import { describe, expect, it } from "vitest";
import { isInOpenJumpArea } from "./mobileControlsInput";

describe("isInOpenJumpArea", () => {
  it("ignores the left half of the viewport", () => {
    expect(isInOpenJumpArea(0, 844)).toBe(false);
    expect(isInOpenJumpArea(421, 844)).toBe(false);
  });

  it("accepts the center boundary and the right half", () => {
    expect(isInOpenJumpArea(422, 844)).toBe(true);
    expect(isInOpenJumpArea(843, 844)).toBe(true);
  });
});
