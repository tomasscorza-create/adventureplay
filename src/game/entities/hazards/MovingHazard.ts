import Phaser from "phaser";
import type { LevelHazardDefinition } from "../../../shared/types/game";

export class MovingHazard extends Phaser.Physics.Arcade.Sprite {
  readonly damage: number;
  private readonly originPosition: number;
  private readonly axis: "x" | "y";
  private readonly distance: number;
  private readonly speed: number;
  private direction: -1 | 1 = 1;

  constructor(scene: Phaser.Scene, definition: LevelHazardDefinition) {
    super(scene, definition.x, definition.y, "hazard-saw");
    this.damage = definition.damage;
    this.axis = definition.axis ?? "x";
    this.distance = definition.distance ?? 120;
    this.speed = definition.speed ?? 80;
    this.originPosition = this.axis === "x" ? definition.x : definition.y;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(11);
    this.setImmovable(true);
    this.setData("hazardType", definition.type);
    this.setData("damage", definition.damage);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(definition.width, definition.height);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.rotation += 0.008 * delta;

    const currentPosition = this.axis === "x" ? this.x : this.y;
    if (Math.abs(currentPosition - this.originPosition) >= this.distance) {
      this.direction *= -1;
    }

    if (this.axis === "x") {
      this.setVelocity(this.speed * this.direction, 0);
      return;
    }

    this.setVelocity(0, this.speed * this.direction);
  }
}
