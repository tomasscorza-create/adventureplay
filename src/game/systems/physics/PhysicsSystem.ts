import Phaser from "phaser";

export function requireArcadeBody(
  gameObject: Phaser.GameObjects.GameObject,
): Phaser.Physics.Arcade.Body {
  return gameObject.body as Phaser.Physics.Arcade.Body;
}
