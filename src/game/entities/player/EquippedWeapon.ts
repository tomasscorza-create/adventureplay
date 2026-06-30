import Phaser from "phaser";
import type {
  PlayerState,
  WeaponAttachmentFrame,
  WeaponDefinition,
} from "../../../shared/types/game";

export class EquippedWeapon extends Phaser.GameObjects.Sprite {
  private readonly weaponScale: number;
  private readonly attachmentFrames: WeaponAttachmentFrame[];
  private localX = 0;
  private localY = 0;
  private localAngle = 0;
  private hasSynced = false;

  constructor(
    scene: Phaser.Scene,
    definition: WeaponDefinition,
    attachmentFrames: WeaponAttachmentFrame[],
  ) {
    super(scene, 0, 0, definition.textureKey);
    this.weaponScale = definition.scale;
    this.attachmentFrames = attachmentFrames;

    scene.add.existing(this);
    this.setOrigin(definition.origin.x, definition.origin.y);
    this.setDepth(13);
  }

  syncWithPlayer(
    player: Phaser.Physics.Arcade.Sprite,
    state: PlayerState,
    facing: -1 | 1,
    delta: number,
  ): void {
    const animationFrame = Number(player.anims.currentFrame?.textureFrame);
    const spriteFrame = Number(player.frame.name);
    const textureFrame = Number.isFinite(animationFrame) ? animationFrame : spriteFrame;
    const attachment = this.attachmentFrames[textureFrame] ?? this.attachmentFrames[0];
    if (!attachment) {
      this.setVisible(false);
      return;
    }

    const targetAngle = state === "shoot" ? 12 : attachment.angle;
    const responseMs = state === "attack" ? 24 : 48;
    const blend = this.hasSynced ? 1 - Math.exp(-delta / responseMs) : 1;
    this.localX = Phaser.Math.Linear(this.localX, attachment.x, blend);
    this.localY = Phaser.Math.Linear(this.localY, attachment.y, blend);
    this.localAngle += Phaser.Math.Angle.WrapDegrees(targetAngle - this.localAngle) * blend;
    this.hasSynced = true;

    this.setPosition(player.x + this.localX * facing, player.y + this.localY);
    this.setScale(this.weaponScale * facing, this.weaponScale);
    this.setAngle(this.localAngle * facing);
    this.setAlpha(player.alpha);
    this.setVisible(player.visible && player.active);
  }
}
