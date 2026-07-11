import type { CoopSecurityMetrics } from "./coopSecurity";

export type SendResultStatus = "ok" | "error" | "timed out" | string;


interface DirectionStats {
  messages: number;
  bytes: number;
}

interface EventStats extends DirectionStats {
  perSlot: Record<number, number>;
}

export interface CoopDiagnosticsSnapshot {
  enabled: boolean;
  elapsedSeconds: number;
  sent: DirectionStats;
  received: DirectionStats;
  sentPerSecond: number;
  receivedPerSecond: number;
  byEvent: Record<string, { sent: EventStats; received: EventStats }>;
  snapshots: { keyframes: number; deltas: number; effectiveHz: number };
  inputs: { applied: number; averageApplyLatencyMs: number };
  desyncsDetected: number;
  reconnects: { successful: number; failed: number };
  sendResults: Record<string, Record<string, number>>;
  visibility: { hiddenCount: number; totalHiddenTimeMs: number };
  security: CoopSecurityMetrics;
}

function bytesOf(payload: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  } catch {
    return 0;
  }
}

function directionStats(): DirectionStats {
  return { messages: 0, bytes: 0 };
}

function eventStats(): EventStats {
  return { messages: 0, bytes: 0, perSlot: {} };
}

export class CoopDiagnostics {
  private enabledState = false;
  private startedAtMs = 0;
  private sent = directionStats();
  private received = directionStats();
  private readonly events = new Map<string, { sent: EventStats; received: EventStats }>();
  private keyframes = 0;
  private deltas = 0;
  private inputsApplied = 0;
  private inputLatencyTotalMs = 0;
  private desyncs = 0;
  private reconnectSuccess = 0;
  private reconnectFailure = 0;
  private sendResults: Record<string, Record<string, number>> = {};
  private lastHiddenAt = 0;
  private hiddenCount = 0;
  private totalHiddenTimeMs = 0;

  constructor(private readonly clock: () => number = () => performance.now()) {}

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabledState) return;
    this.enabledState = enabled;
    if (enabled) this.reset();
  }

  get enabled(): boolean {
    return this.enabledState;
  }

  record(direction: "sent" | "received", event: string, payload: unknown, slot?: number): void {
    if (!this.enabledState) return;
    const bytes = bytesOf(payload);
    const total = direction === "sent" ? this.sent : this.received;
    total.messages += 1;
    total.bytes += bytes;
    const entry = this.events.get(event) ?? { sent: eventStats(), received: eventStats() };
    const stats = entry[direction];
    stats.messages += 1;
    stats.bytes += bytes;
    if (slot !== undefined) stats.perSlot[slot] = (stats.perSlot[slot] ?? 0) + 1;
    this.events.set(event, entry);
  }

  recordSnapshot(keyframe: boolean): void {
    if (!this.enabledState) return;
    if (keyframe) this.keyframes += 1;
    else this.deltas += 1;
  }

  recordInputApplied(latencyMs: number): void {
    if (!this.enabledState || !Number.isFinite(latencyMs) || latencyMs < 0) return;
    this.inputsApplied += 1;
    this.inputLatencyTotalMs += latencyMs;
  }

  recordDesync(): void {
    if (this.enabledState) this.desyncs += 1;
  }

  recordReconnect(success: boolean): void {
    if (!this.enabledState) return;
    if (success) this.reconnectSuccess += 1;
    else this.reconnectFailure += 1;
  }

  recordSendResult(event: string, status: string): void {
    if (!this.enabledState) return;
    if (!this.sendResults[event]) this.sendResults[event] = {};
    this.sendResults[event][status] = (this.sendResults[event][status] ?? 0) + 1;
  }

  recordVisibilityChange(hidden: boolean): void {
    if (!this.enabledState) return;
    if (hidden) {
      this.lastHiddenAt = this.clock();
    } else if (this.lastHiddenAt > 0) {
      this.totalHiddenTimeMs += this.clock() - this.lastHiddenAt;
      this.lastHiddenAt = 0;
      this.hiddenCount += 1;
    }
  }

  snapshot(security: CoopSecurityMetrics): CoopDiagnosticsSnapshot {
    const elapsedSeconds = this.enabledState
      ? Math.max(0.001, (this.clock() - this.startedAtMs) / 1000)
      : 0;
    return {
      enabled: this.enabledState,
      elapsedSeconds,
      sent: { ...this.sent },
      received: { ...this.received },
      sentPerSecond: elapsedSeconds ? this.sent.messages / elapsedSeconds : 0,
      receivedPerSecond: elapsedSeconds ? this.received.messages / elapsedSeconds : 0,
      byEvent: Object.fromEntries([...this.events.entries()].map(([event, value]) => [
        event,
        {
          sent: { ...value.sent, perSlot: { ...value.sent.perSlot } },
          received: { ...value.received, perSlot: { ...value.received.perSlot } },
        },
      ])),
      snapshots: {
        keyframes: this.keyframes,
        deltas: this.deltas,
        effectiveHz: elapsedSeconds ? (this.keyframes + this.deltas) / elapsedSeconds : 0,
      },
      inputs: {
        applied: this.inputsApplied,
        averageApplyLatencyMs: this.inputsApplied ? this.inputLatencyTotalMs / this.inputsApplied : 0,
      },
      desyncsDetected: this.desyncs,
      reconnects: { successful: this.reconnectSuccess, failed: this.reconnectFailure },
      sendResults: structuredClone(this.sendResults),
      visibility: { hiddenCount: this.hiddenCount, totalHiddenTimeMs: this.totalHiddenTimeMs },
      security,
    };
  }

  reset(): void {
    this.startedAtMs = this.clock();
    this.sent = directionStats();
    this.received = directionStats();
    this.events.clear();
    this.keyframes = 0;
    this.deltas = 0;
    this.inputsApplied = 0;
    this.inputLatencyTotalMs = 0;
    this.desyncs = 0;
    this.reconnectSuccess = 0;
    this.reconnectFailure = 0;
    this.sendResults = {};
    this.lastHiddenAt = 0;
    this.hiddenCount = 0;
    this.totalHiddenTimeMs = 0;
  }
}
