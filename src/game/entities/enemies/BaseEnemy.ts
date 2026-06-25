import Phaser from "phaser";
import type { EnemyDefinition } from "../../../shared/types/game";
import type { Player } from "../player/Player";

export abstract class BaseEnemy extends Phaser.Physics.Arcade.Sprite {
  readonly definition: EnemyDefinition;
  readonly experienceReward: number;
  damage: number;
  protected health: number;
  protected patrolOriginX: number;
  protected patrolDistance: number;
  protected direction: -1 | 1 = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    definition: EnemyDefinition,
    patrolDistance: number,
  ) {
    super(scene, x, y, texture);
    this.definition = definition;
    this.health = definition.health;
    this.damage = definition.damage;
    this.experienceReward = definition.experienceReward;
    this.patrolOriginX = x;
    this.patrolDistance = patrolDistance;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);
    this.setCollideWorldBounds(true);
    this.body?.setSize(28, 28);
  }

  update(_target?: Player): void {
    if (!this.active) {
      return;
    }

    if (this.definition.speed <= 0 || this.patrolDistance <= 0) {
      this.setVelocityX(0);
      return;
    }

    if (Math.abs(this.x - this.patrolOriginX) >= this.patrolDistance) {
      this.direction *= -1;
    }

    this.setVelocityX(this.definition.speed * this.direction);
    this.setFlipX(this.direction < 0);
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(90, () => {
      if (this.active) {
        this.clearTint();
      }
    });

    if (this.health <= 0) {
      this.disableBody(true, true);
      return true;
    }

    return false;
  }
}
