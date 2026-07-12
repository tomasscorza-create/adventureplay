import { describe, expect, it } from "vitest";
import {
  COOP_PROTOCOL_VERSION,
  type CoopParticipant,
} from "./coopMessages";
import { CoopSecurityGuard, createWireEnvelope } from "./coopSecurity";

const host: CoopParticipant = {
  key: "host-key",
  role: "host",
  characterId: "ruder",
  slot: 0,
  healingCharges: 3,
  powerCharges: 5,
};
const guest1: CoopParticipant = {
  key: "guest-1-key",
  role: "guest",
  characterId: "amy",
  slot: 1,
  healingCharges: 1,
  powerCharges: 2,
};
const guest2: CoopParticipant = {
  key: "guest-2-key",
  role: "guest",
  characterId: "sarix",
  slot: 2,
  healingCharges: 1,
  powerCharges: 2,
};
const roster = [host, guest1, guest2];

describe("CoopSecurityGuard envelope", () => {
  it("acepta identidad, rol y protocolo vigentes", () => {
    const guard = new CoopSecurityGuard();
    const result = guard.parseEnvelope(
      createWireEnvelope(guest1.key, "guest", { slot: 1, seq: 1, bits: 0 }),
      roster,
      512,
      0,
    );
    expect(result.accepted).toBe(true);
    expect(result.value?.sender).toEqual(guest1);
  });

  it("rechaza protocolo incompatible, remitente desconocido y payload excesivo", () => {
    const guard = new CoopSecurityGuard();
    expect(guard.parseEnvelope({
      protocol: COOP_PROTOCOL_VERSION - 1,
      senderKey: guest1.key,
      senderRole: "guest",
      payload: {},
    }, roster, 512, 0).reason).toBe("incompatible-protocol");
    expect(guard.parseEnvelope(
      createWireEnvelope("intruder", "guest", {}),
      roster,
      512,
      1,
    ).reason).toBe("unknown-sender");
    expect(guard.parseEnvelope(
      createWireEnvelope(guest1.key, "guest", { text: "x".repeat(1024) }),
      roster,
      128,
      2,
    ).reason).toBe("oversized-payload");
  });

  it("rechaza NaN e Infinity antes de entregar el payload", () => {
    const guard = new CoopSecurityGuard();
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = guard.parseEnvelope(
        createWireEnvelope(guest1.key, "guest", { value }),
        roster,
        512,
        0,
      );
      expect(result.reason).toBe("corrupt-payload");
    }
  });
});

