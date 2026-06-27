import Phaser from "phaser";

export class PowerProjectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "power-projectile");

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(17);
    this.setVelocity(780, 0);
    this.setBlendMode(Phaser.BlendModes.ADD);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false).setGravityY(0);
    this.body?.setSize(34, 20);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const view = this.scene.cameras.main.worldView;
    if (this.x < view.left - this.width || this.x > view.right + this.width) {
      this.destroy();
    }
  }
}
