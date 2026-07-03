import Phaser from "phaser";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  MOBILE_GAMEPLAY_QUERY,
  MOBILE_GAME_RENDER_SCALE,
} from "../../shared/constants/game";
import { BattleScene } from "../scenes/BattleScene";
import { BootScene } from "../scenes/BootScene";
import { GameOverScene } from "../scenes/GameOverScene";
import { LevelScene } from "../scenes/LevelScene";
import { MainMenuScene } from "../scenes/MainMenuScene";
import { PreloadScene } from "../scenes/PreloadScene";
import { UIScene } from "../scenes/UIScene";
import { WorldMapScene } from "../scenes/WorldMapScene";

export function createPhaserConfig(parent: string): Phaser.Types.Core.GameConfig {
  const usesMobileRenderProfile = window.matchMedia(MOBILE_GAMEPLAY_QUERY).matches;
  const renderScale = usesMobileRenderProfile ? MOBILE_GAME_RENDER_SCALE : 1;

  return {
    type: Phaser.AUTO,
    parent,
    width: Math.round(GAME_WIDTH * renderScale),
    height: Math.round(GAME_HEIGHT * renderScale),
    backgroundColor: "#101624",
    render: {
      powerPreference: "high-performance",
      roundPixels: usesMobileRenderProfile,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 900 },
        debug: false,
      },
    },
    scene: [
      BootScene,
      PreloadScene,
      MainMenuScene,
      WorldMapScene,
      LevelScene,
      BattleScene,
      UIScene,
      GameOverScene,
    ],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      autoRound: true,
    },
  };
}
