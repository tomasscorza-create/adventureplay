export type MobilePerformanceMode = "quality" | "balanced" | "performance";
export type MobileControlScheme = "command-1" | "command-2";

export function getMobileRenderScale(mode: MobilePerformanceMode): number {
  return mode === "quality" ? 0.9 : mode === "performance" ? 0.625 : 0.75;
}

export interface MobileGameplaySettings {
  controlScheme: MobileControlScheme;
  controlScalePercent: number;
  controlGap: number;
  controlOpacityPercent: number;
  movementInset: number;
  actionsInset: number;
  leftHanded: boolean;
  hapticsEnabled: boolean;
  performanceMode: MobilePerformanceMode;
}

const STORAGE_KEY = "adventurePlayMobileGameplaySettings";
const defaultSettings: MobileGameplaySettings = {
  controlScheme: "command-1",
  controlScalePercent: 100,
  controlGap: 10,
  controlOpacityPercent: 82,
  movementInset: 18,
  actionsInset: 0,
  leftHanded: false,
  hapticsEnabled: true,
  performanceMode: "balanced",
};

class MobileGameplaySettingsStore {
  private settings = this.load();
  private readonly listeners = new Set<(settings: MobileGameplaySettings) => void>();

  getSettings(): MobileGameplaySettings {
    return { ...this.settings };
  }

  update(patch: Partial<MobileGameplaySettings>): MobileGameplaySettings {
    this.settings = normalizeSettings({ ...this.settings, ...patch });
    this.persist();
    this.emit();
    return this.getSettings();
  }

  reset(): void {
    this.settings = { ...defaultSettings };
    this.persist();
    this.emit();
  }

  onChange(listener: (settings: MobileGameplaySettings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private load(): MobileGameplaySettings {
    if (typeof window === "undefined") {
      return { ...defaultSettings };
    }
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as unknown;
      return normalizeSettings(parsed);
    } catch {
      return { ...defaultSettings };
    }
  }

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Conserva los ajustes en memoria si el navegador bloquea localStorage.
    }
  }

  private emit(): void {
    const snapshot = this.getSettings();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

function normalizeSettings(raw: unknown): MobileGameplaySettings {
  if (!raw || typeof raw !== "object") {
    return { ...defaultSettings };
  }
  const value = raw as Partial<MobileGameplaySettings>;
  return {
    controlScheme: value.controlScheme === "command-2" ? "command-2" : defaultSettings.controlScheme,
    controlScalePercent: clampNumber(value.controlScalePercent, 85, 120, defaultSettings.controlScalePercent),
    controlGap: clampNumber(value.controlGap, 6, 22, defaultSettings.controlGap),
    controlOpacityPercent: clampNumber(value.controlOpacityPercent, 45, 100, defaultSettings.controlOpacityPercent),
    movementInset: clampNumber(value.movementInset, 0, 72, defaultSettings.movementInset),
    actionsInset: clampNumber(value.actionsInset, 0, 72, defaultSettings.actionsInset),
    leftHanded: typeof value.leftHanded === "boolean" ? value.leftHanded : defaultSettings.leftHanded,
    hapticsEnabled: typeof value.hapticsEnabled === "boolean" ? value.hapticsEnabled : defaultSettings.hapticsEnabled,
    performanceMode: value.performanceMode === "quality"
      || value.performanceMode === "balanced"
      || value.performanceMode === "performance"
      ? value.performanceMode
      : defaultSettings.performanceMode,
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(Math.min(max, Math.max(min, value)))
    : fallback;
}

export const mobileGameplaySettingsStore = new MobileGameplaySettingsStore();