describe("CoopSecurityGuard input autoritativo", () => {
  it("impide que un guest use el slot de otro", () => {
    const guard = new CoopSecurityGuard();
    const result = guard.validateInput({ slot: 2, seq: 1, bits: 1 }, guest1, 0);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("slot-spoof");
  });

  it("descarta secuencias duplicadas y antiguas", () => {
    const guard = new CoopSecurityGuard();
    expect(guard.validateInput({ slot: 1, seq: 5, bits: 1 }, guest1, 0).accepted).toBe(true);
    expect(guard.validateInput({ slot: 1, seq: 5, bits: 1 }, guest1, 40).reason)
      .toBe("duplicate-sequence");
    expect(guard.validateInput({ slot: 1, seq: 4, bits: 1 }, guest1, 80).reason)
      .toBe("old-sequence");
  });

  it("acepta desde seq 1 al comenzar una segunda sesion", () => {
    const guard = new CoopSecurityGuard();
    expect(guard.validateInput({ slot: 1, seq: 500, bits: 1 }, guest1, 0).accepted)
      .toBe(true);
    expect(guard.validateInput({ slot: 1, seq: 1, bits: 1 }, guest1, 40).reason)
      .toBe("old-sequence");

    guard.reset();

    expect(guard.validateInput({ slot: 1, seq: 1, bits: 1 }, guest1, 80).accepted)
      .toBe(true);
    expect(guard.metrics().oldSequences).toBe(0);
    expect(guard.metrics().discarded).toBe(0);
  });

  it("tolera jitter normal a treinta mensajes por segundo", () => {
    const guard = new CoopSecurityGuard();
    for (let seq = 1; seq <= 120; seq += 1) {
      const jitter = seq % 3 === 0 ? 4 : seq % 3 === 1 ? -3 : 0;
      const result = guard.validateInput(
        { slot: 1, seq, bits: seq % 2 },
        guest1,
        seq * 34 + jitter,
      );
      expect(result.accepted).toBe(true);
    }
  });

  it("limita spam sostenido y solo recomienda bloqueo tras repeticion", () => {
    const guard = new CoopSecurityGuard();
    let firstLimitedDisconnect = false;
    let sawFirstLimited = false;
    let finalDisconnect = false;
    for (let seq = 1; seq <= 100; seq += 1) {
      const result = guard.validateInput({ slot: 1, seq, bits: 1 }, guest1, seq);
      if (result.reason === "input-rate-limit" && !sawFirstLimited) {
        sawFirstLimited = true;
        firstLimitedDisconnect = result.disconnectRecommended;
      }
      finalDisconnect ||= result.disconnectRecommended;
    }
    expect(guard.metrics().rateLimited).toBeGreaterThan(0);
    expect(firstLimitedDisconnect).toBe(false);
    expect(finalDisconnect).toBe(true);
  });

  it("rechaza bits, secuencias y slots corruptos", () => {
    const guard = new CoopSecurityGuard();
    for (const payload of [
      { slot: -1, seq: 1, bits: 0 },
      { slot: 1, seq: -2, bits: 0 },
      { slot: 1, seq: 1, bits: 256 },
      { slot: 1, seq: 1, bits: Number.NaN },
    ]) {
      expect(guard.validateInput(payload, guest1, 0).reason).toBe("corrupt-payload");
    }
  });
});

describe("CoopSecurityGuard control y cargas", () => {
  it("rechaza incrementos de cargas enviados por el guest", () => {
    const guard = new CoopSecurityGuard();
    const result = guard.validateCharges(
      { slot: 1, healingDelta: 3, powerDelta: 10 },
      guest1,
      0,
    );
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("untrusted-charge-increment");
  });

  it("rechaza cargas negativas, infinitas o para otro slot", () => {
    const guard = new CoopSecurityGuard();
    expect(guard.validateCharges(
      { slot: 1, healingDelta: -1, powerDelta: 0 }, guest1, 0,
    ).reason).toBe("corrupt-payload");
    expect(guard.validateCharges(
      { slot: 1, healingDelta: 0, powerDelta: Infinity }, guest1, 0,
    ).reason).toBe("corrupt-payload");
    expect(guard.validateCharges(
      { slot: 2, healingDelta: 1, powerDelta: 0 }, guest1, 0,
    ).reason).toBe("slot-spoof");
  });

  it("impide que un guest inicie victoria, derrota o cambio de nivel", () => {
    const guard = new CoopSecurityGuard();
    expect(guard.validateEnd({ reason: "won", slot: 1 }, guest1, 0).reason)
      .toBe("unauthorized-transition");
    expect(guard.validateEnd({ reason: "lost", slot: 1 }, guest1, 1).reason)
      .toBe("unauthorized-transition");
    expect(guard.validateStart({ levelId: "level-2", roster: [] }, guest1, 2).reason)
      .toBe("unauthorized-transition");
  });

  it("acepta transiciones y snapshots validos solo desde el host", () => {
    const guard = new CoopSecurityGuard();
    expect(guard.validateStart({ levelId: "level-2", roster: [
      { slot: 0, characterId: "ruder" },
      { slot: 1, characterId: "amy" },
    ] }, host, 0).accepted).toBe(true);
    expect(guard.validateEnd({ reason: "won", slot: 0 }, host, 1).accepted).toBe(true);
    expect(guard.validateSnapshot({ seq: 1, players: [] }, host, 2).accepted).toBe(true);
    expect(guard.validateSnapshot({ seq: 1, players: [] }, guest1, 3).accepted).toBe(false);
  });
});
