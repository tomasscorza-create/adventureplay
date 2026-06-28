import { enemyDefinitions } from "../../data/enemies";
import { BaseEnemy } from "./BaseEnemy";

export class BasicEnemy extends BaseEnemy {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyId: string,
    patrolDistance: number,
    textureKey = "enemy-emberling",
  ) {
    const definition = enemyDefinitions[enemyId];
    if (!definition) {
      throw new Error(`Unknown enemy definition: ${enemyId}`);
    }

    super(scene, x, y, textureKey, definition, patrolDistance);
  }
}
