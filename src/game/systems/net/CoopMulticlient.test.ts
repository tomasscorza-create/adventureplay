import { describe, expect, it } from "vitest";
import { CoopSceneLink } from "./CoopSceneLink";
import type { CoopEndReason, CoopStartMessage } from "./coopMessages";
import {
  inputFrame,
  SimulatedRoom,
  type SimulatedClient,
  type TrafficSnapshot,
} from "./testing/CoopNetworkHarness";

interface SimulatedPlayerState {
  x: number;
  jumps: number;
  attacks: number;
  powers: number;
  powerCharges: number;
  health: number;
}

interface SimulatedWorldSnapshot {
  seq: number;
  levelId: string;
  players: SimulatedPlayerState[];
  enemies?: Array<[number, number, number]>;
  won: boolean;
  lost: boolean;
}

interface ClientRuntime {
  client: SimulatedClient;
  link: CoopSceneLink<SimulatedWorldSnapshot>;
  ends: Array<{ reason: CoopEndReason; slot?: number }>;
  departedSlots: number[];
  rejoinedSlots: number[];
  expiredSlots: number[];
  nextLevels: CoopStartMessage[];
}

class SimulatedCoopGame {
  readonly room = new SimulatedRoom("TEST", 0);
  readonly runtimes: ClientRuntime[];
  readonly players: SimulatedPlayerState[];
  private levelId = "level-1";
  private won = false;
  private lost = false;

  constructor(playerCount: 2 | 3 | 4) {
    const heroes = ["ruder", "amy", "sarix", "dunel"];
    const clients: SimulatedClient[] = [
      this.room.join("host", "host", {
        characterId: heroes[0],
        healingCharges: 1,
        powerCharges: 2,
      }),
    ];
    for (let index = 1; index < playerCount; index += 1) {
      clients.push(this.room.join(`guest-${index}`, "guest", {
        characterId: heroes[index],
        healingCharges: index,
        powerCharges: 2,
      }));
    }

    const roster = this.room.participants;
    this.players = roster.map(() => ({
      x: 0,
      jumps: 0,
      attacks: 0,
      powers: 0,
      powerCharges: 2,
      health: 100,
    }));
    this.runtimes = clients.map((client) => {
      const ends: ClientRuntime["ends"] = [];
      const departedSlots: number[] = [];
      const rejoinedSlots: number[] = [];
      const expiredSlots: number[] = [];
      const nextLevels: CoopStartMessage[] = [];
      const link = new CoopSceneLink<SimulatedWorldSnapshot>(
        client.sessionInfo(roster),
        client.transport,
      );
      link.bind({
        onRemoteEnd: (reason, slot) => ends.push({ reason, slot }),
        onPeerLeft: () => ends.push({ reason: "left" }),
        onParticipantLeft: (slot) => departedSlots.push(slot),
        onParticipantRejoined: (slot) => rejoinedSlots.push(slot),
        onParticipantReconnectExpired: (slot) => expiredSlots.push(slot),
        onStartNextLevel: (message) => nextLevels.push(message),
      });
      return {
        client,
        link,
        ends,
        departedSlots,
        rejoinedSlots,
        expiredSlots,
        nextLevels,
      };
    });
  }

  get host(): ClientRuntime {
    return this.runtimes[0];
  }

  guest(index = 0): ClientRuntime {
    return this.runtimes[index + 1];
  }

  step(
    timeMs: number,
    inputs: Partial<Record<string, ReturnType<typeof inputFrame>>> = {},
  ): void {
    for (const runtime of this.runtimes.slice(1)) {
      runtime.link.sendLocalInput(timeMs, inputs[runtime.client.id] ?? inputFrame());
    }
    this.room.advanceTo(timeMs);

    this.applyFrame(0, inputs.host ?? inputFrame());
    for (const runtime of this.runtimes.slice(1)) {
      this.applyFrame(
        runtime.client.slot,
        this.host.link.consumeRemoteInputFrame(runtime.client.slot),
      );
    }

    this.host.link.maybeSendSnapshot(timeMs, (seq) => this.snapshot(seq));
    this.room.advanceTo(timeMs);
  }

