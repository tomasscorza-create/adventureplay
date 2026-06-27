import Phaser from "phaser";
import { itemDefinitions } from "../../data/items";

export class Coin extends Phaser.Physics.Arcade.Sprite {
  readonly itemId: string;
  readonly value: number;

  constructor(scene: Phaser.Scene, x: number, y: number, itemId: string, value = 1) {
    const item = itemDefinitions[itemId];
    const textureKey = item?.type === "coin" ? "coin" : "inventory-piece";
    super(scene, x, y, textureKey);
    this.itemId = itemId;
    this.value = value;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(9);
    if (item?.type === "coin") {
      this.setScale(0.9 + value * 0.08);
      this.setData("coinValue", value);
    }
    if (item?.inventoryCategory === "plansKeys") {
      this.setTint(0x9be7dc);
    } else if (item?.inventoryCategory === "toolsWeapons") {
      this.setTint(0xf2c45f);
    } else if (item?.inventoryCategory === "potions") {
      this.setTint(0xff86a8);
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
  }
}
