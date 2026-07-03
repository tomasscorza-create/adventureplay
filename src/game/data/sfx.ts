export type SfxCue =
  | "ui-click"
  | "jump"
  | "sword-swing"
  | "heal"
  | "lethal-power"
  | "enemy-hit"
  | "enemy-defeat"
  | "player-hit"
  | "coin"
  | "pickup"
  | "checkpoint"
  | "progress"
  | "level-complete"
  | "game-over";

export interface SfxDefinition {
  sources: readonly string[];
  volume: number;
  playbackRate?: readonly [number, number];
  cooldownMs?: number;
}

export const sfxDefinitions: Record<SfxCue, SfxDefinition> = {
  "ui-click": { sources: ["/sfx/ui-click.ogg"], volume: 0.42, playbackRate: [0.96, 1.04], cooldownMs: 35 },
  jump: { sources: ["/sfx/jump.ogg"], volume: 0.48, playbackRate: [0.96, 1.04] },
  "sword-swing": {
    sources: ["/sfx/sword-swing-1.ogg", "/sfx/sword-swing-2.ogg"],
    volume: 0.62,
    playbackRate: [0.94, 1.06],
    cooldownMs: 70,
  },
  heal: { sources: ["/sfx/heal.ogg"], volume: 0.58 },
  "lethal-power": { sources: ["/sfx/lethal-power.ogg"], volume: 0.62 },
  "enemy-hit": {
    sources: ["/sfx/enemy-hit-1.ogg", "/sfx/enemy-hit-2.ogg"],
    volume: 0.57,
    playbackRate: [0.92, 1.08],
    cooldownMs: 40,
  },
  "enemy-defeat": { sources: ["/sfx/enemy-defeat.ogg"], volume: 0.64, playbackRate: [0.94, 1.04] },
  "player-hit": {
    sources: ["/sfx/player-hit-1.ogg", "/sfx/player-hit-2.ogg"],
    volume: 0.68,
    playbackRate: [0.94, 1.03],
    cooldownMs: 90,
  },
  coin: {
    sources: ["/sfx/coin-1.ogg", "/sfx/coin-2.ogg"],
    volume: 0.46,
    playbackRate: [0.97, 1.08],
    cooldownMs: 30,
  },
  pickup: { sources: ["/sfx/pickup.ogg"], volume: 0.55, playbackRate: [0.97, 1.04] },
  checkpoint: { sources: ["/sfx/checkpoint.ogg"], volume: 0.55 },
  progress: { sources: ["/sfx/progress.ogg"], volume: 0.48, cooldownMs: 100 },
  "level-complete": { sources: ["/sfx/level-complete.ogg"], volume: 0.68, cooldownMs: 1_000 },
  "game-over": { sources: ["/sfx/game-over.ogg"], volume: 0.68, cooldownMs: 1_000 },
};