  finish(reason: "won" | "lost"): void {
    this.won = reason === "won";
    this.lost = reason === "lost";
    expect(this.host.link.finish(reason)).toBe(true);
    this.room.flush();
  }

  changeLevel(levelId: string): CoopStartMessage {
    this.levelId = levelId;
    const message = this.room.start(levelId);
    this.room.flush();
    return message;
  }

  private applyFrame(slot: number, frame: ReturnType<typeof inputFrame>): void {
    const player = this.players[slot];
    if (!player) return;
    if (frame.left) player.x -= 1;
    if (frame.right) player.x += 1;
    if (frame.jumpJustPressed) player.jumps += 1;
    if (frame.meleeJustPressed) player.attacks += 1;
    if (frame.powerJustPressed && player.powerCharges > 0) {
      player.powerCharges -= 1;
      player.powers += 1;
    }
  }

  private snapshot(seq: number): SimulatedWorldSnapshot {
    return {
      seq,
      levelId: this.levelId,
      players: structuredClone(this.players),
      enemies: [[1, 320, 180]],
      won: this.won,
      lost: this.lost,
    };
  }
}

function eventRate(metrics: TrafficSnapshot, event: string, durationSeconds: number): number {
  return (metrics.byEvent[event]?.publications ?? 0) / durationSeconds;
}

describe.each([2, 3, 4] as const)("co-op simulado con %i clientes", (playerCount) => {
  it("entra a la sala y recibe un roster inicial determinista", () => {
    const game = new SimulatedCoopGame(playerCount);
    const starts: CoopStartMessage[][] = game.runtimes.map(() => []);
    game.runtimes.forEach((runtime, index) => {
      runtime.client.transport.onStart((message) => starts[index].push(message));
    });

    const start = game.room.start("level-1");
    game.room.flush();

    expect(game.room.participantCount).toBe(playerCount);
    expect(game.room.participants.map((participant) => participant.slot)).toEqual(
      Array.from({ length: playerCount }, (_, slot) => slot),
    );
    expect(start.roster).toHaveLength(playerCount);
    expect(starts[0]).toEqual([]);
    for (const received of starts.slice(1)) expect(received).toEqual([start]);
  });

  it("sincroniza movimiento, salto, ataque y poder desde cada guest", () => {
    const game = new SimulatedCoopGame(playerCount);
    const guestInputs = Object.fromEntries(
      game.runtimes.slice(1).map((runtime) => [
        runtime.client.id,
        inputFrame({
          right: true,
          jumpJustPressed: true,
          meleeJustPressed: true,
          powerJustPressed: true,
        }),
      ]),
    );

    game.step(50, {
      host: inputFrame({ left: true, meleeJustPressed: true }),
      ...guestInputs,
    });

    expect(game.players[0]).toMatchObject({ x: -1, attacks: 1 });
    for (let slot = 1; slot < playerCount; slot += 1) {
      expect(game.players[slot]).toMatchObject({
        x: 1,
        jumps: 1,
        attacks: 1,
        powers: 1,
        powerCharges: 1,
      });
    }
    for (const runtime of game.runtimes.slice(1)) {
      expect(runtime.link.latestSnapshot?.players).toEqual(game.players);
    }
  });
});

