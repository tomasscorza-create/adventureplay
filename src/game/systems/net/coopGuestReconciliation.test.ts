import { describe, expect, it } from "vitest";
import {
  computeGuestPositionCorrection,
  isAuthoritativeTeleport,
} from "./coopGuestReconciliation";

describe("computeGuestPositionCorrection", () => {
  it("no corrige deriva dentro del umbral estable", () => {
    expect(computeGuestPositionCorrection({ x: 0, y: 0 }, { x: 32, y: 0 }, 16))
      .toEqual({ x: 0, y: 0, kind: "none", divergencePx: 32, appliedPx: 0 });
  });

  it("converge suavemente sin convertir la correccion en un snap", () => {
    const correction = computeGuestPositionCorrection({ x: 0, y: 0 }, { x: 80, y: 0 }, 16);
    expect(correction.kind).toBe("soft");
    expect(correction.x).toBeGreaterThan(0);
    expect(correction.x).toBeLessThan(80);
    expect(correction.y).toBe(0);
    expect(correction.appliedPx).toBeLessThan(correction.divergencePx);
  });

  it("lleva una deriva sostenida hasta el umbral sin oscilar", () => {
    let local = { x: 0, y: 0 };
    const authoritative = { x: 100, y: 0 };
    let previousDistance = 100;
    for (let frame = 0; frame < 60; frame += 1) {
      const correction = computeGuestPositionCorrection(local, authoritative, 16);
      local = { x: correction.x, y: correction.y };
      expect(correction.divergencePx).toBeLessThanOrEqual(previousDistance);
      previousDistance = correction.divergencePx;
    }
    expect(Math.hypot(authoritative.x - local.x, authoritative.y - local.y))
      .toBeLessThanOrEqual(32);
  });

  it("limita la correccion al reanudar tras un frame largo", () => {
    const correction = computeGuestPositionCorrection({ x: 0, y: 0 }, { x: 100, y: 0 }, 5000);
    expect(correction.kind).toBe("soft");
    expect(correction.x).toBeGreaterThan(0);
    expect(correction.x).toBeLessThan(50);
  });

  it("hace snap sobre divergencia extrema", () => {
    expect(computeGuestPositionCorrection({ x: 0, y: 0 }, { x: 160, y: 20 }, 16))
      .toMatchObject({ x: 160, y: 20, kind: "snap" });
  });

  it("fuerza snap ante respawn aunque la distancia sea menor al umbral extremo", () => {
    expect(computeGuestPositionCorrection({ x: 0, y: 0 }, { x: 70, y: 20 }, 16, true))
      .toMatchObject({ x: 70, y: 20, kind: "snap" });
  });

  it("detecta discontinuidades autoritativas y tolera movimiento normal", () => {
    expect(isAuthoritativeTeleport(undefined, { x: 500, y: 0 })).toBe(false);
    expect(isAuthoritativeTeleport({ x: 0, y: 0 }, { x: 40, y: 0 })).toBe(false);
    expect(isAuthoritativeTeleport({ x: 0, y: 0 }, { x: 96, y: 0 })).toBe(true);
  });
});
