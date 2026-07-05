import { useState, type CSSProperties } from "react";
import menuGearUrl from "../../assets/menu/menu-gear.webp";
import { gameMusic } from "../../shared/music/GameMusic";
import { gameSfx } from "../../shared/sfx/GameSfx";
import { KeyboardBindingsView } from "./main-menu/KeyboardBindingsView";
import { SettingToggle, VolumeControl } from "./main-menu/MenuPrimitives";
import { MobileGameplaySettingsView } from "./main-menu/MobileGameplaySettingsView";

interface PauseScreenProps {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  showDesktopCommandSettings: boolean;
}

type PauseSettingsSection = "audio" | "controls";

export function PauseScreen({
  onResume,
  onRestart,
  onMenu,
  showDesktopCommandSettings,
}: PauseScreenProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState<PauseSettingsSection>("audio");
  const [audioSettings, setAudioSettings] = useState({
    soundEnabled: gameSfx.isEnabled(),
    musicEnabled: gameMusic.isEnabled(),
    soundVolume: gameSfx.getVolume(),
    musicVolume: gameMusic.getVolume(),
  });

  const toggleSound = () => {
    const soundEnabled = gameSfx.setEnabled(!gameSfx.isEnabled());
    setAudioSettings((current) => ({ ...current, soundEnabled }));
  };
  const toggleMusic = () => {
    const musicEnabled = gameMusic.setEnabled(!gameMusic.isEnabled());
    setAudioSettings((current) => ({ ...current, musicEnabled }));
  };
  const setSoundVolume = (soundVolume: number) => {
    setAudioSettings((current) => ({ ...current, soundVolume: gameSfx.setVolume(soundVolume) }));
  };
  const setMusicVolume = (musicVolume: number) => {
    setAudioSettings((current) => ({ ...current, musicVolume: gameMusic.setVolume(musicVolume) }));
  };

  return (
    <section className="overlay overlay--pause">
      {showSettings ? (
        <div className="panel panel--pause-settings">
          <header className="pause-settings__header">
            <span className="panel__eyebrow">Partida en pausa</span>
            <h2>Ajustes</h2>
          </header>
          <div className="pause-settings__tabs" role="tablist" aria-label="Secciones de ajustes">
            <button
              className={settingsSection === "audio" ? "is-active" : ""}
              type="button"
              role="tab"
              aria-selected={settingsSection === "audio"}
              onClick={() => setSettingsSection("audio")}
            >
              Sonido y musica
            </button>
            <button
              className={settingsSection === "controls" ? "is-active" : ""}
              type="button"
              role="tab"
              aria-selected={settingsSection === "controls"}
              onClick={() => setSettingsSection("controls")}
            >
              Controles
            </button>
          </div>

          <div className="pause-settings__body">
            {settingsSection === "audio" ? (
              <div className="settings-panel settings-panel--audio" aria-label="Configuracion de sonido y musica">
                <section className="audio-setting-card" aria-label="Configuracion de sonido">
                  <SettingToggle
                    label="Sonido"
                    description="Efectos de interfaz, combate y progreso."
                    enabled={audioSettings.soundEnabled}
                    onToggle={toggleSound}
                  />
                  <VolumeControl label="Sonido" value={audioSettings.soundVolume} onChange={setSoundVolume} />
                </section>
                <section className="audio-setting-card" aria-label="Configuracion de musica">
                  <SettingToggle
                    label="Musica"
                    description="Musica adaptada a la dificultad del recorrido."
                    enabled={audioSettings.musicEnabled}
                    onToggle={toggleMusic}
                  />
                  <VolumeControl label="Musica" value={audioSettings.musicVolume} onChange={setMusicVolume} />
                </section>
              </div>
            ) : showDesktopCommandSettings ? (
              <KeyboardBindingsView />
            ) : (
              <MobileGameplaySettingsView />
            )}
          </div>
          <div className="actions pause-settings__actions">
            <button className="button" type="button" onClick={() => setShowSettings(false)}>
              Aceptar
            </button>
            <button className="button button--secondary" type="button" onClick={() => setShowSettings(false)}>
              Volver a pausa
            </button>
          </div>
        </div>
      ) : (
        <div className="panel panel--pause">
          <button
            className="pause-settings-gear"
            type="button"
            aria-label="Abrir ajustes"
            style={{ "--pause-gear-image": `url(${menuGearUrl})` } as CSSProperties}
            onClick={() => setShowSettings(true)}
          />
          <span className="panel__eyebrow">Sendero detenido</span>
          <h2>Pausa</h2>
          <p>La niebla queda suspendida hasta que vuelvas al camino.</p>
          <div className="actions">
            <button className="button" type="button" onClick={onResume}>Continuar</button>
            <button className="button button--secondary" type="button" onClick={onRestart}>Reiniciar</button>
            <button className="button button--secondary" type="button" onClick={onMenu}>Menu</button>
          </div>
        </div>
      )}
    </section>
  );
}
