import {
  emptyGameplayInputState,
  type GameplayInputFrame,
  type GameplayInputState,
} from "../../../shared/types/input";

export const COOP_PREDICTION_MAX_HISTORY = 96;
export const COOP_PREDICTION_HARD_RESET_DISTANCE = 96;

export interface CoopPredictionCommand {
  seq: number;
  state: GameplayInputState;
}

// El historial usa exactamente la granularidad del transporte: una entrada por
// paquete realmente enviado. No captura posiciones ni desplazamientos Phaser.
export class CoopLocalPrediction {
  private readonly pending: CoopPredictionCommand[] = [];

  record(command: CoopPredictionCommand): void {
    if (command.seq <= 0 || this.pending.some((entry) => entry.seq === command.seq)) return;
    this.pending.push({ seq: command.seq, state: { ...command.state } });
    this.pending.sort((a, b) => a.seq - b.seq);
    while (this.pending.length > COOP_PREDICTION_MAX_HISTORY) this.pending.shift();
  }

  acknowledge(processedSeq: number): number {
    let removed = 0;
    while (this.pending.length > 0 && this.pending[0].seq <= processedSeq) {
      this.pending.shift();
      removed += 1;
    }
    return removed;
  }

  // Reproduce solo intención sostenida. Los flancos ya ejecutados localmente no
  // se vuelven a disparar al reconciliar, evitando dobles saltos/ataques/poderes.
  latestPendingFrame(): GameplayInputFrame {
    const state = this.pending[this.pending.length - 1]?.state ?? emptyGameplayInputState;
    return {
      ...state,
      jumpJustPressed: false,
      meleeJustPressed: false,
      spinJustPressed: false,
      healJustPressed: false,
      powerJustPressed: false,
      pauseJustPressed: false,
    };
  }

  needsAuthoritativeReset(
    local: { x: number; y: number },
    authoritative: { x: number; y: number },
  ): boolean {
    return Math.hypot(local.x - authoritative.x, local.y - authoritative.y)
      > COOP_PREDICTION_HARD_RESET_DISTANCE;
  }

  reset(): void {
    this.pending.length = 0;
  }

  get pendingCount(): number {
    return this.pending.length;
  }
}
