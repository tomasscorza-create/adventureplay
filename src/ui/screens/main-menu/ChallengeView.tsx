import {
  puzzleLevelDefinitions,
  puzzleLevelOrder,
} from "../../../game/data/puzzleLevels";
import type { SaveData } from "../../../shared/types/game";
import { MenuHeading } from "./MenuPrimitives";

interface ChallengeViewProps {
  save: SaveData;
  onBack: () => void;
  onStartLevel: (levelId: string) => void;
}

export function ChallengeView({ save, onBack, onStartLevel }: ChallengeViewProps) {
  const levels = puzzleLevelOrder.map((levelId) => puzzleLevelDefinitions[levelId]);
  const completedCount = levels.filter((level) => save.completedLevels.includes(level.id)).length;

  return (
    <div className="menu-chamber menu-chamber--challenge">
      <MenuHeading title="Desafio" variant="modes" onBack={onBack} />

      <section className="challenge-mode" aria-label="Seleccion de desafio">
        <div className="challenge-mode__intro">
          <span className="challenge-mode__eyebrow">Ingenio bajo presion</span>
          <h2>Las camaras antiguas</h2>
          <p>
            Cuatro pruebas encadenadas. Cada camara aumenta aproximadamente un 23% su dificultad
            mediante mas recorrido, sellos, peligros y decisiones bajo reloj.
          </p>
          <strong>{completedCount} / {levels.length} camaras completadas</strong>
        </div>

        <div className="challenge-level-grid">
          {levels.map((level, index) => {
            const completed = save.completedLevels.includes(level.id);
            const unlocked = save.unlockedLevels.includes(level.id);
            const previousRating = index > 0 ? levels[index - 1].difficultyRating : undefined;
            const increase = previousRating
              ? Math.round((level.difficultyRating / previousRating - 1) * 100)
              : undefined;
            return (
              <article
                className={`challenge-level-card${completed ? " is-completed" : ""}${unlocked ? "" : " is-locked"}`}
                key={level.id}
              >
                <span className="challenge-level-card__number">{level.stageNumber}</span>
                <span className="challenge-card__status">
                  {completed ? "Completada" : unlocked ? "Disponible" : "Bloqueada"}
                </span>
                <h3>{level.name}</h3>
                <div className="challenge-level-card__metrics">
                  <span>Dificultad {level.difficultyRating}</span>
                  <span>{increase ? `+${increase}%` : "Base"}</span>
                  <span>{level.timeLimitSeconds}s</span>
                  <span>{level.seals.length} {level.seals.length === 1 ? "sello" : "sellos"}</span>
                </div>
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onStartLevel(level.id)}
                >
                  {!unlocked ? "Completa la anterior" : completed ? "Repetir" : "Entrar"}
                </button>
              </article>
            );
          })}
        </div>

        <article className="challenge-card challenge-card--coop" aria-disabled="true">
          <span className="challenge-card__status">Proxima fase</span>
          <h3>Cooperativo</h3>
          <strong>Activadores para varios heroes</strong>
          <p>
            Las cuatro camaras declaran objetivos compartidos y compatibilidad cooperativa. La sesion
            de red, sincronizacion y segundo jugador se incorporaran sobre ese contrato.
          </p>
          <button type="button" disabled>Multijugador en preparacion</button>
        </article>
      </section>
    </div>
  );
}
