import type { CSSProperties } from "react";
import type { AchievementReward } from "../../game/data/achievements";
import { MAX_PLAYER_LEVEL } from "../../game/data/progression";
import type { HudState } from "../../shared/types/game";

interface HUDProps {
  hud: HudState;
  healthPickupFeedback: { sequence: number; restored: number };
  achievementReward?: AchievementReward;
  rewardFeedbackKey?: string;
}

export function HUD({ hud, healthPickupFeedback, achievementReward, rewardFeedbackKey }: HUDProps) {
  const minutes = Math.floor(hud.timeRemaining / 60);
  const seconds = String(hud.timeRemaining % 60).padStart(2, "0");
  const progressStyle = {
    "--progress-percent": `${hud.progressPercent}%`,
  } as CSSProperties;
  const romanStageNumber = toRomanStageNumber(hud.stageNumber);

  return (
    <>
      <aside className="stage-level-badge" aria-label={`Nivel de escenario ${hud.stageNumber}`}>
        <span>LV</span>
        <strong>{romanStageNumber}</strong>
      </aside>
      <section className="hud" aria-label="Estado del jugador">
        <div className="hud__item hud__item--timer">
          <span className="hud__label">Tiempo</span>
          <span className="hud__value">
            {minutes}:{seconds}
          </span>
        </div>
        <div
          key={`health-feedback-${healthPickupFeedback.sequence}`}
          className={`hud__item hud__item--health${healthPickupFeedback.sequence > 0 ? " hud__item--health-pulse" : ""}`}
        >
          <span className="hud__label">Vida</span>
          <span className="hud__value">
            {hud.health}/{hud.maxHealth}
          </span>
          {healthPickupFeedback.sequence > 0 && (
            <span className="hud__health-feedback" aria-live="polite">
              {healthPickupFeedback.restored > 0 ? "+1 VIDA" : "VIDA COMPLETA"}
            </span>
          )}
        </div>
        <div className="hud__item">
          <span className="hud__label">Nivel</span>
          <span className="hud__value">{hud.level}</span>
        </div>
        <div
          className={`hud__item hud__item--experience${achievementReward?.experience ? " hud__item--reward-pulse" : ""}`}
        >
          <span className="hud__label">Experiencia</span>
          <span className="hud__value">
            {hud.level >= MAX_PLAYER_LEVEL
              ? "MAX"
              : `${hud.experience}/${hud.experienceToNextLevel}`}
          </span>
          {achievementReward?.experience && (
            <span className="hud__reward-feedback hud__reward-feedback--xp" key={`xp-${rewardFeedbackKey}`}>
              +{achievementReward.experience} XP
            </span>
          )}
        </div>
        <div
          className={`hud__item hud__item--gold${achievementReward?.gold ? " hud__item--reward-pulse" : ""}`}
        >
          <span className="hud__label">ORO</span>
          <span className="hud__value">{hud.coins}</span>
          {achievementReward?.gold && (
            <span className="hud__reward-feedback hud__reward-feedback--gold" key={`gold-${rewardFeedbackKey}`}>
              +{achievementReward.gold} ORO
            </span>
          )}
        </div>
        <div className="hud__progress" style={progressStyle} aria-label="Progreso del nivel">
          <span className="hud__progress-track">
            <span className="hud__progress-fill" />
          </span>
          <span className="hud__progress-value">{hud.progressPercent}%</span>
        </div>
      </section>
    </>
  );
}

function toRomanStageNumber(stageNumber: number): string {
  const romanNumbers = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return romanNumbers[stageNumber] ?? String(stageNumber);
}
