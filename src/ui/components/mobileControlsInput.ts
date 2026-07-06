export interface JoystickIntent {
  left: boolean;
  right: boolean;
}

export type TouchControlZone = "action" | "guard" | "outside";

export const JOYSTICK_JUMP_GUARD_PX = 32;

export const ACTION_WHEEL_ORBIT_GEOMETRY = {
  width: 220,
  height: 150,
  centerX: 110,
  centerY: 116,
  maxOrbitRadius: 84,
  maxSatelliteRadius: 27,
} as const;

const actionWheelBaseAngles = {
  spin: -90,
  heal: -158,
  power: -22,
} as const;

export function getActionWheelOrbitAngles(rotationDegrees: number) {
  const rotation = Math.max(-30, Math.min(30, rotationDegrees));
  return {
    spin: actionWheelBaseAngles.spin + rotation,
    heal: actionWheelBaseAngles.heal + rotation * 0.4,
    power: actionWheelBaseAngles.power + rotation * 0.4,
  };
}

interface TouchControlBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function getTouchControlZone(
  pointerX: number,
  pointerY: number,
  bounds: TouchControlBounds,
  actionReach: number,
  guardReach: number,
): TouchControlZone {
  const deltaX = Math.max(bounds.left - pointerX, 0, pointerX - bounds.right);
  const deltaY = Math.max(bounds.top - pointerY, 0, pointerY - bounds.bottom);
  const distance = Math.hypot(deltaX, deltaY);

  if (distance <= actionReach) {
    return "action";
  }

  return distance <= guardReach ? "guard" : "outside";
}

export function getJoystickIntent(deltaX: number, deadZone: number): JoystickIntent {
  return {
    left: deltaX <= -deadZone,
    right: deltaX >= deadZone,
  };
}
