export const COOP_PREDICTION_MAX_HISTORY = 96;

export interface CoopContinuousInput {
  left: boolean;
  right: boolean;
}

export interface CoopPredictionCommand {
  seq: number;
  continuous: CoopContinuousInput;
}

type PredictionTraceEvent = "sent" | "edge" | "ack" | "correction";

// Una entrada por paquete realmente enviado. El historial nunca contiene
// justPressed ni botones instantaneos: solo intención horizontal continua.
export class CoopLocalPrediction {
  private readonly pending: CoopPredictionCommand[] = [];

  record(command: CoopPredictionCommand): void {
    if (command.seq <= 0 || this.pending.some((entry) => entry.seq === command.seq)) return;
    this.pending.push({ seq: command.seq, continuous: { ...command.continuous } });
    this.pending.sort((a, b) => a.seq - b.seq);
    while (this.pending.length > COOP_PREDICTION_MAX_HISTORY) this.pending.shift();
    this.trace("sent", { seq: command.seq, continuous: command.continuous });
  }

  acknowledge(processedSeq: number): number {
    let removed = 0;
    while (this.pending.length > 0 && this.pending[0].seq <= processedSeq) {
      this.pending.shift();
      removed += 1;
    }
    this.trace("ack", { processedSeq, removed });
    return removed;
  }

  traceEdge(action: "jump" | "melee" | "spin" | "power"): void {
    this.trace("edge", { action });
  }

  traceCorrection(kind: "authoritative" | "out-of-world" | "none"): void {
    this.trace("correction", { kind });
  }

  reset(): void {
    this.pending.length = 0;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  get pendingSeqs(): number[] {
    return this.pending.map((entry) => entry.seq);
  }

  private trace(event: PredictionTraceEvent, detail: Record<string, unknown>): void {
    const enabled = import.meta.env.DEV
      && typeof localStorage !== "undefined"
      && localStorage.getItem("cd") === "1";
    if (!enabled) return;
    console.debug("[coop-prediction]", {
      event,
      ...detail,
      pending: this.pendingSeqs,
    });
  }
}
