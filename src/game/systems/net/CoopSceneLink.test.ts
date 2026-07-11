import { describe, expect, it } from "vitest";
import {
  emptyGameplayInputState,
  type GameplayInputFrame,
  type GameplayInputState,
} from "../../../shared/types/input";
import { CoopSceneLink, type CoopLinkTransport } from "./CoopSceneLink";
import {
  packInputState,
  unpackInputState,
  type CoopEndMessage,
  type CoopEndReason,
  type CoopInputMessage,
  type CoopStartMessage,
} from "./coopMessages";

interface TestSnapshot {
  seq: number;
  hostTimeMs?: number;
  value: string;
  enemies?: Array<[number, number, number]>;
  platforms?: Array<[number, number, number]>;
}

class FakeTransport implements CoopLinkTransport {
  readonly inputHandlers = new Set<(message: CoopInputMessage) => void>();
  readonly snapshotHandlers = new Set<(snapshot: unknown) => void>();
  readonly endHandlers = new Set<(message: CoopEndMessage) => void>();
  readonly peerLeftHandlers = new Set<() => void>();
  readonly participantLeftHandlers = new Set<(slot: number) => void>();
  readonly startHandlers = new Set<(message: CoopStartMessage) => void>();
  readonly sentInputs: CoopInputMessage[] = [];
  readonly sentSnapshots: unknown[] = [];
  readonly sentEnds: { reason: CoopEndReason; slot?: number }[] = [];
  leaveCalls = 0;
  throwOnInputSend = false;
  private inputSeq = 0;

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
  onStart(cb: (message: CoopStartMessage) => void): () => void {
    this.startHandlers.add(cb);
    return () => this.startHandlers.delete(cb);
  }
  sendInput(message: CoopInputMessage): void {
    if (this.throwOnInputSend) throw new Error("input transport failed");
    this.sentInputs.push(message);
  }
  sendSnapshot(snapshot: unknown): void {
    this.sentSnapshots.push(snapshot);
  }
  sendEnd(reason: CoopEndReason, slot?: number): void {
    this.sentEnds.push({ reason, slot });
  }
  leave(): void {
    this.leaveCalls += 1;
  }

  emitInput(message: CoopInputMessage): void {
    this.inputHandlers.forEach((cb) => cb(message));
  }
  emitSnapshot(snapshot: TestSnapshot): void {
    const timed = { ...snapshot, hostTimeMs: snapshot.hostTimeMs ?? snapshot.seq * 50 };
    this.snapshotHandlers.forEach((cb) => cb(timed));
  }
  emitEnd(reason: CoopEndReason, slot?: number): void {
    this.endHandlers.forEach((cb) => cb({ reason, slot }));
  }
  emitParticipantLeft(slot: number): void {
    this.participantLeftHandlers.forEach((cb) => cb(slot));
  }
  emitStart(message: CoopStartMessage): void {
    this.startHandlers.forEach((cb) => cb(message));
  }
}

const noopHooks = { onRemoteEnd: () => undefined, onPeerLeft: () => undefined };

// Frame local sin flancos: el estado sostenido es la unica fuente de bits.
function asFrame(state: Partial<GameplayInputState>): GameplayInputFrame {
  return {
    ...emptyGameplayInputState,
    ...state,
    jumpJustPressed: false,
    meleeJustPressed: false,
    spinJustPressed: false,
    healJustPressed: false,
    powerJustPressed: false,
    pauseJustPressed: false,
  };
}

function makeHost(transport: FakeTransport): CoopSceneLink<TestSnapshot> {
  return new CoopSceneLink<TestSnapshot>(
    { role: "host", code: "ABCD", localSlot: 0, roster: [] },
    transport,
  );
}

function makeGuest(transport: FakeTransport, localSlot = 1): CoopSceneLink<TestSnapshot> {
  return new CoopSceneLink<TestSnapshot>(
    { role: "guest", code: "ABCD", localSlot, roster: [] },
    transport,
  );
}

