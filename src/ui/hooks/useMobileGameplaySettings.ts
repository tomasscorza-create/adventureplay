import { useEffect, useState } from "react";
import { mobileGameplaySettingsStore } from "../../game/systems/input/MobileGameplaySettings";

export function useMobileGameplaySettings() {
  const [settings, setSettings] = useState(() => mobileGameplaySettingsStore.getSettings());
  useEffect(() => mobileGameplaySettingsStore.onChange(setSettings), []);
  return settings;
}
