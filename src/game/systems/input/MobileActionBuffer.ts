export type BufferedCombatAction = "melee" | "spin";

const ACTION_BUFFER_MS = 120;

export class MobileActionBuffer {
  private enabled = false;
  private expiresAt: Record<BufferedCombatAction, number> = {
    melee: Number.NEGATIVE_INFINITY,
    spin: Number.NEGATIVE_INFINITY,
  };

  reset(enabled: boolean): void {
    this.enabled = enabled;
    this.expiresAt = {
      melee: Number.NEGATIVE_INFINITY,
      spin: Number.NEGATIVE_INFINITY,
    };
  }

  shouldExecute(
    action: BufferedCombatAction,
    justPressed: boolean,
    now: number,
    canExecute: boolean,
  ): boolean {
    if (!this.enabled) {
      return justPressed && canExecute;
    }
    if (justPressed) {
      this.expiresAt[action] = now + ACTION_BUFFER_MS;
    }
    if (!canExecute || now > this.expiresAt[action]) {
      return false;
    }
    this.expiresAt[action] = Number.NEGATIVE_INFINITY;
    return true;
  }
}
