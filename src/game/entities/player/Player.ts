import Phaser from "phaser";
import type { CharacterDefinition, PlayerState, PlayerStats } from "../../../shared/types/game";

export class Player extends Phaser.Physics.Arcade.Sprite {
  stats: PlayerStats;
  state: PlayerState = "idle";
  facing: -1 | 1 = 1;
  private readonly animationPrefix: string;
  private invulnerableUntil = 0;
  private lastShotAt = 0;
  private lastMeleeAt = 0;
  private actionLockedUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: PlayerStats, character: CharacterDefinition) {
    super(scene, x, y, character.textureKey);
    this.stats = stats;
    this.animationPrefix = character.animationPrefix;

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

    if ((this.state === "attack" || this.state === "shoot") && this.scene.time.now < this.actionLockedUntil) {
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
    const width = 82;
    const height = 54;
    const reachOffset = 22;
    const x = this.facing > 0 ? this.x + reachOffset : this.x - reachOffset - width;
    return new Phaser.Geom.Rectangle(x, this.y - 42, width, height);
  }

  canMelee(now: number): boolean {
    return now - this.lastMeleeAt > 280;
  }

  markAttacking(now: number): void {
    this.lastMeleeAt = now;
    this.actionLockedUntil = now + 240;
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
    this.actionLockedUntil = now + 180;
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
      idle: `${this.animationPrefix}-idle`,
      run: `${this.animationPrefix}-run`,
      jump: `${this.animationPrefix}-jump`,
      fall: `${this.animationPrefix}-fall`,
      attack: `${this.animationPrefix}-attack`,
      shoot: `${this.animationPrefix}-attack`,
      hurt: `${this.animationPrefix}-hurt`,
      dead: `${this.animationPrefix}-dead`,
    };
    const animationKey = animationKeyByState[state];
    if (animationKey) {
      this.play(animationKey, true);
    }
  }
}
