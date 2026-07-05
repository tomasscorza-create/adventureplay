export type MobilePerformanceMode = "quality" | "balanced" | "performance";
export type MobileControlScheme = "command-1" | "command-2";

export function getMobileRenderScale(mode: MobilePerformanceMode): number {
  return mode === "quality" ? 0.9 : mode === "performance" ? 0.625 : 0.75;
}

export interface MobileControlProfile {
  controlScalePercent: number;
  controlGap: number;
  controlOpacityPercent: number;
  movementInset: number;
  actionsInset: number;
  leftHanded: boolean;
}

export interface MobileGameplaySettings extends MobileControlProfile {
  controlScheme: MobileControlScheme;
  hapticsEnabled: boolean;
  performanceMode: MobilePerformanceMode;
}

interface StoredMobileGameplaySettings {
  controlScheme: MobileControlScheme;
  controlProfiles: Record<MobileControlScheme, MobileControlProfile>;
  hapticsEnabled: boolean;
  performanceMode: MobilePerformanceMode;
}

const STORAGE_KEY = "adventurePlayMobileGameplaySettings";
const defaultControlProfile: MobileControlProfile = {
  controlScalePercent: 100,
  controlGap: 10,
  controlOpacityPercent: 82,
  movementInset: 18,
  actionsInset: 0,
  leftHanded: false,
};
const defaultSettings: StoredMobileGameplaySettings = {
  controlScheme: "command-1",
  controlProfiles: {
    "command-1": { ...defaultControlProfile },
    "command-2": { ...defaultControlProfile },
  },
  hapticsEnabled: true,
  performanceMode: "balanced",
};

const controlProfileKeys = [
  "controlScalePercent",
  "controlGap",
  "controlOpacityPercent",
  "movementInset",
  "actionsInset",
  "leftHanded",
] as const satisfies readonly (keyof MobileControlProfile)[];

class MobileGameplaySettingsStore {
  private settings = this.load();
  private readonly listeners = new Set<(settings: MobileGameplaySettings) => void>();

  getSettings(): MobileGameplaySettings {
    const profile = this.settings.controlProfiles[this.settings.controlScheme];
    return {
      controlScheme: this.settings.controlScheme,
      ...profile,
      hapticsEnabled: this.settings.hapticsEnabled,
      performanceMode: this.settings.performanceMode,
    };
  }

  update(patch: Partial<MobileGameplaySettings>): MobileGameplaySettings {
    const controlScheme = patch.controlScheme === "command-1" || patch.controlScheme === "command-2"
      ? patch.controlScheme
      : this.settings.controlScheme;
    const currentProfile = this.settings.controlProfiles[controlScheme];
    const profilePatch = Object.fromEntries(
      controlProfileKeys
        .filter((key) => patch[key] !== undefined)
        .map((key) => [key, patch[key]]),
    ) as Partial<MobileControlProfile>;

    this.settings = normalizeStoredSettings({
      controlScheme,
      controlProfiles: {
        ...this.settings.controlProfiles,
        [controlScheme]: { ...currentProfile, ...profilePatch },
      },
      hapticsEnabled: patch.hapticsEnabled ?? this.settings.hapticsEnabled,
      performanceMode: patch.performanceMode ?? this.settings.performanceMode,
    });
    this.persist();
    this.emit();
    return this.getSettings();
  }

  resetControlProfile(scheme = this.settings.controlScheme): MobileGameplaySettings {
    this.settings = {
      ...this.settings,
      controlProfiles: {
        ...this.settings.controlProfiles,
        [scheme]: { ...defaultControlProfile },
      },
    };
    this.persist();
    this.emit();
    return this.getSettings();
  }

  reset(): void {
    this.settings = cloneDefaultSettings();
    this.persist();
    this.emit();
  }

  onChange(listener: (settings: MobileGameplaySettings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private load(): StoredMobileGameplaySettings {
    if (typeof window === "undefined") {
      return cloneDefaultSettings();
    }
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as unknown;
      return normalizeStoredSettings(parsed);
    } catch {
      return cloneDefaultSettings();
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

function normalizeStoredSettings(raw: unknown): StoredMobileGameplaySettings {
  if (!raw || typeof raw !== "object") {
    return cloneDefaultSettings();
  }

  const value = raw as Partial<StoredMobileGameplaySettings> & Partial<MobileControlProfile>;
  const controlScheme = value.controlScheme === "command-2" ? "command-2" : "command-1";
  const hasSeparateProfiles = value.controlProfiles && typeof value.controlProfiles === "object";
  // Los ajustes antiguos eran compartidos: se copian a ambos perfiles al migrar.
  const legacyProfile = normalizeControlProfile(value);
  const command1 = hasSeparateProfiles
    ? normalizeControlProfile(value.controlProfiles?.["command-1"])
    : legacyProfile;
  const command2 = hasSeparateProfiles
    ? normalizeControlProfile(value.controlProfiles?.["command-2"])
    : legacyProfile;

  return {
    controlScheme,
    controlProfiles: {
      "command-1": { ...command1 },
      "command-2": { ...command2 },
    },
    hapticsEnabled: typeof value.hapticsEnabled === "boolean"
      ? value.hapticsEnabled
      : defaultSettings.hapticsEnabled,
    performanceMode: value.performanceMode === "quality"
      || value.performanceMode === "balanced"
      || value.performanceMode === "performance"
      ? value.performanceMode
      : defaultSettings.performanceMode,
  };
}

function normalizeControlProfile(raw: unknown): MobileControlProfile {
  const value = raw && typeof raw === "object"
    ? raw as Partial<MobileControlProfile>
    : {};
  return {
    controlScalePercent: clampNumber(value.controlScalePercent, 85, 120, defaultControlProfile.controlScalePercent),
    controlGap: clampNumber(value.controlGap, 6, 22, defaultControlProfile.controlGap),
    controlOpacityPercent: clampNumber(value.controlOpacityPercent, 45, 100, defaultControlProfile.controlOpacityPercent),
    movementInset: clampNumber(value.movementInset, 0, 72, defaultControlProfile.movementInset),
    actionsInset: clampNumber(value.actionsInset, 0, 72, defaultControlProfile.actionsInset),
    leftHanded: typeof value.leftHanded === "boolean" ? value.leftHanded : defaultControlProfile.leftHanded,
  };
}

function cloneDefaultSettings(): StoredMobileGameplaySettings {
  return {
    ...defaultSettings,
    controlProfiles: {
      "command-1": { ...defaultSettings.controlProfiles["command-1"] },
      "command-2": { ...defaultSettings.controlProfiles["command-2"] },
    },
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(Math.min(max, Math.max(min, value)))
    : fallback;
}

export const mobileGameplaySettingsStore = new MobileGameplaySettingsStore();
