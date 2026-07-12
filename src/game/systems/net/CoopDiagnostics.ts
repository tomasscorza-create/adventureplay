import type { CoopSecurityMetrics } from "./coopSecurity";

export type SendResultStatus = "ok" | "error" | "timed out" | string;


interface DirectionStats {
  messages: number;
  bytes: number;
}

interface EventStats extends DirectionStats {
  perSlot: Record<number, number>;
}

export interface MetricSummary {
  samples: number;
  average: number;
  p50: number;
  p95: number;
  max: number;
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
  inputs: {
    applied: number;
    averageApplyLatencyMs: number;
    inputToEchoMs: MetricSummary;
    pendingEchoes: number;
  };
  snapshotAgeMs: MetricSummary;
  divergencePx: MetricSummary;
  corrections: { total: number; byReason: Record<string, number> };
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

const MAX_METRIC_SAMPLES = 2048;

function recordSample(samples: number[], value: number): void {
  if (!Number.isFinite(value) || value < 0) return;
  if (samples.length >= MAX_METRIC_SAMPLES) samples.shift();
  samples.push(value);
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

function summarize(samples: number[]): MetricSummary {
  if (samples.length === 0) {
    return { samples: 0, average: 0, p50: 0, p95: 0, max: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const total = samples.reduce((sum, value) => sum + value, 0);
  return {
    samples: samples.length,
    average: total / samples.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted[sorted.length - 1],
  };
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
  private readonly inputSentAtMs = new Map<number, number>();
  private readonly inputToEchoMs: number[] = [];
  private readonly snapshotAgeMs: number[] = [];
  private readonly divergencePx: number[] = [];
  private corrections: Record<string, number> = {};
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

  recordInputSent(seq: number, sentAtMs: number): void {
    if (!this.enabledState || !Number.isInteger(seq) || seq < 0 || !Number.isFinite(sentAtMs)) return;
    this.inputSentAtMs.set(seq, sentAtMs);
    if (this.inputSentAtMs.size > 256) {
      const oldest = this.inputSentAtMs.keys().next().value;
      if (oldest !== undefined) this.inputSentAtMs.delete(oldest);
    }
  }

  recordInputEcho(ackSeq: number, receivedAtMs: number): void {
    if (!this.enabledState || !Number.isInteger(ackSeq) || ackSeq < 0
      || !Number.isFinite(receivedAtMs)) return;
    let latestConfirmedSentAt: number | undefined;
    for (const [seq, sentAtMs] of this.inputSentAtMs) {
      if (seq > ackSeq) continue;
      latestConfirmedSentAt = sentAtMs;
      this.inputSentAtMs.delete(seq);
    }
    if (latestConfirmedSentAt !== undefined) {
      recordSample(this.inputToEchoMs, receivedAtMs - latestConfirmedSentAt);
    }
  }

  recordSnapshotAge(ageMs: number): void {
    if (this.enabledState) recordSample(this.snapshotAgeMs, ageMs);
  }

  recordDivergence(distancePx: number): void {
    if (this.enabledState) recordSample(this.divergencePx, distancePx);
  }

  recordCorrection(reason: string): void {
    if (!this.enabledState) return;
    this.corrections[reason] = (this.corrections[reason] ?? 0) + 1;
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
        inputToEchoMs: summarize(this.inputToEchoMs),
        pendingEchoes: this.inputSentAtMs.size,
      },
      snapshotAgeMs: summarize(this.snapshotAgeMs),
      divergencePx: summarize(this.divergencePx),
      corrections: {
        total: Object.values(this.corrections).reduce((sum, value) => sum + value, 0),
        byReason: { ...this.corrections },
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
    this.inputSentAtMs.clear();
    this.inputToEchoMs.length = 0;
    this.snapshotAgeMs.length = 0;
    this.divergencePx.length = 0;
    this.corrections = {};
    this.desyncs = 0;
    this.reconnectSuccess = 0;
    this.reconnectFailure = 0;
    this.sendResults = {};
    this.lastHiddenAt = 0;
    this.hiddenCount = 0;
    this.totalHiddenTimeMs = 0;
  }
}
