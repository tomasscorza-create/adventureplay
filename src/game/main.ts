import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, MOBILE_GAMEPLAY_QUERY } from "../shared/constants/game";
import { createPhaserConfig } from "./config/gameConfig";
import {
  getMobileRenderScale,
  mobileGameplaySettingsStore,
} from "./systems/input/MobileGameplaySettings";

export function createGame(parent: string): Phaser.Game {
  const game = new Phaser.Game(createPhaserConfig(parent));
  const syncRenderSize = () => {
    const mobileGameplay = window.matchMedia(MOBILE_GAMEPLAY_QUERY).matches;
    const renderScale = mobileGameplay
      ? getMobileRenderScale(mobileGameplaySettingsStore.getSettings().performanceMode)
      : 1;
    game.scale.resize(
      Math.round(GAME_WIDTH * renderScale),
      Math.round(GAME_HEIGHT * renderScale),
    );
  };
  const unbindSettings = mobileGameplaySettingsStore.onChange(syncRenderSize);
  window.addEventListener("resize", syncRenderSize);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    unbindSettings();
    window.removeEventListener("resize", syncRenderSize);
  });
  return game;
}
