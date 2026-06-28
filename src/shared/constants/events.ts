export const EVENTS = {
  START_GAME: "react:start-game",
  RESUME_GAME: "react:resume-game",
  RESTART_GAME: "react:restart-game",
  GO_TO_MENU: "react:go-to-menu",
  HUD_UPDATED: "game:hud-updated",
  HEALTH_PICKUP_COLLECTED: "game:health-pickup-collected",
  SCREEN_CHANGED: "game:screen-changed",
  LEVEL_COMPLETED: "game:level-completed",
} as const;
