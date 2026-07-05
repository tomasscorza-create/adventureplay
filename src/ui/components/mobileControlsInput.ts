export interface JoystickIntent {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export type TouchControlZone = "action" | "guard" | "outside";

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

export function getJoystickIntent(deltaX: number, deltaY: number, deadZone: number): JoystickIntent {
  return {
    left: deltaX <= -deadZone,
    right: deltaX >= deadZone,
    jump: deltaY <= -deadZone,
  };
}
