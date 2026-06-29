import Phaser from "phaser";
import { GAME_HEIGHT } from "../../../shared/constants/game";
import { enemyDefinitions } from "../../data/enemies";
import {
  findReachableLandingSurface,
  hasGroundAhead,
} from "../../systems/enemies/GroundNavigation";
import type { Player } from "../player/Player";
import { BaseEnemy } from "./BaseEnemy";

type M3BehaviorState =
  | "idle"
  | "alert"
  | "chase"
  | "jump"
  | "attack-windup"
  | "attack-lunge"
  | "attack-recover"
  | "hurt"
  | "defeated";

export type M3VisualVariant = "default" | "enchanted";

export class M3Enemy extends BaseEnemy {
  private readonly minChaseDistance = 18;
  private readonly jumpCooldownMs: number;
  private readonly jumpPower = 455;
  private readonly intelligence: number;
  private readonly visualVariant: M3VisualVariant;
  private readonly chaseRange: number;
  private readonly verticalAwareness: number;
  private readonly pursuitMemoryMs: number;
  private readonly attackRange: number;
  private readonly walkableSurfaces: Phaser.GameObjects.Rectangle[];
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private readonly healthBarWidth = 50;
  private readonly healthBarHeight = 4;
  private behaviorState: M3BehaviorState = "idle";
  private stateUntil = Number.NEGATIVE_INFINITY;
  private lastJumpAt = Number.NEGATIVE_INFINITY;
  private lastSawTargetAt = Number.NEGATIVE_INFINITY;
  private nextAttackAt = 0;
  private lastKnownTargetX: number;
  private airTargetX?: number;
  private attackDirection: -1 | 1 = 1;
  private contactDamageActive = false;
  private defeated = false;
  private targetAcquired = false;
  private lastAttackTrailAt = Number.NEGATIVE_INFINITY;
  private lastSafePosition: Phaser.Math.Vector2;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    walkableSurfaces: Phaser.GameObjects.Rectangle[],
    intelligence = 0.55,
    visualVariant: M3VisualVariant = "default",
  ) {
    const enemyId = visualVariant === "enchanted" ? "e2m3" : "m3";
    const definition = enemyDefinitions[enemyId];
    if (!definition) {
      throw new Error(`Unknown enemy definition: ${enemyId}`);
    }

    super(
      scene,
      x,
      y,
      visualVariant === "enchanted" ? "enchanted-m3-idle" : "enemy-m3-run-1",
      definition,
      0,
    );
    this.walkableSurfaces = walkableSurfaces;
    this.visualVariant = visualVariant;
    this.intelligence = Phaser.Math.Clamp(intelligence, 0.35, 1);
    this.chaseRange = Phaser.Math.Linear(900, 1300, this.intelligence);
    this.verticalAwareness = Phaser.Math.Linear(270, 380, this.intelligence);
    this.pursuitMemoryMs = Phaser.Math.Linear(700, 2200, this.intelligence);
    this.attackRange = Phaser.Math.Linear(128, 176, this.intelligence);
    this.jumpCooldownMs = Phaser.Math.Linear(980, 620, this.intelligence);
    this.lastKnownTargetX = x;
    this.lastSafePosition = new Phaser.Math.Vector2(x, y);
    this.nextAttackAt = scene.time.now + Phaser.Math.Linear(1200, 700, this.intelligence);
    this.setDepth(12);
    this.setDisplaySize(
      visualVariant === "enchanted" ? 94 : 84,
      visualVariant === "enchanted" ? 86 : 82,
    );

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.48, this.height * 0.68);
    body.setOffset(this.width * 0.26, this.height * 0.25);

    this.healthBar = scene.add.graphics().setDepth(20);
    this.drawHealthBar();
    this.positionHealthBar();
    if (visualVariant === "enchanted") {
      this.play("enchanted-m3-idle", true);
    }
  }

  override update(target?: Player): void {
    if (!this.active || this.defeated) {
      this.healthBar.setVisible(false);
      return;
    }

    this.positionHealthBar();
    if (this.y > GAME_HEIGHT + 100) {
      this.recoverFromFall();
      return;
    }

    const now = this.scene.time.now;
    if (this.behaviorState === "hurt") {
      if (now < this.stateUntil) {
        this.setVelocityX(this.body ? (this.body as Phaser.Physics.Arcade.Body).velocity.x * 0.72 : 0);
        return;
      }
      this.setBehaviorState("idle");
    }

    if (
      this.behaviorState === "attack-windup" ||
      this.behaviorState === "attack-lunge" ||
      this.behaviorState === "attack-recover"
    ) {
      this.updateAttackState(now);
      return;
    }

    if (!target?.active) {
      this.stopPursuit();
      return;
    }

    const distanceX = target.x - this.x;
    const distanceY = Math.abs(target.y - this.y);
    const targetVisible =
      Math.abs(distanceX) <= this.chaseRange &&
      distanceY <= this.verticalAwareness;

    if (targetVisible) {
      this.lastSawTargetAt = now;
      this.lastKnownTargetX = target.x;
    }
    const remembersTarget = now - this.lastSawTargetAt <= this.pursuitMemoryMs;
    if (!targetVisible && !remembersTarget) {
      this.stopPursuit();
      return;
    }

    const pursuitX = targetVisible ? target.x : this.lastKnownTargetX;
    this.direction = pursuitX < this.x ? -1 : 1;
    this.setFacing(this.direction);

    if (this.behaviorState === "alert") {
      if (now < this.stateUntil) {
        this.setVelocityX(0);
        return;
      }
      this.setBehaviorState("chase");
    } else if (!this.targetAcquired && targetVisible) {
      this.targetAcquired = true;
      this.setBehaviorState(
        "alert",
        now + Phaser.Math.Linear(540, 260, this.intelligence),
      );
      this.setVelocityX(0);
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const isGrounded = body.blocked.down || body.touching.down;
    if (isGrounded) {
      this.airTargetX = undefined;
      if (
        hasGroundAhead(body, this.walkableSurfaces, -1, 10) &&
        hasGroundAhead(body, this.walkableSurfaces, 1, 10) &&
        this.isStandingOnStableSurface(body)
      ) {
        this.lastSafePosition.set(this.x, this.y);
      }
    }

    if (
      isGrounded &&
      targetVisible &&
      Math.abs(distanceX) <= this.attackRange &&
      distanceY <= 105 &&
      now >= this.nextAttackAt &&
      hasGroundAhead(body, this.walkableSurfaces, this.direction, 46)
    ) {
      this.beginAttack(target, now);
      return;
    }

    if (isGrounded && !hasGroundAhead(body, this.walkableSurfaces, this.direction)) {
      const landing = findReachableLandingSurface(
        body,
        this.walkableSurfaces,
        this.direction,
        Phaser.Math.Linear(195, 230, this.intelligence),
        Phaser.Math.Linear(105, 135, this.intelligence),
      );
      if (landing && this.canJumpNow(now)) {
        this.startGapJump(landing.targetX, now);
      } else {
        this.setVelocityX(0);
        this.setBehaviorState("idle");
      }
      return;
    }

    if (!isGrounded) {
      const airDirection: -1 | 1 = (this.airTargetX ?? pursuitX) < this.x ? -1 : 1;
      const airSpeed = Phaser.Math.Linear(145, 168, this.intelligence);
      this.setVelocityX(airSpeed * airDirection);
      this.setFacing(airDirection);
      this.setBehaviorState("jump");
      return;
    }

    if (Math.abs(pursuitX - this.x) <= this.minChaseDistance) {
      this.setVelocityX(0);
      this.setBehaviorState("idle");
      return;
    }

    this.setVelocityX(this.definition.speed * this.direction);
    this.setBehaviorState("chase");
    this.tryJumpTowardTarget(target, distanceX, now);
  }

  canDamagePlayer(): boolean {
    return this.contactDamageActive && !this.defeated;
  }

  completeAttack(): void {
    if (this.behaviorState === "attack-lunge") {
      this.beginAttackRecovery(this.scene.time.now);
    }
  }

  override takeDamage(amount: number): boolean {
    if (this.defeated) {
      return false;
    }

    const isLethalPower = amount >= Number.MAX_SAFE_INTEGER;
    this.health -= isLethalPower ? this.health : 1;
    this.contactDamageActive = false;
    if (this.health <= 0) {
      this.startDefeatAnimation();
      return true;
    }

    this.setBehaviorState("hurt", this.scene.time.now + 190);
    this.drawHealthBar();
    return false;
  }

  private beginAttack(target: Player, now: number): void {
    const targetBody = target.body as Phaser.Physics.Arcade.Body;
    const predictedTargetX = target.x + targetBody.velocity.x * (0.08 + this.intelligence * 0.08);
    this.attackDirection = predictedTargetX < this.x ? -1 : 1;
    this.direction = this.attackDirection;
    this.setFacing(this.attackDirection);
    this.contactDamageActive = false;
    this.setVelocityX(0);
    this.setBehaviorState(
      "attack-windup",
      now + Phaser.Math.Linear(430, 230, this.intelligence),
    );
    if (this.visualVariant === "enchanted") {
      this.createAttackChargeEffect();
    }
  }

  private updateAttackState(now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.behaviorState === "attack-windup") {
      this.setVelocityX(0);
      if (now >= this.stateUntil) {
        this.contactDamageActive = true;
        this.setBehaviorState("attack-lunge", now + 320);
        this.setVelocityX(180 * this.attackDirection);
      }
      return;
    }

    if (this.behaviorState === "attack-lunge") {
      const isGrounded = body.blocked.down || body.touching.down;
      const groundAhead = !isGrounded || hasGroundAhead(
        body,
        this.walkableSurfaces,
        this.attackDirection,
        26,
      );
      if (!groundAhead || now >= this.stateUntil) {
        this.beginAttackRecovery(now);
      } else {
        this.setVelocityX(180 * this.attackDirection);
        if (this.visualVariant === "enchanted" && now - this.lastAttackTrailAt >= 70) {
          this.lastAttackTrailAt = now;
          this.createAttackTrail();
        }
      }
      return;
    }

    this.contactDamageActive = false;
    this.setVelocityX(0);
    if (now >= this.stateUntil) {
      this.setBehaviorState("chase");
    }
  }

  private beginAttackRecovery(now: number): void {
    this.contactDamageActive = false;
    this.setVelocityX(0);
    this.setBehaviorState(
      "attack-recover",
      now + Phaser.Math.Linear(520, 280, this.intelligence),
    );
    this.nextAttackAt = now + Phaser.Math.Linear(1450, 760, this.intelligence);
  }

  private tryJumpTowardTarget(target: Player, distanceX: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!this.canJumpNow(now)) {
      return;
    }

    const isBlockedAhead =
      (this.direction < 0 && (body.blocked.left || body.touching.left)) ||
      (this.direction > 0 && (body.blocked.right || body.touching.right));
    const targetIsHigher = target.y < this.y - 44 && Math.abs(distanceX) < 460;
    if (!isBlockedAhead && !targetIsHigher) {
      return;
    }

    this.airTargetX = target.x;
    this.setVelocityY(-this.jumpPower);
    this.lastJumpAt = now;
    this.setBehaviorState("jump");
  }

  private canJumpNow(now: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return (
      (body.blocked.down || body.touching.down) &&
      now - this.lastJumpAt >= this.jumpCooldownMs
    );
  }

  private startGapJump(targetX: number, now: number): void {
    this.airTargetX = targetX;
    this.setVelocity(this.direction * Phaser.Math.Linear(150, 168, this.intelligence), -this.jumpPower);
    this.lastJumpAt = now;
    this.setBehaviorState("jump");
  }

  private stopPursuit(): void {
    this.contactDamageActive = false;
    this.targetAcquired = false;
    this.setVelocityX(0);
    this.setBehaviorState("idle");
  }

  private recoverFromFall(): void {
    this.contactDamageActive = false;
    this.setPosition(this.lastSafePosition.x, this.lastSafePosition.y - 8);
    this.setVelocity(0, 0);
    this.lastSawTargetAt = Number.NEGATIVE_INFINITY;
    this.targetAcquired = true;
    this.airTargetX = undefined;
    this.setBehaviorState("alert", this.scene.time.now + 620);
  }

  private isStandingOnStableSurface(body: Phaser.Physics.Arcade.Body): boolean {
    return this.walkableSurfaces.some((surface) => {
      if (!surface.active) {
        return false;
      }

      const bounds = surface.getBounds();
      const surfaceBody = (surface as Phaser.GameObjects.Rectangle & {
        body?: Phaser.Physics.Arcade.Body;
      }).body;
      const isMoving = surfaceBody?.velocity
        ? Math.abs(surfaceBody.velocity.x) > 1 || Math.abs(surfaceBody.velocity.y) > 1
        : false;
      return (
        !isMoving &&
        body.center.x >= bounds.left &&
        body.center.x <= bounds.right &&
        Math.abs(bounds.top - body.bottom) <= 16
      );
    });
  }

  private startDefeatAnimation(): void {
    this.defeated = true;
    this.contactDamageActive = false;
    this.healthBar.setVisible(false);
    this.setVelocity(0, 0);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.setBehaviorState("defeated");
    if (this.visualVariant === "enchanted") {
      this.createDefeatBurst();
    }
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: this.direction * 12,
      y: this.y + 18,
      duration: 420,
      ease: "Cubic.easeIn",
      onComplete: () => this.disableBody(true, true),
    });
  }

  private setBehaviorState(state: M3BehaviorState, until = Number.NEGATIVE_INFINITY): void {
    if (this.behaviorState === state) {
      this.stateUntil = Math.max(this.stateUntil, until);
      return;
    }

    this.behaviorState = state;
    this.stateUntil = until;
    this.clearTint();
    const animationPrefix = this.visualVariant === "enchanted"
      ? "enchanted-m3"
      : "enemy-m3";
    if (state === "alert") {
      this.play(`${animationPrefix}-alert`, true);
      this.setTint(this.visualVariant === "enchanted" ? 0xc7ffae : 0xff9b68);
    } else if (state === "chase") {
      this.play(`${animationPrefix}-run`, true);
    } else if (state === "attack-windup") {
      this.play(`${animationPrefix}-attack-windup`, true);
      this.setTint(this.visualVariant === "enchanted" ? 0xaaff88 : 0xff735c);
    } else if (state === "attack-lunge") {
      this.play(`${animationPrefix}-attack`, true);
    } else if (state === "attack-recover") {
      this.anims.stop();
      this.setTexture(
        this.visualVariant === "enchanted" ? "enchanted-m3-attack-1" : "enemy-m3-run-5",
      );
      this.setTint(this.visualVariant === "enchanted" ? 0xb8eaa6 : 0xffb09c);
    } else if (state === "jump") {
      this.anims.stop();
      this.setTexture(
        this.visualVariant === "enchanted" ? "enchanted-m3-run-2" : "enemy-m3-run-3",
      );
    } else if (state === "hurt") {
      this.play(`${animationPrefix}-hurt`, true);
      this.setTint(0xffffff);
    } else if (state === "defeated") {
      this.play(`${animationPrefix}-defeat`, true);
      if (this.visualVariant === "default") {
        this.setTint(0xa44d55);
      }
    } else {
      if (this.visualVariant === "enchanted") {
        this.play("enchanted-m3-idle", true);
      } else {
        this.anims.stop();
        this.setTexture("enemy-m3-run-1");
      }
    }
  }

  private setFacing(direction: -1 | 1): void {
    const sourceFacesLeft = this.visualVariant === "enchanted";
    this.setFlipX(sourceFacesLeft ? direction > 0 : direction < 0);
  }

  private createAttackChargeEffect(): void {
    const aura = this.scene.add
      .circle(this.x, this.y - 4, 24, 0x67ff78, 0.16)
      .setStrokeStyle(3, 0xb9ff8d, 0.88)
      .setDepth(this.depth - 1);
    this.scene.tweens.add({
      targets: aura,
      scale: 1.9,
      alpha: 0,
      duration: 340,
      ease: "Sine.easeOut",
      onComplete: () => aura.destroy(),
    });
  }

  private createAttackTrail(): void {
    const trail = this.scene.add
      .image(this.x - this.attackDirection * 10, this.y, this.texture.key)
      .setDisplaySize(this.displayWidth, this.displayHeight)
      .setFlipX(this.flipX)
      .setTint(0x7dff93)
      .setAlpha(0.28)
      .setDepth(this.depth - 1);
    this.scene.tweens.add({
      targets: trail,
      x: trail.x - this.attackDirection * 18,
      alpha: 0,
      scaleX: trail.scaleX * 1.08,
      scaleY: trail.scaleY * 1.08,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => trail.destroy(),
    });
  }

  private createDefeatBurst(): void {
    const ring = this.scene.add
      .circle(this.x, this.y, 18, 0x5fff74, 0.18)
      .setStrokeStyle(4, 0xc8ff91, 0.94)
      .setDepth(this.depth + 1);
    this.scene.tweens.add({
      targets: ring,
      scale: 3.1,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
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
