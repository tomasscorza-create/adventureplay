export function isInOpenJumpArea(pointerX: number, viewportWidth: number): boolean {
  return viewportWidth > 0 && pointerX >= viewportWidth / 2;
}
