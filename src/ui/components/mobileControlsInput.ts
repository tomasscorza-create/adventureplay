export type ScreenHalf = "left" | "right";

export interface JoystickIntent {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export function isInOpenJumpArea(
  pointerX: number,
  viewportWidth: number,
  half: ScreenHalf = "right",
): boolean {
  if (viewportWidth <= 0) {
    return false;
  }
  return half === "left"
    ? pointerX < viewportWidth / 2
    : pointerX >= viewportWidth / 2;
}

export function getJoystickIntent(deltaX: number, deltaY: number, deadZone: number): JoystickIntent {
  return {
    left: deltaX <= -deadZone,
    right: deltaX >= deadZone,
    jump: deltaY <= -deadZone,
  };
}
