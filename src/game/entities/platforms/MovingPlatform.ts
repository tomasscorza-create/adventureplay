import Phaser from "phaser";
import type { LevelTheme, PlatformDefinition } from "../../../shared/types/game";

export class MovingPlatform extends Phaser.GameObjects.Rectangle {
  private readonly visual: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly originPosition: number;
  private readonly axis: "x" | "y";
  private readonly distance: number;
  private readonly speed: number;
  private direction: -1 | 1 = 1;

  constructor(scene: Phaser.Scene, definition: PlatformDefinition, theme: LevelTheme) {
    super(scene, definition.x, definition.y, definition.width, definition.height, 0x000000, 0);

    const movement = definition.movement;
    if (!movement) {
      throw new Error("MovingPlatform requires a movement definition");
    }

    this.axis = movement.axis;
    this.distance = movement.distance;
    this.speed = movement.speed;
    this.originPosition = this.axis === "x" ? definition.x : definition.y;

    this.setOrigin(0, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5);

    this.shadow = scene.add
      .ellipse(
        definition.x + definition.width / 2,
        definition.y + definition.height + 20,
        definition.width * 0.82,
        34,
        0x020707,
        0.32,
      )
      .setDepth(1);

    this.visual = scene.add
      .image(definition.x + definition.width / 2, definition.y - 26, "terrain-platform-mid-a")
      .setOrigin(0.5, 0)
      .setDisplaySize(definition.width, 78)
      .setDepth(5);
    if (theme === "enchanted-forest") {
      this.visual.setTint(0x79a66f);
      this.shadow.setFillStyle(0x0b2824, 0.42);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(definition.width, definition.height);
    body.setVelocity(
      this.axis === "x" ? this.speed : 0,
      this.axis === "y" ? this.speed : 0,
    );
  }

  update(): void {
    const currentPosition = this.axis === "x" ? this.x : this.y;
    if (
      (this.direction > 0 && currentPosition >= this.originPosition + this.distance) ||
      (this.direction < 0 && currentPosition <= this.originPosition - this.distance)
    ) {
      this.direction *= -1;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      this.axis === "x" ? this.speed * this.direction : 0,
      this.axis === "y" ? this.speed * this.direction : 0,
    );

    const centerX = this.x + this.width / 2;
    this.visual.setPosition(centerX, this.y - 26);
    this.shadow.setPosition(centerX, this.y + this.height + 20);
  }

  destroy(fromScene?: boolean): void {
    this.visual.destroy();
    this.shadow.destroy();
    super.destroy(fromScene);
  }
}
