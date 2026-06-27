import type { GameplayInputFrame } from "../../../shared/types/input";
import type { Player } from "../../entities/player/Player";

export class MovementSystem {
  update(player: Player, input: GameplayInputFrame): void {
    if (input.left) {
      player.setVelocityX(-player.stats.speed);
      player.setFacing(-1);
    } else if (input.right) {
      player.setVelocityX(player.stats.speed);
      player.setFacing(1);
    } else {
      player.setVelocityX(0);
    }

    if (input.jumpJustPressed && player.isGrounded()) {
      player.setVelocityY(-player.stats.jumpPower);
    }

    player.syncStateFromBody(input.left || input.right);
  }
}
