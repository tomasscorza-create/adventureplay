import { describe, expect, it } from "vitest";
import { emptyGameplayInputState } from "../../../shared/types/input";
import { COOP_PREDICTION_MAX_HISTORY, CoopLocalPrediction } from "./CoopLocalPrediction";

describe("CoopLocalPrediction", () => {
  it("elimina solamente comandos de red confirmados por el host", () => {
    const history = new CoopLocalPrediction();
    history.record({ seq: 1, state: { ...emptyGameplayInputState, right: true } });
    history.record({ seq: 2, state: { ...emptyGameplayInputState, jump: true } });
    expect(history.acknowledge(1)).toBe(1);
    expect(history.pendingCount).toBe(1);
    expect(history.latestPendingFrame().jump).toBe(true);
  });

  it("no reproduce flancos de acciones ya mostradas localmente", () => {
    const history = new CoopLocalPrediction();
    history.record({ seq: 4, state: { ...emptyGameplayInputState, melee: true, power: true } });
    const replay = history.latestPendingFrame();
    expect(replay.melee).toBe(true);
    expect(replay.power).toBe(true);
    expect(replay.meleeJustPressed).toBe(false);
    expect(replay.powerJustPressed).toBe(false);
  });

  it("deduplica, limita y limpia el historial", () => {
    const history = new CoopLocalPrediction();
    for (let seq = 1; seq <= 200; seq += 1) {
      history.record({ seq, state: emptyGameplayInputState });
      history.record({ seq, state: emptyGameplayInputState });
    }
    expect(history.pendingCount).toBe(COOP_PREDICTION_MAX_HISTORY);
    history.reset();
    expect(history.pendingCount).toBe(0);
  });

  it("solo solicita reset autoritativo ante una divergencia grande", () => {
    const history = new CoopLocalPrediction();
    expect(history.needsAuthoritativeReset({ x: 0, y: 0 }, { x: 40, y: 20 })).toBe(false);
    expect(history.needsAuthoritativeReset({ x: 0, y: 0 }, { x: 120, y: 0 })).toBe(true);
  });
});
