export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const MOBILE_GAMEPLAY_QUERY = "(pointer: coarse), (max-width: 720px), (max-height: 520px)";
export const MOBILE_GAMEPLAY_CAMERA_ZOOM = 1.15;

export const PLAYER_DEFAULTS = {
  maxHealth: 4,
  speed: 280,
  jumpPower: 560,
  meleeDamage: 1,
  rangedDamage: 1,
} as const;
