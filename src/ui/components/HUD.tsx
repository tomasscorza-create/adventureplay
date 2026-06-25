import type { CSSProperties } from "react";
import type { HudState } from "../../shared/types/game";

interface HUDProps {
  hud: HudState;
}

export function HUD({ hud }: HUDProps) {
  const minutes = Math.floor(hud.timeRemaining / 60);
  const seconds = String(hud.timeRemaining % 60).padStart(2, "0");
  const progressStyle = {
    "--progress-percent": `${hud.progressPercent}%`,
  } as CSSProperties;

  return (
    <section className="hud" aria-label="Estado del jugador">
      <div className="hud__item hud__item--timer">
        <span className="hud__label">Tiempo</span>
        <span className="hud__value">
          {minutes}:{seconds}
        </span>
      </div>
      <div className="hud__item">
        <span className="hud__label">Vida</span>
        <span className="hud__value">
          {hud.health}/{hud.maxHealth}
        </span>
      </div>
      <div className="hud__item">
        <span className="hud__label">Nivel</span>
        <span className="hud__value">{hud.level}</span>
      </div>
      <div className="hud__item">
        <span className="hud__label">Experiencia</span>
        <span className="hud__value">
          {hud.experience}/{hud.experienceToNextLevel}
        </span>
      </div>
      <div className="hud__item">
        <span className="hud__label">Monedas</span>
        <span className="hud__value">{hud.coins}</span>
      </div>
      <div className="hud__progress" style={progressStyle} aria-label="Progreso del nivel">
        <span className="hud__progress-track">
          <span className="hud__progress-fill" />
        </span>
        <span className="hud__progress-value">{hud.progressPercent}%</span>
      </div>
    </section>
  );
}
