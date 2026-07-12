import {
  COOP_INPUT_RATE_HZ,
  COOP_MAX_PLAYERS,
  COOP_PROTOCOL_VERSION,
  type CoopChargesMessage,
  type CoopEndMessage,
  type CoopInputMessage,
  type CoopParticipant,
  type CoopRole,
  type CoopStartMessage,
} from "./coopMessages";

export interface CoopWireEnvelope {
  protocol: number;
  senderKey: string;
  senderRole: CoopRole;
  payload: unknown;
}

export type CoopSecurityReason =
  | "invalid-envelope"
  | "incompatible-protocol"
  | "unknown-sender"
  | "role-violation"
  | "oversized-payload"
  | "corrupt-payload"
  | "slot-spoof"
  | "duplicate-sequence"
  | "old-sequence"
  | "input-rate-limit"
  | "untrusted-charge-increment"
  | "unauthorized-transition";

export interface CoopSecurityDecision<T> {
  accepted: boolean;
  value?: T;
  reason?: CoopSecurityReason;
  disconnectRecommended: boolean;
}

export interface CoopSecurityMetrics {
  accepted: number;
  discarded: number;
  duplicateSequences: number;
  oldSequences: number;
  rateLimited: number;
  incompatibleProtocol: number;
  slotSpoofs: number;
  blockedParticipants: number;
  droppedByReason: Partial<Record<CoopSecurityReason, number>>;
}

interface InputWindow {
  lastSeq: number;
  tokens: number;
  lastRefillMs: number;
}

const INPUT_BURST_TOKENS = 12;
const ANOMALY_WINDOW_MS = 10_000;
const BLOCK_THRESHOLD = 40;
const INPUT_BITS_MASK = 0xff;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safePayloadBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function hasOnlyFiniteNumbers(value: unknown, budget = 20_000): boolean {
  const stack = [value];
  let visited = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    visited += 1;
    if (visited > budget) return false;
    if (typeof current === "number" && !Number.isFinite(current)) return false;
    if (Array.isArray(current)) stack.push(...current);
    else if (isRecord(current)) stack.push(...Object.values(current));
  }
  return true;
}

function integerInRange(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
}

export class CoopSecurityGuard {
  private readonly inputWindows = new Map<number, InputWindow>();
  private readonly anomalyTimes = new Map<string, number[]>();
  private metricsState: CoopSecurityMetrics = this.emptyMetrics();

  parseEnvelope(
    raw: unknown,
    participants: readonly CoopParticipant[],
    maxBytes: number,
    nowMs: number,
    allowUnknownSender = false,
  ): CoopSecurityDecision<{ envelope: CoopWireEnvelope; sender?: CoopParticipant }> {
    if (!isRecord(raw)
      || raw.protocol !== COOP_PROTOCOL_VERSION
      || typeof raw.senderKey !== "string"
      || raw.senderKey.length < 1
      || raw.senderKey.length > 128
      || (raw.senderRole !== "host" && raw.senderRole !== "guest")
      || !("payload" in raw)) {
      const reason: CoopSecurityReason = isRecord(raw)
        && typeof raw.protocol === "number"
        && raw.protocol !== COOP_PROTOCOL_VERSION
        ? "incompatible-protocol"
        : "invalid-envelope";
      return this.reject(reason, typeof raw === "object" ? "unknown" : "malformed", nowMs);
    }
    if (safePayloadBytes(raw.payload) > maxBytes) {
      return this.reject("oversized-payload", raw.senderKey, nowMs);
    }
    if (!hasOnlyFiniteNumbers(raw.payload)) {
      return this.reject("corrupt-payload", raw.senderKey, nowMs);
    }
    const sender = participants.find((participant) => participant.key === raw.senderKey);
    if (!sender && !allowUnknownSender) {
      return this.reject("unknown-sender", raw.senderKey, nowMs);
    }
    if (sender && sender.role !== raw.senderRole) {
      return this.reject("role-violation", raw.senderKey, nowMs);
    }
    return this.accept({ envelope: raw as unknown as CoopWireEnvelope, sender });
  }

  validateInput(
    payload: unknown,
    sender: CoopParticipant,
    nowMs: number,
  ): CoopSecurityDecision<CoopInputMessage> {
    if (!isRecord(payload)
      || !integerInRange(payload.slot, 1, COOP_MAX_PLAYERS - 1)
      || !integerInRange(payload.seq, 1, Number.MAX_SAFE_INTEGER)
      || !integerInRange(payload.bits, 0, INPUT_BITS_MASK)) {
      return this.reject("corrupt-payload", sender.key, nowMs);
    }
    if (sender.role !== "guest") return this.reject("role-violation", sender.key, nowMs);
    if (payload.slot !== sender.slot) return this.reject("slot-spoof", sender.key, nowMs);

    const state = this.inputWindows.get(sender.slot) ?? {
      lastSeq: -1,
      tokens: INPUT_BURST_TOKENS,
      lastRefillMs: nowMs,
    };
    const elapsed = Math.max(0, nowMs - state.lastRefillMs);
    state.tokens = Math.min(
      INPUT_BURST_TOKENS,
      state.tokens + elapsed * (COOP_INPUT_RATE_HZ / 1000),
    );
    state.lastRefillMs = nowMs;

    if (payload.seq === state.lastSeq) {
      this.inputWindows.set(sender.slot, state);
      return this.reject("duplicate-sequence", sender.key, nowMs);
    }
    if (payload.seq < state.lastSeq) {
      this.inputWindows.set(sender.slot, state);
      return this.reject("old-sequence", sender.key, nowMs);
    }
    if (state.tokens < 1) {
      this.inputWindows.set(sender.slot, state);
      return this.reject("input-rate-limit", sender.key, nowMs);
    }

    state.tokens -= 1;
    state.lastSeq = payload.seq;
    this.inputWindows.set(sender.slot, state);
    return this.accept(payload as unknown as CoopInputMessage);
  }

