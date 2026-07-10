import { describe, expect, it } from "vitest";
import { emptyGameplayInputState, type GameplayInputState } from "../../../shared/types/input";
import {
  assignSlots,
  collectPeerPresences,
  COOP_MAX_PLAYERS,
  COOP_PROTOCOL_VERSION,
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
  packInputState,
  ROOM_CODE_LENGTH,
  unpackInputState,
} from "./coopMessages";

describe("coopMessages input bits", () => {
  it("preserva cada accion en un viaje pack/unpack", () => {
    const actions = Object.keys(emptyGameplayInputState) as Array<keyof GameplayInputState>;
    for (const action of actions) {
      const state: GameplayInputState = { ...emptyGameplayInputState, [action]: true };
      const decoded = unpackInputState(packInputState(state));
      expect(decoded).toEqual(state);
    }
  });

  it("preserva combinaciones arbitrarias", () => {
    const state: GameplayInputState = {
      ...emptyGameplayInputState,
      left: true,
      jump: true,
      power: true,
    };
    expect(unpackInputState(packInputState(state))).toEqual(state);
  });

  // Congela el formato de red: cambiar el orden de los bits rompe la
  // compatibilidad entre clientes y exige subir COOP_PROTOCOL_VERSION.
  it("mantiene estable la posicion de cada bit del protocolo", () => {
    const expectedBits: Array<[keyof GameplayInputState, number]> = [
      ["left", 1],
      ["right", 2],
      ["jump", 4],
      ["melee", 8],
      ["spin", 16],
      ["heal", 32],
      ["power", 64],
      ["pause", 128],
    ];
    for (const [action, bit] of expectedBits) {
      expect(packInputState({ ...emptyGameplayInputState, [action]: true })).toBe(bit);
    }
  });
});

describe("coopMessages room codes", () => {
  it("genera codigos validos de la longitud esperada", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateRoomCode();
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      expect(isValidRoomCode(code)).toBe(true);
    }
  });

  it("normaliza minusculas, caracteres invalidos y longitud extra", () => {
    expect(normalizeRoomCode("ab-cd")).toBe("ABCD");
    expect(normalizeRoomCode("  wxyz  ")).toBe("WXYZ");
    // 0, 1, I y O no pertenecen al alfabeto para evitar confusiones visuales.
    expect(normalizeRoomCode("A0I1O")).toBe("A");
    expect(normalizeRoomCode("ABCDEFG")).toBe("ABCD");
  });
});

describe("coopMessages presence", () => {
  it("expone la version vigente del protocolo", () => {
    expect(COOP_PROTOCOL_VERSION).toBe(8);
  });

  it("excluye la propia key y normaliza los payloads de los peers", () => {
    const state = {
      "self-key": [{ role: "host", characterId: "ruder", protocol: 2 }],
      "peer-key": [
        { role: "guest", characterId: "amy", protocol: 2, healingCharges: 3, powerCharges: 12 },
      ],
    };
    const peers = collectPeerPresences(state, "self-key");
    expect(peers).toEqual([
      {
        key: "peer-key",
        role: "guest",
        characterId: "amy",
        protocol: 2,
        healingCharges: 3,
        powerCharges: 12,
      },
    ]);
  });

  it("asume protocolo 1 y cargas 0 para payloads incompletos, y descarta roles invalidos", () => {
    const state = {
      guest: [{ role: "guest", characterId: "sarix" }],
      intruso: [{ characterId: "faust" }],
      raro: [{ role: "espectador", characterId: "dunel", protocol: 2 }],
    };
    const peers = collectPeerPresences(state, "self-key");
    expect(peers).toEqual([
      {
        key: "guest",
        role: "guest",
        characterId: "sarix",
        protocol: 1,
        healingCharges: 0,
        powerCharges: 0,
      },
    ]);
  });
});

describe("coopMessages slots", () => {
  it("da al host el slot 0 y a los guests 1..N ordenados por clientId", () => {
    const roster = assignSlots([
      { key: "zeta", role: "guest", characterId: "amy" },
      { key: "host-key", role: "host", characterId: "ruder" },
      { key: "alpha", role: "guest", characterId: "sarix" },
    ]);
    expect(roster).toEqual([
      { key: "host-key", role: "host", characterId: "ruder", slot: 0 },
      { key: "alpha", role: "guest", characterId: "sarix", slot: 1 },
      { key: "zeta", role: "guest", characterId: "amy", slot: 2 },
    ]);
  });

  it("preserva las cargas de curacion y poder en el roster final", () => {
    const roster = assignSlots([
      { key: "host", role: "host", characterId: "ruder", healingCharges: 5, powerCharges: 2 },
      { key: "g1", role: "guest", characterId: "amy", healingCharges: 1, powerCharges: 9 },
    ]);
    expect(roster[0].healingCharges).toBe(5);
    expect(roster[0].powerCharges).toBe(2);
    expect(roster[1].healingCharges).toBe(1);
    expect(roster[1].powerCharges).toBe(9);
  });

  it("es determinista sin importar el orden de entrada", () => {
    const entries = [
      { key: "c", role: "guest" as const, characterId: "amy" },
      { key: "a", role: "host" as const, characterId: "ruder" },
      { key: "b", role: "guest" as const, characterId: "sarix" },
    ];
    const forward = assignSlots(entries);
    const reversed = assignSlots([...entries].reverse());
    expect(reversed).toEqual(forward);
  });

  it("tolera una sala sin host todavia (solo guests)", () => {
    const roster = assignSlots([
      { key: "b", role: "guest", characterId: "amy" },
      { key: "a", role: "guest", characterId: "sarix" },
    ]);
    expect(roster.map((entry) => entry.slot)).toEqual([1, 2]);
    expect(roster[0].key).toBe("a");
  });

  it("asigna slots contiguos a una sala completa (host + 3 guests)", () => {
    const roster = assignSlots([
      { key: "host", role: "host", characterId: "ruder" },
      { key: "g3", role: "guest", characterId: "amy" },
      { key: "g1", role: "guest", characterId: "sarix" },
      { key: "g2", role: "guest", characterId: "dunel" },
    ]);
    expect(roster.map((entry) => entry.slot)).toEqual([0, 1, 2, 3]);
    // Un quinto jugador caeria en el slot 4, fuera de COOP_MAX_PLAYERS = 4:
    // la sesion lo rechaza como "sala llena".
    expect(roster.every((entry) => entry.slot < COOP_MAX_PLAYERS)).toBe(true);
  });

  it("COOP_MAX_PLAYERS admite hasta 4 jugadores", () => {
    expect(COOP_MAX_PLAYERS).toBe(4);
  });
});
