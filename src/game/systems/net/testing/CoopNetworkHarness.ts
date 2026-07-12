import type { CoopSessionInfo } from "../../../events/EventBus";
import type { GameplayInputFrame } from "../../../../shared/types/input";
import type { CoopLinkTransport } from "../CoopSceneLink";
import { createWireEnvelope } from "../coopSecurity";
import {
  assignSlots,
  COOP_MAX_PLAYERS,
  COOP_PROTOCOL_VERSION,
  type CoopEndMessage,
  type CoopEndReason,
  type CoopHello,
  type CoopInputMessage,
  type CoopParticipant,
  type CoopRole,
  type CoopStartMessage,
} from "../coopMessages";

export type SimulatedEvent =
  | "input"
  | "snapshot"
  | "start"
  | "end"
  | "participant-left"
  | "participant-rejoined"
  | "participant-reconnect-expired"
  | "peer-left";

interface NetworkEnvelope {
  id: number;
  from: string;
  to: string;
  event: SimulatedEvent;
  payload: unknown;
  deliverAt: number;
  bytes: number;
}

export interface EventTraffic {
  publications: number;
  deliveries: number;
  droppedDeliveries: number;
  bytesPublished: number;
  bytesDelivered: number;
}

export interface TrafficSnapshot {
  publications: number;
  deliveries: number;
  droppedDeliveries: number;
  bytesPublished: number;
  bytesDelivered: number;
  byEvent: Record<string, EventTraffic>;
}

interface SimulatedMember {
  id: string;
  role: CoopRole;
  hello: Required<CoopHello>;
  transport: SimulatedTransport;
}

function emptyEventTraffic(): EventTraffic {
  return {
    publications: 0,
    deliveries: 0,
    droppedDeliveries: 0,
    bytesPublished: 0,
    bytesDelivered: 0,
  };
}

function payloadBytes(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
}

export class SimulatedRoom {
  readonly code: string;
  private readonly members = new Map<string, SimulatedMember>();
  private readonly disconnectedMembers = new Set<string>();
  private queue: NetworkEnvelope[] = [];
  private nextEnvelopeId = 1;
  private nowMs = 0;
  private readonly nextDelays = new Map<SimulatedEvent, number[]>();
  private readonly dropsRemaining = new Map<SimulatedEvent, number>();
  private readonly traffic = new Map<SimulatedEvent, EventTraffic>();
  private readonly publicationPayloads = new Map<SimulatedEvent, unknown[]>();

  constructor(code = "TEST", readonly defaultJitterMs = 4) {
    this.code = code;
  }

  get timeMs(): number {
    return this.nowMs;
  }

  get participantCount(): number {
    return this.members.size;
  }

  get participants(): CoopParticipant[] {
    return assignSlots(
      [...this.members.values()].map((member) => ({
        key: member.id,
        role: member.role,
        characterId: member.hello.characterId,
        healingCharges: member.hello.healingCharges,
        powerCharges: member.hello.powerCharges,
      })),
    );
  }

  join(id: string, role: CoopRole, hello: CoopHello): SimulatedClient {
    if (this.members.has(id)) throw new Error(`El cliente ${id} ya esta en la sala.`);
    if (this.members.size >= COOP_MAX_PLAYERS) throw new Error("La sala esta llena.");
    if (role === "host" && [...this.members.values()].some((member) => member.role === "host")) {
      throw new Error("La sala ya tiene anfitrion.");
    }
    if (hello.protocol !== undefined && hello.protocol !== COOP_PROTOCOL_VERSION) {
      throw new Error("Las versiones del juego no coinciden.");
    }

    const transport = new SimulatedTransport(this, id, role);
    this.members.set(id, {
      id,
      role,
      hello: {
        characterId: hello.characterId,
        protocol: COOP_PROTOCOL_VERSION,
        healingCharges: hello.healingCharges ?? 0,
        powerCharges: hello.powerCharges ?? 0,
      },
      transport,
    });
    return new SimulatedClient(this, id, role, transport);
  }

  start(levelId: string): CoopStartMessage {
    const host = this.hostMember();
    const message: CoopStartMessage = {
      levelId,
      roster: this.participants.map((participant) => ({
        slot: participant.slot,
        characterId: participant.characterId,
        healingCharges: participant.healingCharges,
        powerCharges: participant.powerCharges,
      })),
    };
    this.publish(host.id, "start", message);
    return message;
  }