describe("CoopSceneLink host", () => {
  it("descarta inputs con seq viejo y conserva el mas reciente", () => {
    const transport = new FakeTransport();
    const link = makeHost(transport);
    link.bind(noopHooks);

    transport.emitInput({ slot: 1, seq: 2, bits: packInputState({ ...emptyGameplayInputState, right: true }) });
    transport.emitInput({ slot: 1, seq: 1, bits: packInputState({ ...emptyGameplayInputState, left: true }) });

    const frame = link.consumeRemoteInputFrame(1);
    expect(frame.right).toBe(true);
    expect(frame.left).toBe(false);
  });

  it("reconstruye flancos justPressed solo en la transicion", () => {
    const transport = new FakeTransport();
    const link = makeHost(transport);
    link.bind(noopHooks);

    transport.emitInput({ slot: 1, seq: 1, bits: packInputState({ ...emptyGameplayInputState, jump: true }) });
    expect(link.consumeRemoteInputFrame(1).jumpJustPressed).toBe(true);
    // El mismo estado sostenido no vuelve a disparar el flanco.
    expect(link.consumeRemoteInputFrame(1).jumpJustPressed).toBe(false);

    transport.emitInput({ slot: 1, seq: 2, bits: 0 });
    expect(link.consumeRemoteInputFrame(1).jump).toBe(false);
    transport.emitInput({ slot: 1, seq: 3, bits: packInputState({ ...emptyGameplayInputState, jump: true }) });
    expect(link.consumeRemoteInputFrame(1).jumpJustPressed).toBe(true);
  });

  // Un tap corto puede llegar como press+release en el mismo lote de red, entre
  // dos frames del host: el flanco no debe perderse por el colapso.
  it("retiene el flanco cuando el press y el release llegan entre dos consumos", () => {
    const transport = new FakeTransport();
    const link = makeHost(transport);
    link.bind(noopHooks);

    transport.emitInput({ slot: 1, seq: 1, bits: packInputState({ ...emptyGameplayInputState, jump: true }) });
    transport.emitInput({ slot: 1, seq: 2, bits: 0 });

    const frame = link.consumeRemoteInputFrame(1);
    expect(frame.jump).toBe(false);
    expect(frame.jumpJustPressed).toBe(true);
    // El flanco retenido se consume una sola vez.
    expect(link.consumeRemoteInputFrame(1).jumpJustPressed).toBe(false);
  });

  // Cada guest (slot) mantiene su propio estado y numeracion de seq: los inputs
  // de uno no deben contaminar al otro. Prepara el terreno para 3-4 jugadores.
  it("enruta inputs por slot de emisor de forma independiente", () => {
    const transport = new FakeTransport();
    const link = makeHost(transport);
    link.bind(noopHooks);

    transport.emitInput({ slot: 1, seq: 1, bits: packInputState({ ...emptyGameplayInputState, left: true }) });
    transport.emitInput({ slot: 2, seq: 1, bits: packInputState({ ...emptyGameplayInputState, right: true }) });

    const slot1 = link.consumeRemoteInputFrame(1);
    const slot2 = link.consumeRemoteInputFrame(2);
    expect(slot1.left).toBe(true);
    expect(slot1.right).toBe(false);
    expect(slot2.right).toBe(true);
    expect(slot2.left).toBe(false);

    // El seq se deduplica por slot: un seq 1 en el slot 2 no bloquea al slot 1.
    transport.emitInput({ slot: 1, seq: 2, bits: 0 });
    expect(link.consumeRemoteInputFrame(1).left).toBe(false);
    expect(link.consumeRemoteInputFrame(2).right).toBe(true);
  });

  it("un slot sin input devuelve un frame vacio", () => {
    const transport = new FakeTransport();
    const link = makeHost(transport);
    link.bind(noopHooks);

    const frame = link.consumeRemoteInputFrame(3);
    expect(frame).toEqual({
      ...emptyGameplayInputState,
      jumpJustPressed: false,
      meleeJustPressed: false,
      spinJustPressed: false,
      healJustPressed: false,
      powerJustPressed: false,
      pauseJustPressed: false,
    });
  });

  it("limita los snapshots a la frecuencia configurada con seq creciente", () => {
    const transport = new FakeTransport();
    const link = makeHost(transport);
    const build = (seq: number): TestSnapshot => ({ seq, value: "estado" });

    link.maybeSendSnapshot(50, build);
    link.maybeSendSnapshot(80, build); // 30 ms despues: descartado (20 Hz = 50 ms)
    link.maybeSendSnapshot(105, build);

    expect(transport.sentSnapshots).toEqual([
      { seq: 1, hostTimeMs: 50, inputSeqBySlot: [0], value: "estado" },
      { seq: 2, hostTimeMs: 105, inputSeqBySlot: [0], value: "estado" },
    ]);
  });

  it("confirma en el snapshot el ultimo input consumido por cada slot", () => {
    const transport = new FakeTransport();
    const link = makeHost(transport);
    link.bind(noopHooks);
    transport.emitInput({
      slot: 1,
      seq: 7,
      bits: packInputState({ ...emptyGameplayInputState, right: true }),
    });
    link.consumeRemoteInputFrame(1);

    link.maybeSendSnapshot(50, (seq) => ({ seq, value: "estado" }));

    expect(transport.sentSnapshots[0]).toMatchObject({ inputSeqBySlot: [0, 7] });
  });

  it("omite secciones opcionales si no cambiaron (delta compression)", () => {
    const transport = new FakeTransport();
    const link = makeHost(transport);
    const build = (seq: number): TestSnapshot => ({ seq, value: "estado", enemies: [[1, 10, 20]], platforms: [] });

    link.maybeSendSnapshot(50, build);
    link.maybeSendSnapshot(100, build);
    link.maybeSendSnapshot(150, (seq) => ({ seq, value: "estado", enemies: [[1, 15, 20]], platforms: [] }));

    expect(transport.sentSnapshots).toEqual([
      { seq: 1, hostTimeMs: 50, inputSeqBySlot: [0], value: "estado", enemies: [[1, 10, 20]], platforms: [] },
      { seq: 2, hostTimeMs: 100, inputSeqBySlot: [0], value: "estado" },
      { seq: 3, hostTimeMs: 150, inputSeqBySlot: [0], value: "estado", enemies: [[1, 15, 20]] },
    ]);
  });
});

