import { describe, expect, it } from "vitest";
import { MobileActionBuffer } from "./MobileActionBuffer";

describe("MobileActionBuffer", () => {
  it("executes a mobile press when the action becomes available within 120ms", () => {
    const buffer = new MobileActionBuffer();
    buffer.reset(true);
    expect(buffer.shouldExecute("melee", true, 1000, false)).toBe(false);
    expect(buffer.shouldExecute("melee", false, 1119, true)).toBe(true);
  });

  it("expires delayed presses and stays immediate on desktop", () => {
    const buffer = new MobileActionBuffer();
    buffer.reset(true);
    buffer.shouldExecute("spin", true, 1000, false);
    expect(buffer.shouldExecute("spin", false, 1121, true)).toBe(false);
    buffer.reset(false);
    expect(buffer.shouldExecute("spin", true, 2000, true)).toBe(true);
    expect(buffer.shouldExecute("spin", false, 2001, true)).toBe(false);
  });
});
