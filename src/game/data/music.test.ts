import { describe, expect, it } from "vitest";
import { getLevelMusicTrack } from "./music";

describe("getLevelMusicTrack", () => {
  it("raises musical intensity with stage progression", () => {
    expect(getLevelMusicTrack(1)).toBe("levels-calm");
    expect(getLevelMusicTrack(3)).toBe("levels-calm");
    expect(getLevelMusicTrack(4)).toBe("levels-rising");
    expect(getLevelMusicTrack(6)).toBe("levels-rising");
    expect(getLevelMusicTrack(7)).toBe("levels-intense");
    expect(getLevelMusicTrack(10)).toBe("levels-intense");
  });
});