  leave(id: string): void {
    const member = this.members.get(id);
    if (!member) return;
    const previousSlot = this.participants.find((participant) => participant.key === id)?.slot ?? -1;
    this.members.delete(id);
    this.disconnectedMembers.delete(id);
    this.publishSystem("participant-left", previousSlot, [...this.members.keys()]);
    if (member.role === "host") {
      this.publishSystem("peer-left", undefined, [...this.members.keys()]);
    }
  }

  disconnect(id: string): void {
    const member = this.members.get(id);
    if (!member || this.disconnectedMembers.has(id)) return;
    const slot = this.participants.find((participant) => participant.key === id)?.slot ?? -1;
    this.disconnectedMembers.add(id);
    this.publishSystem(
      "participant-left",
      slot,
      [...this.members.keys()].filter((key) => key !== id && !this.disconnectedMembers.has(key)),
    );
  }

  reconnect(id: string, protocol = COOP_PROTOCOL_VERSION): void {
    if (!this.members.has(id) || !this.disconnectedMembers.has(id)) return;
    if (protocol !== COOP_PROTOCOL_VERSION) throw new Error("Las versiones del juego no coinciden.");
    const slot = this.participants.find((participant) => participant.key === id)?.slot ?? -1;
    this.disconnectedMembers.delete(id);
    this.publishSystem(
      "participant-rejoined",
      slot,
      [...this.members.keys()].filter((key) => key !== id && !this.disconnectedMembers.has(key)),
    );
  }

  expireReconnect(id: string): void {
    const member = this.members.get(id);
    if (!member || !this.disconnectedMembers.has(id)) return;
    const slot = this.participants.find((participant) => participant.key === id)?.slot ?? -1;
    this.members.delete(id);
    this.disconnectedMembers.delete(id);
    this.publishSystem(
      "participant-reconnect-expired",
      slot,
      [...this.members.keys()].filter((key) => !this.disconnectedMembers.has(key)),
    );
  }

  delayNext(event: SimulatedEvent, delayMs: number): void {
    const delays = this.nextDelays.get(event) ?? [];
    delays.push(delayMs);
    this.nextDelays.set(event, delays);
  }

  dropNext(event: SimulatedEvent, count = 1): void {
    this.dropsRemaining.set(event, (this.dropsRemaining.get(event) ?? 0) + count);
  }

  advanceTo(timeMs: number): void {
    if (timeMs < this.nowMs) throw new Error("El reloj de red no puede retroceder.");
    this.nowMs = timeMs;
    this.deliverDue();
  }

  advanceBy(deltaMs: number): void {
    this.advanceTo(this.nowMs + deltaMs);
  }

  flush(): void {
    while (this.queue.length > 0) {
      const nextTime = Math.min(...this.queue.map((envelope) => envelope.deliverAt));
      this.advanceTo(Math.max(this.nowMs, nextTime));
    }
  }

  metrics(): TrafficSnapshot {
    const byEvent = Object.fromEntries(
      [...this.traffic.entries()].map(([event, stats]) => [event, { ...stats }]),
    );
    return Object.values(byEvent).reduce<TrafficSnapshot>(
      (total, stats) => ({
        publications: total.publications + stats.publications,
        deliveries: total.deliveries + stats.deliveries,
        droppedDeliveries: total.droppedDeliveries + stats.droppedDeliveries,
        bytesPublished: total.bytesPublished + stats.bytesPublished,
        bytesDelivered: total.bytesDelivered + stats.bytesDelivered,
        byEvent,
      }),
      {
        publications: 0,
        deliveries: 0,
        droppedDeliveries: 0,
        bytesPublished: 0,
        bytesDelivered: 0,
        byEvent,
      },
    );
  }

  publishedPayloads(event: SimulatedEvent): unknown[] {
    return structuredClone(this.publicationPayloads.get(event) ?? []);
  }

  publish(from: string, event: SimulatedEvent, payload: unknown): void {
    const targets = this.targetsFor(from, event);
    this.enqueuePublication(from, event, payload, targets);
  }

