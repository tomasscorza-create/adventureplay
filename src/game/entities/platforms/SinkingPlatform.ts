import Phaser from "phaser";
import type { LevelTheme, PlatformDefinition } from "../../../shared/types/game";

export class SinkingPlatform extends Phaser.GameObjects.Rectangle {
  private readonly visual: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly initialY: number;
  private readonly dropDistance: number;
  private readonly fallSpeed: number;
  private readonly returnSpeed: number;
  
  private sinkState: "IDLE" | "SINKING" | "RETURNING" = "IDLE";
  private sinkDelayTimer = 0;

  constructor(scene: Phaser.Scene, definition: PlatformDefinition, theme: LevelTheme) {
    super(scene, definition.x, definition.y, definition.width, definition.height, 0x000000, 0);


    const sinking = definition.sinking;
    if (!sinking) {
      throw new Error("SinkingPlatform requires a sinking definition");
    }

    this.dropDistance = sinking.dropDistance;
    this.fallSpeed = sinking.fallSpeed;
    this.returnSpeed = sinking.returnSpeed;
    this.initialY = definition.y;

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

    // Usa la textura especial o la de la temática (reutilizamos la de plataformas)
    this.visual = scene.add
      .image(definition.x + definition.width / 2, definition.y - 26, "terrain-platform-mid-a")
      .setOrigin(0.5, 0)
      .setDisplaySize(definition.width, 78)
      .setDepth(5)
      .setTintFill(0xff0000); // 100% ROJO PURO SÓLIDO para que no haya duda

    if (theme === "enchanted-forest") {
      this.visual.setTintFill(0xff0000); // Forzado rojo
      this.shadow.setFillStyle(0x0b2824, 0.42);
    } else if (theme === "active-volcano") {
      this.visual.setTintFill(0xff0000); // Forzado rojo
      this.shadow.setFillStyle(0x260909, 0.5);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(definition.width, definition.height);
    // Custom friction to avoid player sliding when moving down
    body.friction.set(1, 1);
  }

  triggerSink(): void {
    if (this.sinkState === "IDLE") {
      this.sinkState = "SINKING";
      this.sinkDelayTimer = 100;
    }
  }

  update(_time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    switch (this.sinkState) {
      case "IDLE":
        // El estado IDLE ahora espera a ser disparado externamente vía triggerSink() por el colisionador.
        body.setVelocityY(0);
        break;

      case "SINKING":
        if (this.sinkDelayTimer > 0) {
          this.sinkDelayTimer -= delta;
          body.setVelocityY(0);
        } else {
          body.setVelocityY(this.fallSpeed);
          if (this.y >= this.initialY + this.dropDistance) {
            this.sinkState = "RETURNING";
            // Set Y precisely
            this.y = this.initialY + this.dropDistance;
          }
        }
        break;

      case "RETURNING":
        if (body.touching.up) {
          // Si el jugador vuelve a pisarla mientras sube, vuelve a caer
          this.sinkState = "SINKING";
        } else {
          body.setVelocityY(-this.returnSpeed);
          if (this.y <= this.initialY) {
            this.sinkState = "IDLE";
            this.y = this.initialY; // Snap a origen
          }
        }
        break;
    }

    // ACTUALIZACIÓN VISUAL OBLIGATORIA
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