  validateCharges(
    payload: unknown,
    sender: CoopParticipant,
    nowMs: number,
  ): CoopSecurityDecision<CoopChargesMessage> {
    if (!isRecord(payload)
      || !integerInRange(payload.slot, 1, COOP_MAX_PLAYERS - 1)
      || !integerInRange(payload.healingDelta, 0, 1000)
      || !integerInRange(payload.powerDelta, 0, 1000)) {
      return this.reject("corrupt-payload", sender.key, nowMs);
    }
    if (sender.role !== "guest") return this.reject("role-violation", sender.key, nowMs);
    if (payload.slot !== sender.slot) return this.reject("slot-spoof", sender.key, nowMs);
    // El host no puede verificar el save ni el gasto de ORO del guest desde un
    // broadcast. Aceptar incrementos aqui seria fingir autoridad cliente-side.
    return this.reject("untrusted-charge-increment", sender.key, nowMs);
  }

  validateStart(payload: unknown, sender: CoopParticipant, nowMs: number): CoopSecurityDecision<CoopStartMessage> {
    if (sender.role !== "host") return this.reject("unauthorized-transition", sender.key, nowMs);
    if (!isRecord(payload)
      || typeof payload.levelId !== "string"
      || payload.levelId.length < 1
      || payload.levelId.length > 96
      || !Array.isArray(payload.roster)
      || payload.roster.length < 1
      || payload.roster.length > 4) {
      return this.reject("corrupt-payload", sender.key, nowMs);
    }
    return this.accept(payload as unknown as CoopStartMessage);
  }

  validateEnd(payload: unknown, sender: CoopParticipant, nowMs: number): CoopSecurityDecision<CoopEndMessage> {
    if (!isRecord(payload)
      || (payload.reason !== "won" && payload.reason !== "lost" && payload.reason !== "left")
      || (payload.slot !== undefined
        && !integerInRange(payload.slot, 0, COOP_MAX_PLAYERS - 1))) {
      return this.reject("corrupt-payload", sender.key, nowMs);
    }
    if (payload.reason === "left") {
      if (sender.role === "guest" && payload.slot !== sender.slot) {
        return this.reject("slot-spoof", sender.key, nowMs);
      }
    } else if (sender.role !== "host") {
      return this.reject("unauthorized-transition", sender.key, nowMs);
    }
    return this.accept(payload as unknown as CoopEndMessage);
  }

  validateSnapshot<T>(payload: unknown, sender: CoopParticipant, nowMs: number): CoopSecurityDecision<T> {
    if (sender.role !== "host") return this.reject("role-violation", sender.key, nowMs);
    if (!isRecord(payload) || !integerInRange(payload.seq, 1, Number.MAX_SAFE_INTEGER)) {
      return this.reject("corrupt-payload", sender.key, nowMs);
    }
    return this.accept(payload as T);
  }

  noteBlockedParticipant(): void {
    this.metricsState.blockedParticipants += 1;
  }

  metrics(): CoopSecurityMetrics {
    return structuredClone(this.metricsState);
  }

  reset(): void {
    this.inputWindows.clear();
    this.anomalyTimes.clear();
    this.metricsState = this.emptyMetrics();
  }

  private accept<T>(value: T): CoopSecurityDecision<T> {
    this.metricsState.accepted += 1;
    return { accepted: true, value, disconnectRecommended: false };
  }

  private reject<T>(reason: CoopSecurityReason, senderKey: string, nowMs: number): CoopSecurityDecision<T> {
    this.metricsState.discarded += 1;
    this.metricsState.droppedByReason[reason] = (this.metricsState.droppedByReason[reason] ?? 0) + 1;
    if (reason === "duplicate-sequence") this.metricsState.duplicateSequences += 1;
    if (reason === "old-sequence") this.metricsState.oldSequences += 1;
    if (reason === "input-rate-limit") this.metricsState.rateLimited += 1;
    if (reason === "incompatible-protocol") this.metricsState.incompatibleProtocol += 1;
    if (reason === "slot-spoof") this.metricsState.slotSpoofs += 1;

    const recent = (this.anomalyTimes.get(senderKey) ?? [])
      .filter((time) => nowMs - time <= ANOMALY_WINDOW_MS);
    recent.push(nowMs);
    this.anomalyTimes.set(senderKey, recent);
    return {
      accepted: false,
      reason,
      disconnectRecommended: recent.length >= BLOCK_THRESHOLD,
    };
  }

  private emptyMetrics(): CoopSecurityMetrics {
    return {
      accepted: 0,
      discarded: 0,
      duplicateSequences: 0,
      oldSequences: 0,
      rateLimited: 0,
      incompatibleProtocol: 0,
      slotSpoofs: 0,
      blockedParticipants: 0,
      droppedByReason: {},
    };
  }
}

export function createWireEnvelope(
  senderKey: string,
  senderRole: CoopRole,
  payload: unknown,
): CoopWireEnvelope {
  return { protocol: COOP_PROTOCOL_VERSION, senderKey, senderRole, payload };
}
