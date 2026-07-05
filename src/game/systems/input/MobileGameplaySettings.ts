export type MobilePerformanceMode = "quality" | "balanced" | "performance";
export type MobileControlScheme = "command-1" | "command-2";
export type MobileHapticStrength = "soft" | "balanced" | "strong";
export type PreferredRadialAction = "spin" | "heal" | "power";

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
  actionWheelRotationDegrees: number;
  preferredRadialAction: PreferredRadialAction;
}

export interface MobileGameplaySettings extends MobileControlProfile {
  controlScheme: MobileControlScheme;
  hapticsEnabled: boolean;
  hapticStrength: MobileHapticStrength;
  performanceMode: MobilePerformanceMode;
}

interface StoredMobileGameplaySettings {
  controlScheme: MobileControlScheme;
  controlProfiles: Record<MobileControlScheme, MobileControlProfile>;
  hapticsEnabled: boolean;
  hapticStrength: MobileHapticStrength;
  performanceMode: MobilePerformanceMode;
}

const STORAGE_KEY = "adventurePlayMobileGameplaySettings";
const legacyDefaultControlProfile = {
  controlScalePercent: 100,
  controlGap: 10,
  controlOpacityPercent: 82,
  movementInset: 18,
  actionsInset: 0,
} as const;
const defaultControlProfiles: Record<MobileControlScheme, MobileControlProfile> = {
  "command-1": {
    controlScalePercent: 108,
    controlGap: 14,
    controlOpacityPercent: 92,
    movementInset: 24,
    actionsInset: 12,
    leftHanded: false,
    actionWheelRotationDegrees: 0,
    preferredRadialAction: "spin",
  },
  "command-2": {
    controlScalePercent: 106,
    controlGap: 10,
    controlOpacityPercent: 94,
    movementInset: 24,
    actionsInset: 14,
    leftHanded: false,
    actionWheelRotationDegrees: 0,
    preferredRadialAction: "spin",
  },
};
const defaultSettings: StoredMobileGameplaySettings = {
  controlScheme: "command-1",
  controlProfiles: {
    "command-1": { ...defaultControlProfiles["command-1"] },
    "command-2": { ...defaultControlProfiles["command-2"] },
  },
  hapticsEnabled: true,
  hapticStrength: "balanced",
  performanceMode: "balanced",
};

const controlProfileKeys = [
  "controlScalePercent",
  "controlGap",
  "controlOpacityPercent",
  "movementInset",
  "actionsInset",
  "leftHanded",
  "actionWheelRotationDegrees",
  "preferredRadialAction",
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
      hapticStrength: this.settings.hapticStrength,
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
      hapticStrength: patch.hapticStrength ?? this.settings.hapticStrength,
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
        [scheme]: { ...defaultControlProfiles[scheme] },
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
  const command1 = hasSeparateProfiles
    ? normalizeControlProfile(value.controlProfiles?.["command-1"], "command-1")
    : normalizeControlProfile(value, "command-1");
  const command2 = hasSeparateProfiles
    ? normalizeControlProfile(value.controlProfiles?.["command-2"], "command-2")
    : normalizeControlProfile(value, "command-2");

  return {
    controlScheme,
    controlProfiles: {
      "command-1": { ...command1 },
      "command-2": { ...command2 },
    },
    hapticsEnabled: typeof value.hapticsEnabled === "boolean"
      ? value.hapticsEnabled
      : defaultSettings.hapticsEnabled,
    hapticStrength: value.hapticStrength === "soft"
      || value.hapticStrength === "balanced"
      || value.hapticStrength === "strong"
      ? value.hapticStrength
      : defaultSettings.hapticStrength,
    performanceMode: value.performanceMode === "quality"
      || value.performanceMode === "balanced"
      || value.performanceMode === "performance"
      ? value.performanceMode
      : defaultSettings.performanceMode,
  };
}

function normalizeControlProfile(raw: unknown, scheme: MobileControlScheme): MobileControlProfile {
  const value = raw && typeof raw === "object"
    ? raw as Partial<MobileControlProfile>
    : {};
  const recommended = defaultControlProfiles[scheme];
  const legacyProfile = value.actionWheelRotationDegrees === undefined
    && value.preferredRadialAction === undefined;
  const migrateLegacyDefault = (key: keyof typeof legacyDefaultControlProfile) => (
    legacyProfile && value[key] === legacyDefaultControlProfile[key]
      ? recommended[key]
      : value[key]
  );
  return {
    controlScalePercent: clampNumber(migrateLegacyDefault("controlScalePercent"), 85, 120, recommended.controlScalePercent),
    controlGap: clampNumber(migrateLegacyDefault("controlGap"), 6, 22, recommended.controlGap),
    controlOpacityPercent: clampNumber(migrateLegacyDefault("controlOpacityPercent"), 60, 100, recommended.controlOpacityPercent),
    movementInset: clampNumber(migrateLegacyDefault("movementInset"), 0, 72, recommended.movementInset),
    actionsInset: clampNumber(migrateLegacyDefault("actionsInset"), 0, 72, recommended.actionsInset),
    leftHanded: typeof value.leftHanded === "boolean" ? value.leftHanded : recommended.leftHanded,
    actionWheelRotationDegrees: clampNumber(value.actionWheelRotationDegrees, -30, 30, recommended.actionWheelRotationDegrees),
    preferredRadialAction: value.preferredRadialAction === "heal" || value.preferredRadialAction === "power"
      ? value.preferredRadialAction
      : recommended.preferredRadialAction,
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