describe("CoopSceneLink guest", () => {
  it("envia el input inmediatamente al cambiar y como keepalive espaciado sin cambios", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);
    const idle = asFrame({});
    const running = asFrame({ right: true });

    link.sendLocalInput(100, running); // cambio inicial: se envia
    link.sendLocalInput(120, running); // sin cambios, 20 ms: silencio
    link.sendLocalInput(180, running); // sin cambios, 80 ms: silencio (keepalive 100 ms)
    link.sendLocalInput(210, running); // sin cambios, 110 ms: keepalive
    link.sendLocalInput(220, idle); // cambio, pero a 10 ms del ultimo envio: espera
    link.sendLocalInput(250, idle); // cambio pendiente, 40 ms: se envia

    expect(transport.sentInputs.map((message) => message.seq)).toEqual([1, 2, 3]);
    expect(transport.sentInputs[0].bits).toBe(packInputState(running));
    expect(transport.sentInputs[2].bits).toBe(packInputState(idle));
  });

  it("expone para prediccion solo comandos que realmente cruzaron el transporte", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);
    const running = asFrame({ right: true });

    const sent = link.sendLocalInput(100, running);
    const throttled = link.sendLocalInput(110, running);

    expect(sent).toEqual({
      seq: 1,
      state: { ...emptyGameplayInputState, right: true },
    });
    expect(throttled).toBeUndefined();
  });

  it("estampa su slot local en cada input enviado", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport, 2);

    link.sendLocalInput(100, asFrame({ right: true }));

    expect(transport.sentInputs[0].slot).toBe(2);
  });

  // Los taps tactiles pueden vivir un solo frame como justPressed sin estado
  // sostenido (cola de TouchInputStore): deben entrar igual a los bits.
  it("funde los flancos justPressed del frame local en los bits enviados", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);
    const tap: GameplayInputFrame = { ...asFrame({}), jumpJustPressed: true };

    link.sendLocalInput(100, tap);
    link.sendLocalInput(150, asFrame({}));

    expect(transport.sentInputs).toHaveLength(2);
    expect(transport.sentInputs[0].bits).toBe(packInputState({ ...emptyGameplayInputState, jump: true }));
    expect(transport.sentInputs[1].bits).toBe(0);
  });

  it("conserva un justPressed bloqueado por el throttle hasta poder enviarlo una sola vez", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);

    link.sendLocalInput(100, asFrame({}));
    link.sendLocalInput(110, { ...asFrame({}), jumpJustPressed: true });
    link.sendLocalInput(120, asFrame({}));
    expect(transport.sentInputs).toHaveLength(1);

    link.sendLocalInput(134, asFrame({}));
    link.sendLocalInput(168, asFrame({}));
    link.sendLocalInput(220, asFrame({}));

    expect(transport.sentInputs.map((message) => message.bits)).toEqual([
      0,
      packInputState({ ...emptyGameplayInputState, jump: true }),
      0,
    ]);
  });

  it("acumula flancos de acciones distintas recibidos en varios frames bloqueados", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);

    link.sendLocalInput(100, asFrame({ right: true }));
    link.sendLocalInput(108, {
      ...asFrame({ right: true }),
      jumpJustPressed: true,
      meleeJustPressed: true,
    });
    link.sendLocalInput(116, { ...asFrame({ right: true }), powerJustPressed: true });
    link.sendLocalInput(124, asFrame({ right: true }));
    link.sendLocalInput(132, asFrame({ right: true }));
    expect(transport.sentInputs).toHaveLength(1);

    link.sendLocalInput(134, asFrame({ right: true }));
    link.sendLocalInput(168, asFrame({ right: true }));

    expect(unpackInputState(transport.sentInputs[1].bits)).toEqual({
      ...emptyGameplayInputState,
      right: true,
      jump: true,
      melee: true,
      power: true,
    });
    expect(unpackInputState(transport.sentInputs[2].bits)).toEqual({
      ...emptyGameplayInputState,
      right: true,
    });
  });

  it("envia el flanco acumulado en el primer frame permitido por el limite temporal", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);

    link.sendLocalInput(100, asFrame({}));
    link.sendLocalInput(133, { ...asFrame({}), spinJustPressed: true });
    expect(transport.sentInputs).toHaveLength(1);

    link.sendLocalInput(134, asFrame({}));
    expect(transport.sentInputs).toHaveLength(2);
    expect(unpackInputState(transport.sentInputs[1].bits).spin).toBe(true);
  });

  it("serializa dos flancos de la misma accion sin colapsarlos ni duplicarlos", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);

    link.sendLocalInput(100, asFrame({}));
    link.sendLocalInput(108, { ...asFrame({}), jumpJustPressed: true });
    link.sendLocalInput(116, asFrame({}));
    link.sendLocalInput(124, { ...asFrame({}), jumpJustPressed: true });

    link.sendLocalInput(134, asFrame({}));
    link.sendLocalInput(168, asFrame({}));
    link.sendLocalInput(202, asFrame({}));
    link.sendLocalInput(236, asFrame({}));

    expect(transport.sentInputs.map((message) => message.bits)).toEqual([
      0,
      packInputState({ ...emptyGameplayInputState, jump: true }),
      0,
      packInputState({ ...emptyGameplayInputState, jump: true }),
      0,
    ]);
  });

  it("conserva el flanco y la secuencia si el transporte rechaza el envio", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);

    link.sendLocalInput(100, asFrame({}));
    link.sendLocalInput(108, { ...asFrame({}), powerJustPressed: true });
    transport.throwOnInputSend = true;
    expect(() => link.sendLocalInput(134, asFrame({}))).toThrow("input transport failed");

    transport.throwOnInputSend = false;
    link.sendLocalInput(134, asFrame({}));

    expect(transport.sentInputs).toHaveLength(2);
    expect(transport.sentInputs[1]).toEqual({
      slot: 1,
      seq: 3,
      bits: packInputState({ ...emptyGameplayInputState, power: true }),
    });
  });

  it("no dispara nada si se llama a dispose por segunda vez", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);
    link.dispose();
    link.dispose();
    expect(transport.leaveCalls).toBe(2);
  });

  it("propaga onParticipantLeft desde el transport si se bind", () => {
    const transport = new FakeTransport();
    const link = makeHost(transport);
    let leftSlot = -1;
    link.bind({ ...noopHooks, onParticipantLeft: (slot) => { leftSlot = slot; } });
    transport.emitParticipantLeft(1);
    expect(leftSlot).toBe(1);
  });

  // Encadenado de niveles: el host reenvia `start` con el proximo nivel y el
  // roster vigente; el guest lo recibe por este hook para reiniciar su escena.
  it("propaga el start del host como encadenado de siguiente nivel", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);
    let received: CoopStartMessage | undefined;
    link.bind({ ...noopHooks, onStartNextLevel: (message) => { received = message; } });

    transport.emitStart({ levelId: "trialChamber2", roster: [{ slot: 0, characterId: "ruder" }] });

    expect(received).toEqual({
      levelId: "trialChamber2",
      roster: [{ slot: 0, characterId: "ruder" }],
    });
  });

  it("dispose con keepSession desuscribe callbacks pero conserva la sala", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);
    link.bind(noopHooks);

    link.dispose(true);

    expect(transport.leaveCalls).toBe(0);
    transport.emitSnapshot({ seq: 1, value: "tarde" });
    expect(link.latestSnapshot).toBeUndefined();
  });

  it("incluye el localSlot al enviar fin voluntario", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport, 2);
    link.finish("left");
    expect(transport.sentEnds).toEqual([{ reason: "left", slot: 2 }]);
  });

  it("ignora snapshots con seq viejo o repetido", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);
    link.bind(noopHooks);

    transport.emitSnapshot({ seq: 1, value: "a" });
    transport.emitSnapshot({ seq: 3, value: "c" });
    transport.emitSnapshot({ seq: 2, value: "b" });
    transport.emitSnapshot({ seq: 3, value: "duplicado" });

    expect(link.latestSnapshot).toEqual({ seq: 3, hostTimeMs: 150, value: "c" });
  });

  it("reconstruye secciones opcionales omitidas usando el estado previo", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);
    link.bind(noopHooks);

    transport.emitSnapshot({ seq: 1, value: "a", enemies: [[1, 10, 20]], platforms: [] } as TestSnapshot);
    expect(link.latestSnapshot).toEqual({ seq: 1, hostTimeMs: 50, value: "a", enemies: [[1, 10, 20]], platforms: [] });

    transport.emitSnapshot({ seq: 2, value: "b" } as TestSnapshot);
    expect(link.latestSnapshot).toEqual({ seq: 2, hostTimeMs: 100, value: "b", enemies: [[1, 10, 20]], platforms: [] });

    transport.emitSnapshot({ seq: 3, value: "c", platforms: [[2, 5, 5]] } as TestSnapshot);
    expect(link.latestSnapshot).toEqual({ seq: 3, hostTimeMs: 150, value: "c", enemies: [[1, 10, 20]], platforms: [[2, 5, 5]] });
  });
});

