import { describe, expect, it } from "vitest";
import { averageOpaqueColor, derivePuzzleVisualPalette } from "./PuzzleVisualPalette";

describe("puzzle visual palette", () => {
  it("derives a warm complementary edge from a blue background", () => {
    const palette = derivePuzzleVisualPalette(0x203f62);
    const red = (palette.topEdge >> 16) & 0xff;
    const blue = palette.topEdge & 0xff;

    expect(red).toBeGreaterThan(blue);
    expect(palette.body).not.toBe(palette.background);
    expect(palette.lowerFace).not.toBe(palette.body);
  });

  it("switches to a dark silhouette over a light background", () => {
    const palette = derivePuzzleVisualPalette(0xd8c89b);
    const bodyChannels = [(palette.body >> 16) & 0xff, (palette.body >> 8) & 0xff, palette.body & 0xff];

    expect(Math.max(...bodyChannels)).toBeLessThan(100);
  });

  it("ignores transparent pixels while sampling a background", () => {
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 0,
      20, 40, 60, 255,
    ]);

    expect(averageOpaqueColor(pixels)).toBe(0x14283c);
  });
});
