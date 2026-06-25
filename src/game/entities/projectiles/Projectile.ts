import Phaser from "phaser";

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  readonly damage: number;

  constructor(scene: Phaser.Scene, x: number, y: number, direction: -1 | 1, damage: number) {
    super(scene, x, y, "projectile");
    this.damage = damage;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(13);
    this.setVelocityX(520 * direction);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.body?.setSize(12, 6);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.x < -40 || this.x > 1320) {
      this.destroy();
    }
  }
}
