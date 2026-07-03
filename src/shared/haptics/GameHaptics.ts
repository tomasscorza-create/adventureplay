import { MOBILE_GAMEPLAY_QUERY } from "../constants/game";
import { mobileGameplaySettingsStore } from "../../game/systems/input/MobileGameplaySettings";

export type HapticCue = "jump" | "attack" | "spin" | "damage" | "ready";

const hapticPatterns: Record<HapticCue, number | number[]> = {
  jump: 10,
  attack: 14,
  spin: [18, 24, 28],
  damage: [35, 28, 55],
  ready: [12, 35, 12],
};

class GameHaptics {
  play(cue: HapticCue): void {
    if (
      typeof navigator === "undefined"
      || typeof navigator.vibrate !== "function"
      || !window.matchMedia(MOBILE_GAMEPLAY_QUERY).matches
      || !mobileGameplaySettingsStore.getSettings().hapticsEnabled
    ) {
      return;
    }
    navigator.vibrate(hapticPatterns[cue]);
  }
}

export const gameHaptics = new GameHaptics();
