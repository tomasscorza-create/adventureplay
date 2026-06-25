import Phaser from "phaser";
import { createPhaserConfig } from "./config/gameConfig";

export function createGame(parent: string): Phaser.Game {
  return new Phaser.Game(createPhaserConfig(parent));
}
