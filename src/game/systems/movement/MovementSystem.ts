import Phaser from "phaser";
import type { GameplayInputFrame } from "../../../shared/types/input";
import type { Player } from "../../entities/player/Player";

export class MovementSystem {
  update(player: Player, input: GameplayInputFrame): void {
    const body = player.body as Phaser.Physics.Arcade.Body;

    if (input.left) {
      player.setVelocityX(-player.stats.speed);
      player.setFacing(-1);
    } else if (input.right) {
      player.setVelocityX(player.stats.speed);
      player.setFacing(1);
    } else {
      player.setVelocityX(0);
    }

    if (input.jumpJustPressed && body.blocked.down) {
      player.setVelocityY(-player.stats.jumpPower);
    }

    player.syncStateFromBody(input.left || input.right);
  }
}
