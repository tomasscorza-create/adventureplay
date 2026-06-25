import Phaser from "phaser";
import { enemyDefinitions } from "../../data/enemies";
import type { Player } from "../player/Player";
import { BaseEnemy } from "./BaseEnemy";

export class M2Enemy extends BaseEnemy {
  private readonly verticalAwareness = 320;
  private readonly attackYOffset = 76;
  private readonly verticalSteer = 1.75;
  private readonly maxVerticalSpeed = 118;
  private readonly idleBobSpeed = 0.004;
  private readonly idleBobAmount = 22;
  private readonly patrolOriginY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, patrolDistance: number) {
    const definition = enemyDefinitions.m2;
    if (!definition) {
      throw new Error("Unknown enemy definition: m2");
    }

    super(scene, x, y, "enemy-m2", definition, patrolDistance);
    this.patrolOriginY = y;
    this.direction = -1;
    this.setDepth(13);
    this.setScale(0.24);
    this.play("enemy-m2-fly");

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(178, 118);
    body.setOffset(38, 118);
    body.setCollideWorldBounds(false);
  }

  override update(target?: Player): void {
    if (!this.active) {
      return;
    }

    if (!target?.active) {
      this.patrol();
      return;
    }

    const distanceX = target.x - this.x;
    const distanceY = target.y - this.y;
    const targetInSight =
      Math.abs(distanceX) <= (this.definition.chaseRange ?? 920) &&
      Math.abs(distanceY) <= this.verticalAwareness;

    if (!targetInSight) {
      this.patrol();
      return;
    }

    this.direction = distanceX < 0 ? -1 : 1;
    this.setVelocityX(this.definition.speed * this.direction);
    this.setVelocityY(this.getAttackVerticalVelocity(target));
    this.setFlipX(this.direction > 0);
  }

  private patrol(): void {
    if (Math.abs(this.x - this.patrolOriginX) >= this.patrolDistance) {
      this.direction *= -1;
    }

    const bobTargetY =
      this.patrolOriginY + Math.sin(this.scene.time.now * this.idleBobSpeed) * this.idleBobAmount;

    this.setVelocityX(this.definition.speed * 0.72 * this.direction);
    this.setVelocityY(Phaser.Math.Clamp((bobTargetY - this.y) * 4, -50, 50));
    this.setFlipX(this.direction > 0);
  }

  private getAttackVerticalVelocity(target: Player): number {
    const targetY = Phaser.Math.Clamp(target.y - this.attackYOffset, 305, 548);
    return Phaser.Math.Clamp(
      (targetY - this.y) * this.verticalSteer,
      -this.maxVerticalSpeed,
      this.maxVerticalSpeed,
    );
  }
}