  private publishSystem(event: SimulatedEvent, payload: unknown, targets: string[]): void {
    this.enqueuePublication("system", event, payload, targets);
  }

  private enqueuePublication(
    from: string,
    event: SimulatedEvent,
    payload: unknown,
    targets: string[],
  ): void {
    const sender = this.members.get(from);
    const measuredPayload = sender
      ? createWireEnvelope(sender.id, sender.role, payload)
      : payload;
    const bytes = payloadBytes(measuredPayload);
    const stats = this.eventTraffic(event);
    stats.publications += 1;
    stats.bytesPublished += bytes;
    const payloads = this.publicationPayloads.get(event) ?? [];
    payloads.push(structuredClone(payload));
    this.publicationPayloads.set(event, payloads);

    for (const to of targets) {
      const drops = this.dropsRemaining.get(event) ?? 0;
      if (drops > 0) {
        this.dropsRemaining.set(event, drops - 1);
        stats.droppedDeliveries += 1;
        continue;
      }
      const delays = this.nextDelays.get(event);
      const defaultDelayMs = this.defaultJitterMs > 0
        ? (this.nextEnvelopeId * 3) % (this.defaultJitterMs + 1)
        : 0;
      const delayMs = delays?.shift() ?? defaultDelayMs;
      this.queue.push({
        id: this.nextEnvelopeId++,
        from,
        to,
        event,
        payload: structuredClone(payload),
        deliverAt: this.nowMs + delayMs,
        bytes,
      });
    }
  }

  private targetsFor(from: string, event: SimulatedEvent): string[] {
    if (this.disconnectedMembers.has(from)) return [];
    if (event === "input") {
      const hostId = this.hostMember().id;
      return this.disconnectedMembers.has(hostId) ? [] : [hostId];
    }
    if (event === "snapshot" || event === "start") {
      return [...this.members.values()]
        .filter((member) => member.role === "guest" && !this.disconnectedMembers.has(member.id))
        .map((member) => member.id);
    }
    return [...this.members.keys()].filter(
      (id) => id !== from && !this.disconnectedMembers.has(id),
    );
  }

  private hostMember(): SimulatedMember {
    const host = [...this.members.values()].find((member) => member.role === "host");
    if (!host) throw new Error("La sala no tiene anfitrion.");
    return host;
  }

  private deliverDue(): void {
    const due = this.queue
      .filter((envelope) => envelope.deliverAt <= this.nowMs)
      .sort((a, b) => a.deliverAt - b.deliverAt || a.id - b.id);
    const dueIds = new Set(due.map((envelope) => envelope.id));
    this.queue = this.queue.filter((envelope) => !dueIds.has(envelope.id));
    for (const envelope of due) {
      const target = this.members.get(envelope.to);
      if (!target) continue;
      const stats = this.eventTraffic(envelope.event);
      stats.deliveries += 1;
      stats.bytesDelivered += envelope.bytes;
      target.transport.deliver(envelope.event, envelope.payload);
    }
  }

  private eventTraffic(event: SimulatedEvent): EventTraffic {
    let stats = this.traffic.get(event);
    if (!stats) {
      stats = emptyEventTraffic();
      this.traffic.set(event, stats);
    }
    return stats;
  }
}

export class SimulatedClient {
  constructor(
    private readonly room: SimulatedRoom,
    readonly id: string,
    readonly role: CoopRole,
    readonly transport: SimulatedTransport,
  ) {}

  get slot(): number {
    const participant = this.room.participants.find((entry) => entry.key === this.id);
    if (!participant) throw new Error(`El cliente ${this.id} ya no esta en la sala.`);
    return participant.slot;
  }

  sessionInfo(roster = this.room.participants): CoopSessionInfo {
    return {
      role: this.role,
      code: this.room.code,
      localSlot: this.slot,
      roster: roster.map((participant) => ({
        slot: participant.slot,
        characterId: participant.characterId,
        healingCharges: participant.healingCharges,
        powerCharges: participant.powerCharges,
      })),
    };
  }
}

