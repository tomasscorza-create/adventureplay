import Phaser from "phaser";
import { SPIN_ATTACK_COOLDOWN_MS } from "../../../shared/constants/game";
import type { CharacterDefinition, PlayerState, PlayerStats } from "../../../shared/types/game";
import { weaponDefinitions } from "../../data/weapons";
import { EquippedWeapon } from "./EquippedWeapon";

export class Player extends Phaser.Physics.Arcade.Sprite {
  stats: PlayerStats;
  state: PlayerState = "idle";
  facing: -1 | 1 = 1;
  private readonly animationPrefix: string;
  private readonly equippedWeapon?: EquippedWeapon;
  private invulnerableUntil = 0;
  private lastSpinAt = Number.NEGATIVE_INFINITY;
  private lastPowerAt = Number.NEGATIVE_INFINITY;
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
    const weaponDefinition = character.weaponId
      ? weaponDefinitions[character.weaponId]
      : undefined;
    if (weaponDefinition && character.weaponAttachmentFrames) {
      this.equippedWeapon = new EquippedWeapon(
        scene,
        weaponDefinition,
        character.weaponAttachmentFrames,
      );
    }
    this.playAnimation("idle");

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(28, 44);
    body.setOffset(34, 32);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.equippedWeapon?.syncWithPlayer(this, this.state, this.facing, delta);
  }

  override destroy(fromScene?: boolean): void {
    this.equippedWeapon?.destroy(fromScene);
    super.destroy(fromScene);
  }

  setFacing(direction: -1 | 1): void {
    this.facing = direction;
    this.setFlipX(direction < 0);
  }

  isGrounded(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  syncStateFromBody(isMoving: boolean): void {
    if (this.state === "dead" || this.state === "hurt") {
      return;
    }

    if ((this.state === "attack" || this.state === "spin") && this.scene.time.now < this.actionLockedUntil) {
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const isGrounded = this.isGrounded();
    const nextState = !isGrounded && body.velocity.y < 0
      ? "jump"
      : !isGrounded && body.velocity.y > 18
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
    return now >= this.actionLockedUntil && now - this.lastMeleeAt > 280;
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

  canSpin(now: number): boolean {
    return now >= this.actionLockedUntil && this.getSpinCooldownRemaining(now) <= 0;
  }

  getSpinCooldownRemaining(now: number): number {
    return Math.max(0, SPIN_ATTACK_COOLDOWN_MS - (now - this.lastSpinAt));
  }

  markSpinning(now: number): void {
    this.lastSpinAt = now;
    this.actionLockedUntil = now + 420;
    this.state = "spin";
    this.playAnimation("attack");
    this.scene.time.delayedCall(420, () => {
      if (this.active && this.state === "spin") {
        this.state = "idle";
        this.playAnimation("idle");
      }
    });
  }

  canUsePower(now: number): boolean {
    return now >= this.actionLockedUntil && now - this.lastPowerAt >= 280;
  }

  markUsingPower(now: number): void {
    this.lastPowerAt = now;
    this.actionLockedUntil = now + 180;
    this.state = "attack";
    this.playAnimation("attack");
    this.scene.time.delayedCall(180, () => {
      if (this.active && this.state === "attack") {
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

  markDefeated(): void {
    this.state = "dead";
    this.actionLockedUntil = Number.POSITIVE_INFINITY;
    this.setVelocity(0, 0);
    this.playAnimation("dead");
  }

  // Player y arma son GameObjects separados: presencia de red debe cambiar el
  // lifecycle de ambos de forma atomica para no dejar armas/fantasmas visibles.
  setNetworkPresence(present: boolean): void {
    this.setActive(present);
    this.setVisible(present);
    this.equippedWeapon?.setActive(present).setVisible(present);
  }

  // Co-op (lado guest): aplica el estado autoritativo recibido por red a este
  // titere, sin simular fisica. Solo actualiza direccion y animacion visibles.
  renderNetState(state: PlayerState, facing: -1 | 1): void {
    this.setFacing(facing);
    if (state !== this.state) {
      this.state = state;
      this.playAnimation(state);
    }
  }

  private playAnimation(state: PlayerState): void {
    const animationKeyByState: Partial<Record<PlayerState, string>> = {
      idle: `${this.animationPrefix}-idle`,
      run: `${this.animationPrefix}-run`,
      jump: `${this.animationPrefix}-jump`,
      fall: `${this.animationPrefix}-fall`,
      attack: `${this.animationPrefix}-attack`,
      spin: `${this.animationPrefix}-attack`,
      hurt: `${this.animationPrefix}-hurt`,
      dead: `${this.animationPrefix}-dead`,
    };
    const animationKey = animationKeyByState[state];
    if (animationKey) {
      this.play(animationKey, true);
    }
  }
}
