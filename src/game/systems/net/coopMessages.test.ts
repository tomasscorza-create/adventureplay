import { describe, expect, it } from "vitest";
import { emptyGameplayInputState, type GameplayInputState } from "../../../shared/types/input";
import {
  collectPeerPresences,
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
    expect(COOP_PROTOCOL_VERSION).toBe(3);
  });

  it("excluye la propia key y normaliza los payloads de los peers", () => {
    const state = {
      "self-key": [{ role: "host", characterId: "ruder", protocol: 2 }],
      "peer-key": [{ role: "guest", characterId: "amy", protocol: 2 }],
    };
    const peers = collectPeerPresences(state, "self-key");
    expect(peers).toEqual([
      { key: "peer-key", role: "guest", characterId: "amy", protocol: 2 },
    ]);
  });

  it("asume protocolo 1 para clientes previos y descarta payloads sin rol valido", () => {
    const state = {
      guest: [{ role: "guest", characterId: "sarix" }],
      intruso: [{ characterId: "faust" }],
      raro: [{ role: "espectador", characterId: "dunel", protocol: 2 }],
    };
    const peers = collectPeerPresences(state, "self-key");
    expect(peers).toEqual([
      { key: "guest", role: "guest", characterId: "sarix", protocol: 1 },
    ]);
  });
});
