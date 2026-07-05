import { useState } from "react";
import { gameMusic } from "../../../shared/music/GameMusic";
import { gameSfx } from "../../../shared/sfx/GameSfx";
import { KeyboardBindingsView } from "../main-menu/KeyboardBindingsView";
import { MenuHeading, SettingToggle, VolumeControl } from "../main-menu/MenuPrimitives";
import { MobileGameplaySettingsView } from "../main-menu/MobileGameplaySettingsView";

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
        icon="♪"
        title="Sonido y musica"
        description="Volumen, musica y efectos del juego."
        onClick={onOpenAudio}
      />
      <SettingsEntryButton
        icon={showDesktopCommandSettings ? "⌨" : "✥"}
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
  icon: string;
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
