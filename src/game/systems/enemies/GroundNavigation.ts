import Phaser from "phaser";

export function hasGroundAhead(
  body: Phaser.Physics.Arcade.Body,
  surfaces: Phaser.GameObjects.Rectangle[],
  direction: -1 | 1,
  probeDistance = 18,
): boolean {
  const probeX = body.center.x + direction * (body.halfWidth + probeDistance);
  const footY = body.bottom;

  return surfaces.some((surface) => {
    if (!surface.active) {
      return false;
    }

    const bounds = surface.getBounds();
    return (
      probeX >= bounds.left &&
      probeX <= bounds.right &&
      bounds.top >= footY - 12 &&
      bounds.top <= footY + 72
    );
  });
}

export function canReachLandingSurface(
  body: Phaser.Physics.Arcade.Body,
  surfaces: Phaser.GameObjects.Rectangle[],
  direction: -1 | 1,
  maxGap: number,
  maxHeightDifference = 125,
): boolean {
  const footY = body.bottom;

  return surfaces.some((surface) => {
    if (!surface.active) {
      return false;
    }

    const bounds = surface.getBounds();
    const gap = direction > 0 ? bounds.left - body.right : body.left - bounds.right;
    return gap >= 0 && gap <= maxGap && Math.abs(bounds.top - footY) <= maxHeightDifference;
  });
}
