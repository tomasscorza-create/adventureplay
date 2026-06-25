import Phaser from "phaser";
import { enemyDefinitions } from "../../data/enemies";
import type { Player } from "../player/Player";
import { BaseEnemy } from "./BaseEnemy";

export class M1Enemy extends BaseEnemy {
  private readonly minChaseDistance = 14;
  private readonly verticalAwareness = 260;
  private readonly chaseMemoryMs = 2600;
  private readonly jumpCooldownMs = 900;
  private readonly jumpPower = 420;
  private lastSawTargetAt = Number.NEGATIVE_INFINITY;
  private lastJumpAt = Number.NEGATIVE_INFINITY;

  constructor(scene: Phaser.Scene, x: number, y: number, patrolDistance: number) {
    const definition = enemyDefinitions.m1;
    if (!definition) {
      throw new Error("Unknown enemy definition: m1");
    }

    super(scene, x, y, "enemy-m1", definition, patrolDistance);
    this.setData("stompable", true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(32, 34);
    body.setOffset(7, 10);
  }

  override update(target?: Player): void {
    if (!this.active || !target?.active) {
      super.update(target);
      return;
    }

    const distanceX = target.x - this.x;
    const distanceY = Math.abs(target.y - this.y);
    const chaseRange = this.definition.chaseRange ?? 260;
    const now = this.scene.time.now;
    const targetInSight =
      Math.abs(distanceX) <= chaseRange &&
      distanceY <= this.verticalAwareness;

    if (targetInSight) {
      this.lastSawTargetAt = now;
    }

    const shouldChase =
      now - this.lastSawTargetAt <= this.chaseMemoryMs &&
      Math.abs(distanceX) > this.minChaseDistance;

    if (!shouldChase) {
      super.update(target);
      return;
    }

    this.direction = distanceX < 0 ? -1 : 1;
    this.setVelocityX(this.definition.speed * this.direction);
    this.setFlipX(this.direction < 0);
    this.tryJumpTowardTarget(target, distanceX, now);
  }

  private tryJumpTowardTarget(target: Player, distanceX: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const canJump = body.blocked.down || body.touching.down;
    if (!canJump || now - this.lastJumpAt < this.jumpCooldownMs) {
      return;
    }

    const isBlockedAhead =
      (this.direction < 0 && (body.blocked.left || body.touching.left)) ||
      (this.direction > 0 && (body.blocked.right || body.touching.right));
    const targetIsHigher = target.y < this.y - 34 && Math.abs(distanceX) < 420;
    const chaseHop = Math.abs(distanceX) > 180 && now - this.lastJumpAt > 1350;

    if (!isBlockedAhead && !targetIsHigher && !chaseHop) {
      return;
    }

    this.setVelocityY(-this.jumpPower);
    this.lastJumpAt = now;
  }
}
