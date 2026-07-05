import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMobileRenderScale,
  mobileGameplaySettingsStore,
} from "./MobileGameplaySettings";

describe("MobileGameplaySettings", () => {
  afterEach(() => mobileGameplaySettingsStore.reset());

  it("clamps visual controls and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = mobileGameplaySettingsStore.onChange(listener);
    const settings = mobileGameplaySettingsStore.update({
      controlScheme: "command-2",
      controlScalePercent: 999,
      controlOpacityPercent: 1,
      movementInset: 40,
    });
    expect(settings.controlScalePercent).toBe(120);
    expect(settings.controlScheme).toBe("command-2");
    expect(settings.controlOpacityPercent).toBe(45);
    expect(settings.movementInset).toBe(40);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("provides increasingly lighter render profiles", () => {
    expect(getMobileRenderScale("quality")).toBeGreaterThan(getMobileRenderScale("balanced"));
    expect(getMobileRenderScale("balanced")).toBeGreaterThan(getMobileRenderScale("performance"));
  });
});
