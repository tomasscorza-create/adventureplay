import { describe, expect, it } from "vitest";
import { getJoystickIntent, isInOpenJumpArea } from "./mobileControlsInput";

describe("isInOpenJumpArea", () => {
  it("ignores the left half of the viewport", () => {
    expect(isInOpenJumpArea(0, 844)).toBe(false);
    expect(isInOpenJumpArea(421, 844)).toBe(false);
  });

  it("accepts the center boundary and the right half", () => {
    expect(isInOpenJumpArea(422, 844)).toBe(true);
    expect(isInOpenJumpArea(843, 844)).toBe(true);
  });

  it("can move the open jump area to the left half", () => {
    expect(isInOpenJumpArea(0, 844, "left")).toBe(true);
    expect(isInOpenJumpArea(421, 844, "left")).toBe(true);
    expect(isInOpenJumpArea(422, 844, "left")).toBe(false);
  });
});

describe("getJoystickIntent", () => {
  it("maps the three joystick extremes to movement and jump", () => {
    expect(getJoystickIntent(-30, 0, 18)).toEqual({ left: true, right: false, jump: false });
    expect(getJoystickIntent(30, 0, 18)).toEqual({ left: false, right: true, jump: false });
    expect(getJoystickIntent(0, -30, 18)).toEqual({ left: false, right: false, jump: true });
  });

  it("allows a diagonal jump while advancing", () => {
    expect(getJoystickIntent(30, -30, 18)).toEqual({ left: false, right: true, jump: true });
  });
});
