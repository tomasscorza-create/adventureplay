import Phaser from "phaser";

export class PowerProjectile extends Phaser.Physics.Arcade.Sprite {
  private readonly travelDirection: -1 | 1;

  constructor(scene: Phaser.Scene, x: number, y: number, direction: -1 | 1) {
    super(scene, x, y, "power-projectile");

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.travelDirection = direction;
    this.setDepth(17);
    this.setFlipX(direction < 0);
    this.setBlendMode(Phaser.BlendModes.ADD);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false).setGravityY(0);
    this.body?.setSize(34, 20);
    this.launch();
  }

  launch(): void {
    this.setVelocity(780 * this.travelDirection, 0);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body && body.velocity.x === 0) {
      this.launch();
    }
    const view = this.scene.cameras.main.worldView;
    if (this.x < view.left - this.width || this.x > view.right + this.width) {
      this.destroy();
    }
  }
}
