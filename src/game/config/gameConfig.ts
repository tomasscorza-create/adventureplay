import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../../shared/constants/game";
import { BattleScene } from "../scenes/BattleScene";
import { BootScene } from "../scenes/BootScene";
import { GameOverScene } from "../scenes/GameOverScene";
import { LevelScene } from "../scenes/LevelScene";
import { MainMenuScene } from "../scenes/MainMenuScene";
import { PreloadScene } from "../scenes/PreloadScene";
import { UIScene } from "../scenes/UIScene";
import { WorldMapScene } from "../scenes/WorldMapScene";

export function createPhaserConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#101624",
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
    },
  };
}
