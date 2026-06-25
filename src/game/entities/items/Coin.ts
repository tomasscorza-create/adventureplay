import Phaser from "phaser";

export class Coin extends Phaser.Physics.Arcade.Sprite {
  readonly itemId: string;

  constructor(scene: Phaser.Scene, x: number, y: number, itemId: string) {
    super(scene, x, y, "coin");
    this.itemId = itemId;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(9);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  }
}
