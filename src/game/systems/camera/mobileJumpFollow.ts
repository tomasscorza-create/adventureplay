import { MOBILE_GAMEPLAY_VISIBLE_TOP } from "../../../shared/constants/game";

const MOBILE_JUMP_FOLLOW_START_RATIO = 0.34;
const MOBILE_JUMP_FOLLOW_STRENGTH = 0.58;
const MOBILE_JUMP_FOLLOW_MAX_LIFT = 150;

export function getMobileJumpFollowTop(
  playerTop: number,
  visibleHeight: number,
): number {
  const followStartY = MOBILE_GAMEPLAY_VISIBLE_TOP
    + visibleHeight * MOBILE_JUMP_FOLLOW_START_RATIO;
  const heightAboveFollowStart = Math.max(0, followStartY - playerTop);
  const lift = Math.min(
    MOBILE_JUMP_FOLLOW_MAX_LIFT,
    heightAboveFollowStart * MOBILE_JUMP_FOLLOW_STRENGTH,
  );

  return MOBILE_GAMEPLAY_VISIBLE_TOP - lift;
}
