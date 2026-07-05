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
    expect(settings.controlOpacityPercent).toBe(60);
    expect(settings.movementInset).toBe(40);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("provides increasingly lighter render profiles", () => {
    expect(getMobileRenderScale("quality")).toBeGreaterThan(getMobileRenderScale("balanced"));
    expect(getMobileRenderScale("balanced")).toBeGreaterThan(getMobileRenderScale("performance"));
  });

  it("keeps the customization of both mobile commands independent", () => {
    mobileGameplaySettingsStore.update({
      controlScheme: "command-1",
      controlScalePercent: 112,
      movementInset: 31,
      leftHanded: true,
      actionWheelRotationDegrees: -18,
    });
    mobileGameplaySettingsStore.update({
      controlScheme: "command-2",
      controlScalePercent: 91,
      movementInset: 7,
      leftHanded: false,
      actionWheelRotationDegrees: 24,
      preferredRadialAction: "power",
    });

    expect(mobileGameplaySettingsStore.getSettings()).toMatchObject({
      controlScheme: "command-2",
      controlScalePercent: 91,
      movementInset: 7,
      leftHanded: false,
      actionWheelRotationDegrees: 24,
      preferredRadialAction: "power",
    });

    expect(mobileGameplaySettingsStore.update({ controlScheme: "command-1" })).toMatchObject({
      controlScalePercent: 112,
      movementInset: 31,
      leftHanded: true,
      actionWheelRotationDegrees: -18,
    });
  });

  it("restores the more visible recommended profile for each command", () => {
    mobileGameplaySettingsStore.update({
      controlScheme: "command-2",
      controlOpacityPercent: 61,
      controlScalePercent: 85,
      actionWheelRotationDegrees: 30,
    });

    expect(mobileGameplaySettingsStore.resetControlProfile()).toMatchObject({
      controlScheme: "command-2",
      controlOpacityPercent: 94,
      controlScalePercent: 106,
      movementInset: 24,
      actionsInset: 14,
      actionWheelRotationDegrees: 0,
      preferredRadialAction: "spin",
    });
  });
});
