import { useState, type ReactElement } from "react";
import { gameMusic } from "../../../shared/music/GameMusic";
import { gameSfx } from "../../../shared/sfx/GameSfx";
import { KeyboardBindingsView } from "../main-menu/KeyboardBindingsView";
import { MenuHeading, SettingToggle, VolumeControl } from "../main-menu/MenuPrimitives";
import { MobileGameplaySettingsView } from "../main-menu/MobileGameplaySettingsView";

const audioEntryIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15.6 4.4v11.2a2.9 2.9 0 1 1-1.8-2.7V7.2L9 8.4v9.2a2.9 2.9 0 1 1-1.8-2.7V6.6l8.4-2.2Z" />
  </svg>
);

const keyboardEntryIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="7" width="18" height="11" rx="2.2" />
    <path d="M6.4 10.4h.2m3.4 0h.2m3.4 0h.2m3.4 0h.2M6.4 14.6h.2m3 0h4.8m3.2 0h.2" />
  </svg>
);

const touchEntryIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.4v4.2m0 8.8v4.2M3.4 12h4.2m8.8 0h4.2" />
    <path d="m12 3.4-1.9 2h3.8Zm0 17.2-1.9-2h3.8ZM3.4 12l2-1.9v3.8Zm17.2 0-2-1.9v3.8Z" />
    <circle cx="12" cy="12" r="2.4" />
  </svg>
);

export function SettingsNavigationEntries({
  showDesktopCommandSettings,
  onOpenAudio,
  onOpenControls,
}: {
  showDesktopCommandSettings: boolean;
  onOpenAudio: () => void;
  onOpenControls: () => void;
}) {
  return (
    <>
      <SettingsEntryButton
        icon={audioEntryIcon}
        title="Sonido y musica"
        description="Volumen, musica y efectos del juego."
        onClick={onOpenAudio}
      />
      <SettingsEntryButton
        icon={showDesktopCommandSettings ? keyboardEntryIcon : touchEntryIcon}
        title={showDesktopCommandSettings ? "Comandos" : "Controles moviles"}
        description={showDesktopCommandSettings
          ? "Personaliza teclas primarias y secundarias."
          : "Tipo de comando, posicion, vibracion y rendimiento."}
        onClick={onOpenControls}
      />
    </>
  );
}

export function AudioSettingsPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="menu-chamber menu-chamber--options menu-chamber--audio">
      <MenuHeading title="Sonido y musica" variant="audio" onBack={onBack} backLabel="Ajustes" />
      <AudioSettingsView />
    </div>
  );
}

export function ControlSettingsPage({
  showDesktopCommandSettings,
  onBack,
}: {
  showDesktopCommandSettings: boolean;
  onBack: () => void;
}) {
  return (
    <div className={showDesktopCommandSettings
      ? "menu-chamber menu-chamber--options menu-chamber--commands"
      : "menu-chamber menu-chamber--mobile-settings"}
    >
      <MenuHeading
        title={showDesktopCommandSettings ? "Comandos" : "Controles moviles"}
        variant="settings"
        onBack={onBack}
        backLabel="Ajustes"
      />
      {showDesktopCommandSettings ? <KeyboardBindingsView /> : <MobileGameplaySettingsView />}
    </div>
  );
}

function AudioSettingsView() {
  const [settings, setSettings] = useState(() => ({
    soundEnabled: gameSfx.isEnabled(),
    musicEnabled: gameMusic.isEnabled(),
    soundVolume: gameSfx.getVolume(),
    musicVolume: gameMusic.getVolume(),
  }));

  const toggleSound = () => {
    const soundEnabled = gameSfx.setEnabled(!gameSfx.isEnabled());
    setSettings((current) => ({ ...current, soundEnabled }));
  };
  const toggleMusic = () => {
    const musicEnabled = gameMusic.setEnabled(!gameMusic.isEnabled());
    setSettings((current) => ({ ...current, musicEnabled }));
  };

  return (
    <div className="settings-panel settings-panel--audio" aria-label="Configuracion de sonido y musica">
      <section className="audio-setting-card" aria-label="Configuracion de sonido">
        <SettingToggle
          label="Sonido"
          description="Efectos medievales de interfaz, combate y progreso."
          enabled={settings.soundEnabled}
          onToggle={toggleSound}
        />
        <VolumeControl
          label="Sonido"
          value={settings.soundVolume}
          onChange={(soundVolume) => {
            setSettings((current) => ({ ...current, soundVolume: gameSfx.setVolume(soundVolume) }));
          }}
        />
      </section>
      <section className="audio-setting-card" aria-label="Configuracion de musica">
        <SettingToggle
          label="Musica"
          description="Musica medieval adaptada a menus y dificultad."
          enabled={settings.musicEnabled}
          onToggle={toggleMusic}
        />
        <VolumeControl
          label="Musica"
          value={settings.musicVolume}
          onChange={(musicVolume) => {
            setSettings((current) => ({ ...current, musicVolume: gameMusic.setVolume(musicVolume) }));
          }}
        />
      </section>
    </div>
  );
}

function SettingsEntryButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactElement;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button className="settings-entry" type="button" onClick={onClick}>
      <span className="settings-entry__icon" aria-hidden="true">{icon}</span>
      <span className="settings-entry__copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="settings-entry__arrow" aria-hidden="true">›</span>
    </button>
  );
}
