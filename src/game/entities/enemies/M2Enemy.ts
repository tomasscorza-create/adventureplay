import Phaser from "phaser";
import { enemyDefinitions } from "../../data/enemies";
import type { Player } from "../player/Player";
import { BaseEnemy } from "./BaseEnemy";

type M2FlightMode = "patrol" | "track" | "dive" | "recover";

export class M2Enemy extends BaseEnemy {
  private readonly verticalAwareness = 430;
  private readonly trackingYOffset = 145;
  private readonly trackingSideOffset = 150;
  private readonly trackingSteer = 2.6;
  private readonly maxTrackingVerticalSpeed: number;
  private readonly idleBobSpeed = 0.004;
  private readonly idleBobAmount = 22;
  private readonly aggression: number;
  private readonly patrolOriginY: number;
  private flightMode: M2FlightMode = "patrol";
  private nextDiveAt = 0;
  private diveStartedAt = 0;
  private recoverUntil = 0;
  private strikeTarget = new Phaser.Math.Vector2();
  private diveTarget = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number, patrolDistance: number, aggression = 1) {
    const definition = enemyDefinitions.m2;
    if (!definition) {
      throw new Error("Unknown enemy definition: m2");
    }

    super(scene, x, y, "enemy-m2", definition, patrolDistance);
    this.patrolOriginY = y;
    this.aggression = Phaser.Math.Clamp(aggression, 0.75, 1.65);
    this.maxTrackingVerticalSpeed = 115 + this.aggression * 42;
    this.nextDiveAt = scene.time.now + Phaser.Math.Between(450, 950);
    this.direction = -1;
    this.setDepth(13);
    this.setScale(0.24);
    this.play("enemy-m2-fly");

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(214, 156);
    body.setOffset(21, 96);
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

    if (this.flightMode === "dive") {
      this.continueDive(target);
      return;
    }

    if (this.flightMode === "recover") {
      this.recoverFromDive(target);
      return;
    }

    if (!targetInSight) {
      this.flightMode = "patrol";
      this.patrol();
      return;
    }

    this.direction = distanceX < 0 ? -1 : 1;
    this.flightMode = "track";
    this.trackTarget(target);
    this.setFlipX(this.direction > 0);

    if (this.scene.time.now >= this.nextDiveAt) {
      this.startDive(target);
    }
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

  private trackTarget(target: Player): void {
    const preferredSide = this.x < target.x ? -1 : 1;
    const targetX = target.x + this.trackingSideOffset * preferredSide;
    const targetY = Phaser.Math.Clamp(target.y - this.trackingYOffset, 300, 500);
    const horizontalSpeed = this.definition.speed * (0.92 + this.aggression * 0.18);

    this.setVelocityX(Phaser.Math.Clamp((targetX - this.x) * 2.2, -horizontalSpeed, horizontalSpeed));
    this.setVelocityY(
      Phaser.Math.Clamp(
        (targetY - this.y) * this.trackingSteer,
        -this.maxTrackingVerticalSpeed,
        this.maxTrackingVerticalSpeed,
      ),
    );
  }

  private startDive(target: Player): void {
    this.flightMode = "dive";
    this.diveStartedAt = this.scene.time.now;
    this.setTint(0xfff1a1);
    this.setDiveTarget(target);
    this.flyTowardDiveTarget();
  }

  private continueDive(target: Player): void {
    const now = this.scene.time.now;

    if (now - this.diveStartedAt < 420) {
      this.setDiveTarget(target);
    }

    this.flyTowardDiveTarget();

    const closeToOvershoot = Phaser.Math.Distance.Between(this.x, this.y, this.diveTarget.x, this.diveTarget.y) < 28;
    const diveTimedOut = now - this.diveStartedAt > 1250;
    const passedTarget =
      (this.direction > 0 && this.x > this.strikeTarget.x + 92) ||
      (this.direction < 0 && this.x < this.strikeTarget.x - 92);

    if (closeToOvershoot || diveTimedOut || passedTarget) {
      this.startRecovery();
    }
  }

  private recoverFromDive(target: Player): void {
    const targetY = Phaser.Math.Clamp(target.y - 185, 290, 470);
    const awayDirection: -1 | 1 = this.x < target.x ? -1 : 1;
    this.direction = awayDirection;
    this.setVelocityX(this.definition.speed * (0.75 + this.aggression * 0.14) * awayDirection);
    this.setVelocityY(Phaser.Math.Clamp((targetY - this.y) * 2.2, -125, 105));
    this.setFlipX(this.direction > 0);

    if (this.scene.time.now >= this.recoverUntil) {
      this.flightMode = "track";
      this.clearTint();
    }
  }

  private setDiveTarget(target: Player): void {
    const targetBody = target.body as Phaser.Physics.Arcade.Body;
    const velocityLead = Phaser.Math.Clamp(targetBody.velocity.x * 0.16, -46, 46);
    const strikeX = targetBody.x + targetBody.width / 2 + velocityLead;
    const strikeY = Phaser.Math.Clamp(targetBody.y + targetBody.height * 0.48, 360, 632);

    this.direction = strikeX < this.x ? -1 : 1;
    this.strikeTarget.set(strikeX, strikeY);
    this.diveTarget.set(strikeX + this.direction * (98 + this.aggression * 18), strikeY + 8);
    this.setFlipX(this.direction > 0);
  }

  private flyTowardDiveTarget(): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.diveTarget.x, this.diveTarget.y);
    const diveSpeed = this.definition.speed * (1.42 + this.aggression * 0.5);
    this.setVelocity(Math.cos(angle) * diveSpeed, Math.sin(angle) * diveSpeed);
  }

  private startRecovery(): void {
    const now = this.scene.time.now;
    this.flightMode = "recover";
    this.recoverUntil = now + Phaser.Math.Linear(520, 330, (this.aggression - 0.75) / 0.9);
    this.nextDiveAt = now + Phaser.Math.Linear(1650, 620, (this.aggression - 0.75) / 0.9);
    this.setTint(0x9be7dc);
  }

  completeStrike(): void {
    if (this.flightMode !== "dive") {
      return;
    }

    this.startRecovery();
  }
}
