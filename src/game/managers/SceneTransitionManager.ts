import Phaser from "phaser";

export class SceneTransitionManager {
  constructor(private readonly scene: Phaser.Scene) {}

  start(sceneKey: string, data?: object): void {
    this.scene.scene.start(sceneKey, data);
  }
}
