import { describe, expect, it } from "vitest";
import { getJoystickIntent, getTouchControlZone } from "./mobileControlsInput";

describe("getTouchControlZone", () => {
  const bounds = { left: 100, right: 160, top: 200, bottom: 260 };

  it("extends a control action beyond its visible bounds", () => {
    expect(getTouchControlZone(92, 230, bounds, 12, 26)).toBe("action");
  });

  it("reserves a guard halo where a nearby miss cannot jump", () => {
    expect(getTouchControlZone(80, 230, bounds, 12, 26)).toBe("guard");
  });

  it("leaves the rest of the screen available for jumping", () => {
    expect(getTouchControlZone(60, 230, bounds, 12, 26)).toBe("outside");
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