describe("CoopSceneLink fin de sesion", () => {
  it("finish notifica una sola vez y bloquea cierres repetidos", () => {
    const transport = new FakeTransport();
    const link = makeHost(transport);

    expect(link.finish("won")).toBe(true);
    expect(link.finish("left")).toBe(false);
    expect(link.markEnded()).toBe(false);
    expect(transport.sentEnds).toEqual([{ reason: "won", slot: 0 }]);
  });

  it("markEnded no notifica pero bloquea un finish posterior", () => {
    const transport = new FakeTransport();
    const link = makeHost(transport);

    expect(link.markEnded()).toBe(true);
    expect(link.finish("left")).toBe(false);
    expect(transport.sentEnds).toEqual([]);
  });

  it("dispose desuscribe los callbacks y abandona la sesion", () => {
    const transport = new FakeTransport();
    const link = makeGuest(transport);
    let remoteEnds = 0;
    link.bind({ onRemoteEnd: () => { remoteEnds += 1; }, onPeerLeft: () => undefined });

    transport.emitEnd("won");
    link.dispose();
    transport.emitEnd("lost");
    transport.emitSnapshot({ seq: 9, value: "tarde" });

    expect(remoteEnds).toBe(1);
    expect(link.latestSnapshot).toBeUndefined();
    expect(transport.leaveCalls).toBe(1);
  });
});
