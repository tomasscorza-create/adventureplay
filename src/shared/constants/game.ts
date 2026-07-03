export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const MOBILE_GAMEPLAY_QUERY = "(pointer: coarse), (max-width: 720px), (max-height: 520px)";
export const MOBILE_GAMEPLAY_CAMERA_ZOOM = 1.15;
export const MOBILE_GAMEPLAY_FLOOR_EXTENSION = 160;
export const MOBILE_GAMEPLAY_VISIBLE_TOP = MOBILE_GAMEPLAY_FLOOR_EXTENSION
  + (GAME_HEIGHT - GAME_HEIGHT / MOBILE_GAMEPLAY_CAMERA_ZOOM) / 2;
export const SPIN_ATTACK_COOLDOWN_MS = 6000;

export const PLAYER_DEFAULTS = {
  maxHealth: 4,
  speed: 280,
  jumpPower: 560,
  meleeDamage: 1,
  rangedDamage: 1,
} as const;
