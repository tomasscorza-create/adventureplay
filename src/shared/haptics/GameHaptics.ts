import { MOBILE_GAMEPLAY_QUERY } from "../constants/game";
import { mobileGameplaySettingsStore } from "../../game/systems/input/MobileGameplaySettings";

export type HapticCue = "control" | "joystick" | "jump" | "attack" | "spin" | "damage" | "ready";

const hapticPatterns: Record<HapticCue, number | number[]> = {
  control: 8,
  joystick: 7,
  jump: 10,
  attack: 14,
  spin: [18, 24, 28],
  damage: [35, 28, 55],
  ready: [12, 35, 12],
};

const cueCooldownMs: Partial<Record<HapticCue, number>> = {
  control: 35,
};

const strengthFactors = {
  soft: 0.65,
  balanced: 1,
  strong: 1.45,
} as const;

class GameHaptics {
  private readonly lastPlayedAt = new Map<HapticCue, number>();

  play(cue: HapticCue): void {
    const settings = mobileGameplaySettingsStore.getSettings();
    if (
      typeof navigator === "undefined"
      || typeof navigator.vibrate !== "function"
      || !window.matchMedia(MOBILE_GAMEPLAY_QUERY).matches
      || !settings.hapticsEnabled
    ) {
      return;
    }

    const now = performance.now();
    const cooldown = cueCooldownMs[cue] ?? 0;
    if (now - (this.lastPlayedAt.get(cue) ?? -Infinity) < cooldown) {
      return;
    }
    this.lastPlayedAt.set(cue, now);

    const strength = strengthFactors[settings.hapticStrength];
    const pattern = hapticPatterns[cue];
    navigator.vibrate(
      typeof pattern === "number"
        ? Math.max(1, Math.round(pattern * strength))
        : pattern.map((duration) => Math.max(1, Math.round(duration * strength))),
    );
  }
}

export const gameHaptics = new GameHaptics();