describe("ciclo de partida multicliente", () => {
  it("usa jitter determinista no nulo por defecto en el harness", () => {
    expect(new SimulatedRoom().defaultJitterMs).toBeGreaterThan(0);
  });

  it("rechaza versiones incompatibles y un quinto cliente", () => {
    const room = new SimulatedRoom("TEST", 0);
    room.join("host", "host", { characterId: "ruder" });
    expect(() => room.join("legacy", "guest", {
      characterId: "amy",
      protocol: 7,
    })).toThrow("Las versiones del juego no coinciden.");

    room.join("guest-1", "guest", { characterId: "amy" });
    room.join("guest-2", "guest", { characterId: "sarix" });
    room.join("guest-3", "guest", { characterId: "dunel" });
    expect(() => room.join("guest-4", "guest", { characterId: "faust" })).toThrow(
      "La sala esta llena.",
    );
  });

  it("propaga victoria y derrota exactamente una vez", () => {
    const victory = new SimulatedCoopGame(4);
    victory.finish("won");
    for (const guest of victory.runtimes.slice(1)) {
      expect(guest.ends).toEqual([{ reason: "won", slot: 0 }]);
    }
    expect(victory.host.ends).toEqual([]);
    expect(victory.host.link.finish("lost")).toBe(false);

    const defeat = new SimulatedCoopGame(3);
    defeat.finish("lost");
    for (const guest of defeat.runtimes.slice(1)) {
      expect(guest.ends).toEqual([{ reason: "lost", slot: 0 }]);
    }
  });

  it("notifica la salida de un guest y mantiene a los demas en la sala", () => {
    const game = new SimulatedCoopGame(4);
    const leaving = game.guest(1);
    const leavingSlot = leaving.client.slot;

    game.room.leave(leaving.client.id);
    game.room.flush();

    expect(game.room.participantCount).toBe(3);
    expect(game.host.departedSlots).toEqual([leavingSlot]);
    expect(game.guest(0).departedSlots).toEqual([leavingSlot]);
    expect(game.guest(2).departedSlots).toEqual([leavingSlot]);
    expect(leaving.departedSlots).toEqual([]);
  });

  it("encadena un cambio de nivel desde el host hacia todos los guests", () => {
    const game = new SimulatedCoopGame(4);
    const message = game.changeLevel("level-2");

    expect(message.levelId).toBe("level-2");
    for (const guest of game.runtimes.slice(1)) {
      expect(guest.nextLevels).toEqual([message]);
    }
    expect(game.host.nextLevels).toEqual([]);
  });

  it("no ejecuta poderes sin cargas y permite reintentar el mismo nivel", () => {
    const game = new SimulatedCoopGame(4);
    game.players[1].powerCharges = 0;
    game.step(50, {
      "guest-1": inputFrame({ powerJustPressed: true }),
      "guest-2": inputFrame({ meleeJustPressed: true, powerJustPressed: true }),
      "guest-3": inputFrame({ meleeJustPressed: true, powerJustPressed: true }),
    });
    expect(game.players[1]).toMatchObject({ powers: 0, powerCharges: 0 });
    expect(game.players[2]).toMatchObject({ attacks: 1, powers: 1, powerCharges: 1 });
    expect(game.players[3]).toMatchObject({ attacks: 1, powers: 1, powerCharges: 1 });

    const retry = game.changeLevel("level-1");
    for (const guest of game.runtimes.slice(1)) expect(guest.nextLevels).toEqual([retry]);
  });

  it("completa ciclo de cuatro con nivel encadenado, reconexion y salida", () => {
    const game = new SimulatedCoopGame(4);
    const next = game.changeLevel("level-2");
    for (const guest of game.runtimes.slice(1)) expect(guest.nextLevels[0]).toEqual(next);

    const reconnecting = game.guest(1);
    const reconnectingSlot = reconnecting.client.slot;
    game.room.disconnect(reconnecting.client.id);
    game.room.flush();
    game.room.reconnect(reconnecting.client.id);
    game.room.flush();
    expect(reconnecting.client.slot).toBe(reconnectingSlot);
    expect(game.host.rejoinedSlots).toContain(reconnectingSlot);

    const leaving = game.guest(2);
    const leavingSlot = leaving.client.slot;
    game.room.leave(leaving.client.id);
    game.room.flush();
    expect(game.room.participantCount).toBe(3);
    expect(game.host.departedSlots).toContain(leavingSlot);
  });
});

