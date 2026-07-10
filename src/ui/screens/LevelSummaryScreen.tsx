import {
  getAchievementDefinition,
  getAchievementRewardLabels,
} from "../../game/data/achievements";
import type { LevelCompletionSummary } from "../../shared/types/game";
import { AchievementIcon } from "../components/AchievementIcon";
import { coopSession } from "../../game/systems/net/CoopSession";

interface LevelSummaryScreenProps {
  summary: LevelCompletionSummary;
  onContinue: () => void;
}

type ResultIconId = "monster" | "time" | "gold" | "apm" | "arrow";

function ResultIcon({ icon }: { icon: ResultIconId }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {icon === "monster" && (
        <path d="m7 8-2-4 5 2h4l5-2-2 4 2 3v6l-4 4H9l-4-4v-6l2-3Zm2 5h.01M15 13h.01M9 17h6" />
      )}
      {icon === "time" && <path d="M9 3h6m-3 3a7 7 0 1 1-7 7 7 7 0 0 1 7-7Zm0 3v4l3 2" />}
      {icon === "gold" && (
        <><ellipse cx="12" cy="12" rx="8" ry="9" /><path d="M9 8h4.5a2 2 0 0 1 0 4H10a2 2 0 0 0 0 4h5M12 6v12" /></>
      )}
      {icon === "apm" && <path d="M4 15a8 8 0 1 1 16 0M12 15l4-5m-9 8h10" />}
      {icon === "arrow" && <path d="M5 12h13m-5-5 5 5-5 5" />}
    </svg>
  );
}

export function LevelSummaryScreen({ summary, onContinue }: LevelSummaryScreenProps) {
  const achievements = summary.achievementIds
    .map(getAchievementDefinition)
    .filter((achievement) => achievement !== undefined);
  const isFinalLevel = !summary.nextLevelId;
  const durationMinutes = Math.floor(summary.gameplayDurationSeconds / 60);
  const durationSeconds = summary.gameplayDurationSeconds % 60;
  const durationLabel = durationMinutes > 0
    ? `${durationMinutes}:${durationSeconds.toString().padStart(2, "0")}`
    : `${durationSeconds}s`;
  const regionName = summary.theme === "enchanted-forest"
    ? "Bosque encantado"
    : summary.theme === "active-volcano"
      ? "Volcán Activo"
      : summary.theme === "ancient-trials"
        ? "Las camaras antiguas"
        : "Frontera Verde";

  const isWaiting = coopSession.isActive && coopSession.role === "guest" && !isFinalLevel;

  return (
    <section className={`overlay level-summary level-summary--${summary.theme}`}>
      <div className="level-summary__aurora" aria-hidden="true" />
      <div className="level-summary__impact" aria-hidden="true" />
      <div className="level-summary__fragments" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className={`level-summary__fragment level-summary__fragment--${index + 1}`} />
        ))}
      </div>

      <article className="level-summary__panel" aria-labelledby="level-summary-title">
        <div className="level-summary__edge" aria-hidden="true" />
        <header className="level-summary__header">
          <span className="level-summary__kicker">Nivel completado</span>
          <div className="level-summary__title-row">
            <span className="level-summary__stage">LV {summary.stageNumber}</span>
            <div>
              <h2 id="level-summary-title">{summary.levelName}</h2>
              <span className="level-summary__region">{regionName}</span>
            </div>
          </div>
        </header>

        <div className="level-summary__stats" aria-label="Resultados del nivel">
          <div className="level-summary__stat level-summary__stat--monsters level-summary__stat--split">
            <span className="level-summary__mini-stat">
              <span className="level-summary__stat-icon"><ResultIcon icon="monster" /></span>
              <span className="level-summary__stat-copy">
                <strong>{summary.monstersDefeated}</strong>
                <small>Monst.</small>
              </span>
            </span>
            <span className="level-summary__mini-stat">
              <span className="level-summary__stat-icon"><ResultIcon icon="time" /></span>
              <span className="level-summary__stat-copy">
                <strong>{durationLabel}</strong>
                <small>Tiempo</small>
              </span>
            </span>
          </div>
          <div className="level-summary__stat level-summary__stat--gold">
            <span className="level-summary__stat-icon"><ResultIcon icon="gold" /></span>
            <span className="level-summary__stat-copy">
              <strong>+{summary.goldCollected}</strong>
              <small>ORO recogido</small>
            </span>
          </div>
          <div className="level-summary__stat level-summary__stat--complete">
            <span className="level-summary__stat-icon"><ResultIcon icon="apm" /></span>
            <span className="level-summary__stat-copy">
              <strong>{summary.actionsPerMinute}</strong>
              <small>APM promedio</small>
            </span>
          </div>
        </div>

        <section className={`level-summary__achievements${achievements.length ? " is-unlocked" : ""}`}>
          <span className="level-summary__achievement-label">
            {achievements.length === 1 ? "Logro desbloqueado" : "Logros desbloqueados"}
          </span>
          {achievements.length > 0 ? (
            <div className="level-summary__achievement-list">
              {achievements.map((achievement) => (
                <div className="level-summary__achievement" key={achievement.id}>
                  <span><AchievementIcon icon={achievement.icon} /></span>
                  <span className="level-summary__achievement-copy">
                    <strong>{achievement.title}</strong>
                    <small>{getAchievementRewardLabels(achievement.reward).join(" + ")}</small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="level-summary__achievement-empty">Ninguno en este recorrido</span>
          )}
        </section>

        <footer className="level-summary__footer">
          <div className="level-summary__next-copy">
            <small>{isFinalLevel ? "Region completada" : "Siguiente destino"}</small>
            <strong>
              {isFinalLevel
                ? "Victoria final"
                : `LV ${summary.nextStageNumber} · ${summary.nextLevelName}`}
            </strong>
          </div>
          <button className="level-summary__next-button" type="button" onClick={onContinue} disabled={isWaiting}>
            <span>{isFinalLevel ? "Finalizar" : isWaiting ? "Esperando al anfitrion…" : "Próximo"}</span>
            <ResultIcon icon="arrow" />
          </button>
        </footer>
      </article>
    </section>
  );
}
