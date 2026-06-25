import Phaser from "phaser";
import { GAME_HEIGHT } from "../../../shared/constants/game";

export class CameraSystem {
  setBounds(scene: Phaser.Scene, worldWidth: number): void {
    scene.cameras.main.setBounds(0, 0, worldWidth, GAME_HEIGHT);
  }

  follow(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, worldWidth: number): void {
    this.setBounds(scene, worldWidth);
    scene.cameras.main.startFollow(target, true, 0.08, 0.08);
  }
}
