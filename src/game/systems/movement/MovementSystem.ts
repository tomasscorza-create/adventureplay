import type { GameplayInputFrame } from "../../../shared/types/input";
import type { Player } from "../../entities/player/Player";

const JUMP_BUFFER_MS = 120;
const COYOTE_TIME_MS = 100;
const SUPPORTED_UPWARD_SPEED_RATIO = 0.45;

export class MovementSystem {
  private jumpBufferRemainingMs = 0;
  private coyoteTimeRemainingMs = 0;

  reset(): void {
    this.jumpBufferRemainingMs = 0;
    this.coyoteTimeRemainingMs = 0;
  }

  update(player: Player, input: GameplayInputFrame, delta: number): boolean {
    if (input.left) {
      player.setVelocityX(-player.stats.speed);
      player.setFacing(-1);
    } else if (input.right) {
      player.setVelocityX(player.stats.speed);
      player.setFacing(1);
    } else {
      player.setVelocityX(0);
    }

    const body = player.body as Phaser.Physics.Arcade.Body;
    const isRisingFromOwnJump = body.velocity.y < -player.stats.jumpPower * SUPPORTED_UPWARD_SPEED_RATIO;
    const isStableOnGround = player.isGrounded() && !isRisingFromOwnJump;
    this.coyoteTimeRemainingMs = isStableOnGround
      ? COYOTE_TIME_MS
      : Math.max(0, this.coyoteTimeRemainingMs - delta);
    this.jumpBufferRemainingMs = input.jumpJustPressed
      ? JUMP_BUFFER_MS
      : Math.max(0, this.jumpBufferRemainingMs - delta);

    const shouldJump = this.jumpBufferRemainingMs > 0 && this.coyoteTimeRemainingMs > 0;
    if (shouldJump) {
      player.setVelocityY(-player.stats.jumpPower);
      this.jumpBufferRemainingMs = 0;
      this.coyoteTimeRemainingMs = 0;
    }

    player.syncStateFromBody(input.left || input.right);
    return shouldJump;
  }
}
