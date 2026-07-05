import { useState, type CSSProperties } from "react";
import menuGearUrl from "../../assets/menu/menu-gear.webp";
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
            style={{ "--pause-gear-image": `url(${menuGearUrl})` } as CSSProperties}
            onClick={() => setView("settings")}
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
