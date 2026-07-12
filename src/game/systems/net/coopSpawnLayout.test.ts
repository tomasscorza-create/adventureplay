import { describe, expect, it } from "vitest";
import { getCoopSpawnX } from "./coopSpawnLayout";

describe("getCoopSpawnX", () => {
  it("centra una formacion de cuatro con separacion estable", () => {
    const xs = Array.from({ length: 4 }, (_, slot) => getCoopSpawnX(500, slot, 4, 40, 1240));
    expect(xs).toEqual([395, 465, 535, 605]);
  });

  it("mantiene dentro del mundo formaciones cercanas a los bordes", () => {
    for (const startX of [10, 1270]) {
      const xs = Array.from({ length: 8 }, (_, slot) => getCoopSpawnX(startX, slot, 8, 40, 1240));
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(40);
      expect(Math.max(...xs)).toBeLessThanOrEqual(1240);
      expect(new Set(xs).size).toBe(8);
    }
  });
});