describe("reconexion automatica con host estable", () => {
  it("reserva el slot y restaura estado con un snapshot completo", () => {
    const game = new SimulatedCoopGame(4);
    const reconnecting = game.guest(0);
    const originalSlot = reconnecting.client.slot;

    game.step(50, {
      "guest-1": inputFrame({ right: true, meleeJustPressed: true, powerJustPressed: true }),
    });
    expect(game.players[originalSlot]).toMatchObject({ x: 1, attacks: 1, powers: 1 });
    expect(reconnecting.link.latestSnapshot?.seq).toBe(1);

    game.room.disconnect(reconnecting.client.id);
    game.room.flush();
    expect(game.host.departedSlots).toEqual([originalSlot]);
    expect(() => game.room.join("intruder", "guest", { characterId: "faust" })).toThrow(
      "La sala esta llena.",
    );

    game.step(100, { host: inputFrame({ right: true }) });
    expect(reconnecting.link.latestSnapshot?.seq).toBe(1);

    game.room.reconnect(reconnecting.client.id);
    game.room.flush();
    expect(reconnecting.client.slot).toBe(originalSlot);
    expect(game.host.rejoinedSlots).toEqual([originalSlot]);

    game.step(150, { "guest-1": inputFrame({ right: true }) });
    expect(reconnecting.link.latestSnapshot?.seq).toBe(3);
    expect(reconnecting.link.latestSnapshot?.players).toEqual(game.players);
    const snapshots = game.room.publishedPayloads("snapshot") as SimulatedWorldSnapshot[];
    expect(snapshots.at(-1)?.enemies).toEqual([[1, 320, 180]]);
  });

  it("rechaza una reconexion incompatible y aplica la salida al vencer la reserva", () => {
    const game = new SimulatedCoopGame(3);
    const reconnecting = game.guest(0);
    const slot = reconnecting.client.slot;

    game.room.disconnect(reconnecting.client.id);
    game.room.flush();
    expect(() => game.room.reconnect(reconnecting.client.id, 9)).toThrow(
      "Las versiones del juego no coinciden.",
    );
    expect(game.host.rejoinedSlots).toEqual([]);

    game.room.expireReconnect(reconnecting.client.id);
    game.room.flush();
    expect(game.host.expiredSlots).toEqual([slot]);
    expect(game.room.participantCount).toBe(2);
  });

  it("repite el resultado si la partida termina durante la desconexion", () => {
    const game = new SimulatedCoopGame(2);
    const reconnecting = game.guest();

    game.room.disconnect(reconnecting.client.id);
    game.room.flush();
    game.finish("won");
    expect(reconnecting.ends).toEqual([]);

    game.room.reconnect(reconnecting.client.id);
    game.room.flush();
    expect(reconnecting.ends).toEqual([{ reason: "won", slot: 0 }]);
  });
});

