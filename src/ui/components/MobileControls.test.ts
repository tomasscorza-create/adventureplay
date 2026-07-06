import { describe, expect, it } from "vitest";
import {
  ACTION_WHEEL_ORBIT_GEOMETRY,
  getActionWheelOrbitAngles,
  getJoystickIntent,
  getTouchControlZone,
  JOYSTICK_JUMP_GUARD_PX,
} from "./mobileControlsInput";

describe("getActionWheelOrbitAngles", () => {
  it("keeps the original open spacing at the midpoint and moves outer buttons less", () => {
    const geometry = ACTION_WHEEL_ORBIT_GEOMETRY;
    const midpoint = getActionWheelOrbitAngles(0);
    const start = getActionWheelOrbitAngles(-30);
    const end = getActionWheelOrbitAngles(30);
    const centerFor = (angle: number) => {
      const radians = angle * Math.PI / 180;
      return {
        x: geometry.centerX + Math.cos(radians) * 78,
        y: geometry.centerY + Math.sin(radians) * 78,
      };
    };
    const distance = (first: { x: number; y: number }, second: { x: number; y: number }) => (
      Math.hypot(first.x - second.x, first.y - second.y)
    );

    const spinCenter = centerFor(midpoint.spin);
    const healCenter = centerFor(midpoint.heal);
    const powerCenter = centerFor(midpoint.power);
    expect(distance(spinCenter, healCenter)).toBeGreaterThan(80);
    expect(distance(spinCenter, powerCenter)).toBeGreaterThan(80);
    expect(distance(healCenter, powerCenter)).toBeGreaterThan(140);
    expect(end.spin - start.spin).toBe(60);
    expect(end.heal - start.heal).toBe(24);
    expect(end.power - start.power).toBe(24);
  });

  it("keeps every enlarged satellite inside the wheel at every slider position", () => {
    const geometry = ACTION_WHEEL_ORBIT_GEOMETRY;

    for (let rotation = -30; rotation <= 30; rotation += 1) {
      const angles = getActionWheelOrbitAngles(rotation);
      Object.values(angles).forEach((angle) => {
        const radians = angle * Math.PI / 180;
        const centerX = geometry.centerX + Math.cos(radians) * geometry.maxOrbitRadius;
        const centerY = geometry.centerY + Math.sin(radians) * geometry.maxOrbitRadius;

        expect(centerX - geometry.maxSatelliteRadius).toBeGreaterThanOrEqual(0);
        expect(centerX + geometry.maxSatelliteRadius).toBeLessThanOrEqual(geometry.width);
        expect(centerY - geometry.maxSatelliteRadius).toBeGreaterThanOrEqual(0);
        expect(centerY + geometry.maxSatelliteRadius).toBeLessThanOrEqual(geometry.height);
      });
    }
  });
});

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

  it("keeps a wider no-jump halo around the joystick", () => {
    expect(getTouchControlZone(69, 230, bounds, 0, JOYSTICK_JUMP_GUARD_PX)).toBe("guard");
    expect(getTouchControlZone(67, 230, bounds, 0, JOYSTICK_JUMP_GUARD_PX)).toBe("outside");
  });
});

describe("getJoystickIntent", () => {
  it("maps only the horizontal joystick extremes to movement", () => {
    expect(getJoystickIntent(-30, 18)).toEqual({ left: true, right: false });
    expect(getJoystickIntent(30, 18)).toEqual({ left: false, right: true });
    expect(getJoystickIntent(0, 18)).toEqual({ left: false, right: false });
  });
});
