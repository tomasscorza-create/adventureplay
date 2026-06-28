import Phaser from "phaser";

export interface ReachableLanding {
  surface: Phaser.GameObjects.Rectangle;
  targetX: number;
  gap: number;
}

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
  return findReachableLandingSurface(
    body,
    surfaces,
    direction,
    maxGap,
    maxHeightDifference,
  ) !== undefined;
}

export function findReachableLandingSurface(
  body: Phaser.Physics.Arcade.Body,
  surfaces: Phaser.GameObjects.Rectangle[],
  direction: -1 | 1,
  maxGap: number,
  maxHeightDifference = 125,
): ReachableLanding | undefined {
  const footY = body.bottom;
  const candidates = surfaces.flatMap((surface): ReachableLanding[] => {
    if (!surface.active || surface.displayWidth < body.width + 28) {
      return [];
    }

    const bounds = surface.getBounds();
    const surfaceBody = (surface as Phaser.GameObjects.Rectangle & {
      body?: Phaser.Physics.Arcade.Body;
    }).body;
    const predictedOffsetX = surfaceBody?.velocity
      ? Phaser.Math.Clamp(surfaceBody.velocity.x * 0.42, -54, 54)
      : 0;
    const predictedLeft = bounds.left + predictedOffsetX;
    const predictedRight = bounds.right + predictedOffsetX;
    const gap = direction > 0 ? predictedLeft - body.right : body.left - predictedRight;
    if (gap < 0 || gap > maxGap || Math.abs(bounds.top - footY) > maxHeightDifference) {
      return [];
    }

    const landingInset = Math.max(body.halfWidth + 16, 34);
    return [{
      surface,
      gap,
      targetX: direction > 0
        ? predictedLeft + landingInset
        : predictedRight - landingInset,
    }];
  });

  return candidates.sort((a, b) => a.gap - b.gap)[0];
}
