import { describe, expect, it } from "vitest";
import { COOP_PREDICTION_MAX_HISTORY, CoopLocalPrediction } from "./CoopLocalPrediction";

describe("CoopLocalPrediction", () => {
  it("confirma solamente paquetes realmente procesados", () => {
    const history = new CoopLocalPrediction();
    history.record({ seq: 1, continuous: { left: false, right: true } });
    history.record({ seq: 2, continuous: { left: false, right: true } });
    history.record({ seq: 3, continuous: { left: false, right: false } });

    expect(history.acknowledge(1)).toBe(1);
    expect(history.pendingSeqs).toEqual([2, 3]);
    expect(history.acknowledge(3)).toBe(2);
    expect(history.pendingSeqs).toEqual([]);
  });

  it("un ACK atrasado o agrupado no recrea acciones de flanco", () => {
    const history = new CoopLocalPrediction();
    history.record({ seq: 5, continuous: { left: true, right: false } });
    history.traceEdge("jump");
    history.traceEdge("melee");
    history.traceEdge("power");

    expect(history.acknowledge(4)).toBe(0);
    expect(history.pendingSeqs).toEqual([5]);
    expect(history.acknowledge(9)).toBe(1);
    expect(history.pendingCount).toBe(0);
  });

  it("deduplica, limita y limpia el historial", () => {
    const history = new CoopLocalPrediction();
    for (let seq = 1; seq <= 200; seq += 1) {
      history.record({ seq, continuous: { left: false, right: true } });
      history.record({ seq, continuous: { left: true, right: false } });
    }
    expect(history.pendingCount).toBe(COOP_PREDICTION_MAX_HISTORY);
    history.reset();
    expect(history.pendingCount).toBe(0);
  });
});
