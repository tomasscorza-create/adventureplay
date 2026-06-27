import Phaser from "phaser";
import { enemyDefinitions } from "../../data/enemies";
import type { Player } from "../player/Player";
import { BaseEnemy } from "./BaseEnemy";

export class M3Enemy extends BaseEnemy {
  private readonly minChaseDistance = 18;
  private readonly verticalAwareness = 320;
  private readonly jumpCooldownMs = 780;
  private readonly jumpPower = 455;
  private readonly healthBarWidth = 50;
  private readonly healthBarHeight = 4;
  private readonly walkableSurfaces: Phaser.GameObjects.Rectangle[];
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private lastJumpAt = Number.NEGATIVE_INFINITY;
  private gapBoostUntil = Number.NEGATIVE_INFINITY;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    walkableSurfaces: Phaser.GameObjects.Rectangle[],
  ) {
    const definition = enemyDefinitions.m3;
    if (!definition) {
      throw new Error("Unknown enemy definition: m3");
    }

    super(scene, x, y, "enemy-m3-run-1", definition, 0);
    this.walkableSurfaces = walkableSurfaces;
    this.setDepth(12);
    this.setDisplaySize(84, 82);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.48, this.height * 0.68);
    body.setOffset(this.width * 0.26, this.height * 0.25);

    this.healthBar = scene.add.graphics().setDepth(20);
    this.drawHealthBar();
    this.positionHealthBar();
  }

  override update(target?: Player): void {
    if (!this.active) {
      this.healthBar.setVisible(false);
      return;
    }

    this.positionHealthBar();
    if (!target?.active) {
      this.setVelocityX(0);
      this.setRunningAnimation(false);
      return;
    }

    const distanceX = target.x - this.x;
    const distanceY = Math.abs(target.y - this.y);
    const targetInRange =
      Math.abs(distanceX) <= (this.definition.chaseRange ?? 1800) &&
      distanceY <= this.verticalAwareness;

    if (!targetInRange || Math.abs(distanceX) <= this.minChaseDistance) {
      this.setVelocityX(0);
      this.setRunningAnimation(false);
      return;
    }

    this.direction = distanceX < 0 ? -1 : 1;
    this.setFlipX(this.direction < 0);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const isGrounded = body.blocked.down || body.touching.down;
    if (isGrounded && !this.hasGroundAhead(this.direction)) {
      if (this.canReachLandingSurface(this.direction) && this.canJumpNow()) {
        this.startGapJump();
        this.setRunningAnimation(true);
      } else {
        this.setVelocityX(0);
        this.setRunningAnimation(false);
      }
      return;
    }

    const gapBoost = !isGrounded && this.scene.time.now < this.gapBoostUntil ? 2.25 : 1;
    this.setVelocityX(this.definition.speed * gapBoost * this.direction);
    this.setRunningAnimation(true);
    this.tryJumpTowardTarget(target, distanceX);
  }

  override takeDamage(amount: number): boolean {
    const isLethalPower = amount >= Number.MAX_SAFE_INTEGER;
    const defeated = super.takeDamage(isLethalPower ? amount : 1);
    if (defeated) {
      this.healthBar.setVisible(false);
      return true;
    }

    this.drawHealthBar();
    return false;
  }

  private tryJumpTowardTarget(target: Player, distanceX: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;
    const isGrounded = body.blocked.down || body.touching.down;
    if (!isGrounded || now - this.lastJumpAt < this.jumpCooldownMs) {
      return;
    }

    const isBlockedAhead =
      (this.direction < 0 && (body.blocked.left || body.touching.left)) ||
      (this.direction > 0 && (body.blocked.right || body.touching.right));
    const targetIsHigher = target.y < this.y - 44 && Math.abs(distanceX) < 460;
    if (!isBlockedAhead && !targetIsHigher) {
      return;
    }

    this.setVelocityY(-this.jumpPower);
    this.lastJumpAt = now;
  }

  private hasGroundAhead(direction: -1 | 1): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const probeX = body.center.x + direction * (body.halfWidth + 18);
    const footY = body.bottom;

    return this.walkableSurfaces.some((surface) => {
      if (!surface.active) {
        return false;
      }

      const bounds = surface.getBounds();
      return (
        probeX >= bounds.left &&
        probeX <= bounds.right &&
        bounds.top >= footY - 12 &&
        bounds.top <= footY + 72
      );
    });
  }

  private canReachLandingSurface(direction: -1 | 1): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const footY = body.bottom;

    return this.walkableSurfaces.some((surface) => {
      if (!surface.active) {
        return false;
      }

      const bounds = surface.getBounds();
      const gap = direction > 0 ? bounds.left - body.right : body.left - bounds.right;
      return gap >= 0 && gap <= 230 && Math.abs(bounds.top - footY) <= 125;
    });
  }

  private canJumpNow(): boolean {
    return this.scene.time.now - this.lastJumpAt >= this.jumpCooldownMs;
  }

  private startGapJump(): void {
    const now = this.scene.time.now;
    this.setVelocity(this.definition.speed * 2.25 * this.direction, -this.jumpPower);
    this.lastJumpAt = now;
    this.gapBoostUntil = now + 900;
  }

  private setRunningAnimation(isRunning: boolean): void {
    if (isRunning) {
      this.play("enemy-m3-run", true);
      return;
    }

    this.anims.stop();
    this.setTexture("enemy-m3-run-1");
  }

  private drawHealthBar(): void {
    const ratio = Phaser.Math.Clamp(this.health / this.definition.health, 0, 1);
    this.healthBar.clear();
    this.healthBar.fillStyle(0x16090b, 0.9);
    this.healthBar.fillRoundedRect(0, 0, this.healthBarWidth, this.healthBarHeight, 2);
    this.healthBar.fillStyle(0xe8293f, 1);
    this.healthBar.fillRoundedRect(1, 1, (this.healthBarWidth - 2) * ratio, this.healthBarHeight - 2, 1);
    this.healthBar.lineStyle(1, 0xffb4bc, 0.75);
    this.healthBar.strokeRoundedRect(0, 0, this.healthBarWidth, this.healthBarHeight, 2);
  }

  private positionHealthBar(): void {
    this.healthBar.setPosition(
      this.x - this.healthBarWidth / 2,
      this.y - this.displayHeight / 2 - 12,
    );
  }
}