describe("condiciones adversas de red", () => {
  it("tolera jitter diferente mientras tres guests envian a la vez", () => {
    const game = new SimulatedCoopGame(4);
    game.room.delayNext("input", 45);
    game.room.delayNext("input", 10);
    game.room.delayNext("input", 70);
    game.runtimes.slice(1).forEach((runtime) => {
      runtime.link.sendLocalInput(50, inputFrame({ right: true, meleeJustPressed: true }));
    });

    game.room.advanceTo(30);
    expect(game.host.link.consumeRemoteInputFrame(2).right).toBe(true);
    expect(game.host.link.consumeRemoteInputFrame(1).right).toBe(false);
    game.room.advanceTo(45);
    expect(game.host.link.consumeRemoteInputFrame(1).meleeJustPressed).toBe(true);
    game.room.advanceTo(70);
    expect(game.host.link.consumeRemoteInputFrame(3).meleeJustPressed).toBe(true);
  });
  it("descarta snapshots retrasados que llegan despues de uno mas nuevo", () => {
    const game = new SimulatedCoopGame(2);
    game.room.delayNext("snapshot", 100);
    game.step(50, { host: inputFrame({ right: true }) });
    game.step(100, { host: inputFrame({ right: true }) });

    expect(game.guest().link.latestSnapshot?.seq).toBe(2);
    expect(game.guest().link.latestSnapshot?.players[0].x).toBe(2);

    game.room.advanceTo(150);
    expect(game.guest().link.latestSnapshot?.seq).toBe(2);
    expect(game.guest().link.latestSnapshot?.players[0].x).toBe(2);
  });

  it("ignora input reordenado y no restaura un estado viejo", () => {
    const game = new SimulatedCoopGame(2);
    game.room.delayNext("input", 100);
    game.guest().link.sendLocalInput(50, inputFrame({ right: true }));
    game.room.advanceTo(50);
    game.guest().link.sendLocalInput(100, inputFrame());
    game.room.advanceTo(100);

    expect(game.host.link.consumeRemoteInputFrame(1).right).toBe(false);
    game.room.advanceTo(150);
    expect(game.host.link.consumeRemoteInputFrame(1).right).toBe(false);
  });

  it("recupera movimiento sostenido perdido mediante el keepalive", () => {
    const game = new SimulatedCoopGame(2);
    game.room.dropNext("input");
    game.guest().link.sendLocalInput(50, inputFrame({ right: true }));
    game.room.advanceTo(50);
    expect(game.host.link.consumeRemoteInputFrame(1).right).toBe(false);

    game.guest().link.sendLocalInput(150, inputFrame({ right: true }));
    game.room.advanceTo(150);
    expect(game.host.link.consumeRemoteInputFrame(1).right).toBe(true);
    expect(game.room.metrics().byEvent.input.droppedDeliveries).toBe(1);
  });

  it("continua con el snapshot siguiente cuando uno se pierde", () => {
    const game = new SimulatedCoopGame(3);
    game.room.dropNext("snapshot", 2);
    game.step(50, { host: inputFrame({ right: true }) });
    expect(game.guest(0).link.latestSnapshot).toBeUndefined();
    expect(game.guest(1).link.latestSnapshot).toBeUndefined();

    game.step(100, { host: inputFrame({ right: true }) });
    expect(game.guest(0).link.latestSnapshot?.seq).toBe(2);
    expect(game.guest(1).link.latestSnapshot?.seq).toBe(2);
  });
});

describe("presupuesto de trafico simulado", () => {
  it("mide publicaciones, fan-out, bytes y frecuencia efectiva con cuatro clientes", () => {
    const game = new SimulatedCoopGame(4);
    const durationMs = 10_000;
    const frameMs = 1000 / 60;

    for (let timeMs = frameMs; timeMs <= durationMs + 0.001; timeMs += frameMs) {
      game.step(timeMs, {
        "guest-1": inputFrame({ right: true }),
        "guest-2": inputFrame({ right: true }),
        "guest-3": inputFrame({ right: true }),
      });
    }

    game.room.flush();
    const metrics = game.room.metrics();
    const durationSeconds = durationMs / 1000;
    const snapshotHz = eventRate(metrics, "snapshot", durationSeconds);
    const inputHzPerGuest = eventRate(metrics, "input", durationSeconds) / 3;
    const report = {
      durationSeconds,
      players: 4,
      snapshotHz,
      inputHzPerGuest,
      publications: metrics.publications,
      deliveries: metrics.deliveries,
      bytesPublished: metrics.bytesPublished,
      bytesDelivered: metrics.bytesDelivered,
      snapshotPublications: metrics.byEvent.snapshot.publications,
      snapshotDeliveries: metrics.byEvent.snapshot.deliveries,
      inputPublications: metrics.byEvent.input.publications,
      billableMessagesLowerBound: metrics.publications + metrics.deliveries,
    };
    console.info("COOP_NETWORK_SIMULATION", JSON.stringify(report));

    // Con frames de 16,67 ms, el throttle de 50 ms pierde ocasionalmente un
    // tick por redondeo y la frecuencia efectiva queda hoy cerca de 17,7 Hz.
    expect(snapshotHz).toBeGreaterThanOrEqual(17);
    expect(snapshotHz).toBeLessThanOrEqual(20);
    expect(inputHzPerGuest).toBeGreaterThanOrEqual(9);
    expect(inputHzPerGuest).toBeLessThanOrEqual(10.5);
    expect(metrics.byEvent.snapshot.deliveries).toBe(
      metrics.byEvent.snapshot.publications * 3,
    );
    expect(metrics.bytesPublished).toBeGreaterThan(0);
    expect(metrics.bytesDelivered).toBeGreaterThan(metrics.bytesPublished);
  });
});
