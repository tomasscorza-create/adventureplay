import { describe, expect, it } from "vitest";
import { uniqueProjectilesByNetId } from "./netVisualIdentity";

describe("CoopProjectilePuppets lifecycle", () => {
  it("conserva una sola identidad visual por netId", () => {
    expect(uniqueProjectilesByNetId([
      [4, 10, 20, 1],
      [4, 12, 20, 1],
      [7, 30, 20, -1],
    ])).toEqual([
      [4, 12, 20, 1],
      [7, 30, 20, -1],
    ]);
  });
});