export class SimulatedTransport implements CoopLinkTransport {
  private readonly inputHandlers = new Set<(message: CoopInputMessage) => void>();
  private readonly snapshotHandlers = new Set<(snapshot: unknown) => void>();
  private readonly endHandlers = new Set<(message: CoopEndMessage) => void>();
  private readonly peerLeftHandlers = new Set<() => void>();
  private readonly participantLeftHandlers = new Set<(slot: number) => void>();
  private readonly participantRejoinedHandlers = new Set<(slot: number) => void>();
  private readonly participantReconnectExpiredHandlers = new Set<(slot: number) => void>();
  private readonly startHandlers = new Set<(message: CoopStartMessage) => void>();
  private inputSeq = 0;

  constructor(
    private readonly room: SimulatedRoom,
    readonly clientId: string,
    readonly role: CoopRole,
  ) {}

  generateInputSeq(): number {
    this.inputSeq += 1;
    return this.inputSeq;
  }

  onInput(cb: (message: CoopInputMessage) => void): () => void {
    this.inputHandlers.add(cb);
    return () => this.inputHandlers.delete(cb);
  }

  onSnapshot<T>(cb: (snapshot: T) => void): () => void {
    const wrapped = cb as (snapshot: unknown) => void;
    this.snapshotHandlers.add(wrapped);
    return () => this.snapshotHandlers.delete(wrapped);
  }

  onEnd(cb: (message: CoopEndMessage) => void): () => void {
    this.endHandlers.add(cb);
    return () => this.endHandlers.delete(cb);
  }

  onPeerLeft(cb: () => void): () => void {
    this.peerLeftHandlers.add(cb);
    return () => this.peerLeftHandlers.delete(cb);
  }

  onParticipantLeft(cb: (slot: number) => void): () => void {
    this.participantLeftHandlers.add(cb);
    return () => this.participantLeftHandlers.delete(cb);
  }

  onParticipantRejoined(cb: (slot: number) => void): () => void {
    this.participantRejoinedHandlers.add(cb);
    return () => this.participantRejoinedHandlers.delete(cb);
  }

  onParticipantReconnectExpired(cb: (slot: number) => void): () => void {
    this.participantReconnectExpiredHandlers.add(cb);
    return () => this.participantReconnectExpiredHandlers.delete(cb);
  }

  onStart(cb: (message: CoopStartMessage) => void): () => void {
    this.startHandlers.add(cb);
    return () => this.startHandlers.delete(cb);
  }

  sendInput(message: CoopInputMessage): void {
    this.room.publish(this.clientId, "input", message);
  }

  sendSnapshot(snapshot: unknown): void {
    this.room.publish(this.clientId, "snapshot", snapshot);
  }

  sendEnd(reason: CoopEndReason, slot?: number): void {
    this.room.publish(this.clientId, "end", { reason, slot } satisfies CoopEndMessage);
  }

  leave(): void {
    this.room.leave(this.clientId);
  }

  deliver(event: SimulatedEvent, payload: unknown): void {
    if (event === "input") {
      this.inputHandlers.forEach((handler) => handler(payload as CoopInputMessage));
    } else if (event === "snapshot") {
      this.snapshotHandlers.forEach((handler) => handler(payload));
    } else if (event === "start") {
      this.startHandlers.forEach((handler) => handler(payload as CoopStartMessage));
    } else if (event === "end") {
      this.endHandlers.forEach((handler) => handler(payload as CoopEndMessage));
    } else if (event === "participant-left") {
      this.participantLeftHandlers.forEach((handler) => handler(payload as number));
    } else if (event === "participant-rejoined") {
      this.participantRejoinedHandlers.forEach((handler) => handler(payload as number));
    } else if (event === "participant-reconnect-expired") {
      this.participantReconnectExpiredHandlers.forEach((handler) => handler(payload as number));
    } else if (event === "peer-left") {
      this.peerLeftHandlers.forEach((handler) => handler());
    }
  }
}

export function inputFrame(
  state: Partial<GameplayInputFrame> = {},
): GameplayInputFrame {
  return {
    left: false,
    right: false,
    jump: false,
    melee: false,
    spin: false,
    heal: false,
    power: false,
    pause: false,
    jumpJustPressed: false,
    meleeJustPressed: false,
    spinJustPressed: false,
    healJustPressed: false,
    powerJustPressed: false,
    pauseJustPressed: false,
    ...state,
  };
}
