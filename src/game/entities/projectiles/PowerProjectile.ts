import Phaser from "phaser";

export class PowerProjectile extends Phaser.Physics.Arcade.Sprite {
  private readonly travelDirection: -1 | 1;
  private consumed = false;

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
  }

  launch(): void {
    if (this.consumed || !this.body?.enable) return;
    this.setVelocity(780 * this.travelDirection, 0);
  }

  consume(): boolean {
    if (this.consumed || !this.active || !this.body?.enable) return false;

    this.consumed = true;
    this.disableBody(true, true);
    this.scene.events.once(Phaser.Scenes.Events.POST_UPDATE, () => this.destroy());
    return true;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const view = this.scene.cameras.main.worldView;
    if (this.x < view.left - this.width || this.x > view.right + this.width) {
      this.destroy();
    }
  }
}
