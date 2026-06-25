import Phaser from "phaser";
import type { PlayerState, PlayerStats } from "../../../shared/types/game";

export class Player extends Phaser.Physics.Arcade.Sprite {
  stats: PlayerStats;
  state: PlayerState = "idle";
  facing: -1 | 1 = 1;
  private invulnerableUntil = 0;
  private lastShotAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: PlayerStats) {
    super(scene, x, y, "player");
    this.stats = stats;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDragX(1800);
    this.setDepth(12);
    this.playAnimation("idle");

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(28, 44);
    body.setOffset(34, 32);
  }

  setFacing(direction: -1 | 1): void {
    this.facing = direction;
    this.setFlipX(direction < 0);
  }

  syncStateFromBody(isMoving: boolean): void {
    if (this.state === "dead" || this.state === "hurt") {
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const nextState = !body.blocked.down && body.velocity.y < 0
      ? "jump"
      : !body.blocked.down && body.velocity.y > 0
        ? "fall"
        : isMoving
          ? "run"
          : "idle";

    this.state = nextState;
    this.playAnimation(nextState);
  }

  getMeleeHitbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x + this.facing * 28 - 24, this.y - 34, 56, 48);
  }

  markAttacking(): void {
    this.state = "attack";
    this.playAnimation("attack");
    this.scene.time.delayedCall(260, () => {
      if (this.active && this.state === "attack") {
        this.state = "idle";
        this.playAnimation("idle");
      }
    });
  }

  canShoot(now: number): boolean {
    return now - this.lastShotAt > 280;
  }

  markShooting(now: number): void {
    this.lastShotAt = now;
    this.state = "shoot";
    this.playAnimation("attack");
    this.scene.time.delayedCall(180, () => {
      if (this.active && this.state === "shoot") {
        this.state = "idle";
        this.playAnimation("idle");
      }
    });
  }

  takeDamage(amount: number): boolean {
    if (this.scene.time.now < this.invulnerableUntil || this.state === "dead") {
      return false;
    }

    this.stats.health = Math.max(0, this.stats.health - amount);
    this.invulnerableUntil = this.scene.time.now + 850;
    this.state = this.stats.health <= 0 ? "dead" : "hurt";
    this.playAnimation(this.stats.health <= 0 ? "dead" : "hurt");
    this.setTint(0xff6f61);

    this.scene.time.delayedCall(160, () => {
      if (!this.active) {
        return;
      }

      this.clearTint();
      if (this.state === "hurt") {
        this.state = "idle";
        this.playAnimation("idle");
      }
    });

    return this.stats.health <= 0;
  }

  private playAnimation(state: PlayerState): void {
    const animationKeyByState: Partial<Record<PlayerState, string>> = {
      idle: "player-idle",
      run: "player-run",
      jump: "player-jump",
      fall: "player-fall",
      attack: "player-attack",
      shoot: "player-attack",
      hurt: "player-hurt",
      dead: "player-dead",
    };
    const animationKey = animationKeyByState[state];
    if (animationKey) {
      this.play(animationKey, true);
    }
  }
}
