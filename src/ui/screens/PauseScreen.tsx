import { useState } from "react";
import { MenuHeading } from "./main-menu/MenuPrimitives";
import {
  AudioSettingsPage,
  ControlSettingsPage,
  SettingsNavigationEntries,
} from "./settings/SettingsPages";

interface PauseScreenProps {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  showDesktopCommandSettings: boolean;
}

type PauseView = "pause" | "settings" | "audio" | "controls";

export function PauseScreen({
  onResume,
  onRestart,
  onMenu,
  showDesktopCommandSettings,
}: PauseScreenProps) {
  const [view, setView] = useState<PauseView>("pause");

  return (
    <section className="overlay overlay--pause">
      {view === "settings" && (
        <div className="menu-chamber menu-chamber--options pause-settings-menu">
          <MenuHeading
            title="Ajustes"
            variant="settings"
            onBack={() => setView("pause")}
            backLabel="Pausa"
          />
          <SettingsNavigationEntries
            showDesktopCommandSettings={showDesktopCommandSettings}
            onOpenAudio={() => setView("audio")}
            onOpenControls={() => setView("controls")}
          />
        </div>
      )}

      {view === "audio" && <AudioSettingsPage onBack={() => setView("settings")} />}

      {view === "controls" && (
        <ControlSettingsPage
          showDesktopCommandSettings={showDesktopCommandSettings}
          onBack={() => setView("settings")}
        />
      )}

      {view === "pause" && (
        <div className="panel panel--pause">
          <button
            className="pause-settings-gear"
            type="button"
            aria-label="Abrir ajustes"
            onClick={() => setView("settings")}
          >
            <svg className="pause-settings-gear__icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3.4" />
              <path d="M12 2.8v3.1M12 18.1v3.1M2.8 12h3.1M18.1 12h3.1M5.5 5.5l2.2 2.2M16.3 16.3l2.2 2.2M18.5 5.5l-2.2 2.2M7.7 16.3l-2.2 2.2" />
            </svg>
          </button>
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
