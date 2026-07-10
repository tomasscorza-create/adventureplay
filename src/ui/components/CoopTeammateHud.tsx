import type { TeammateHudState } from "../../shared/types/game";
import { characterDefinitions } from "../../game/data/characters";

interface CoopTeammateHudProps {
  teammates: TeammateHudState[];
}

export function CoopTeammateHud({ teammates }: CoopTeammateHudProps) {
  if (teammates.length === 0) return null;

  return (
    <aside className="coop-teammate-hud" aria-label="Estado de los compañeros de equipo">
      {teammates.map((teammate) => {
        const character = characterDefinitions[teammate.characterId];
        const isDisconnected = teammate.status === "disconnected";
        const isDefeated = teammate.status === "defeated";
        
        let statusClass = "";
        let statusLabel = "";
        if (isDisconnected) {
          statusClass = " is-disconnected";
          statusLabel = "Desconectado";
        } else if (isDefeated) {
          statusClass = " is-defeated";
          statusLabel = "Derrotado";
        }

        return (
          <article 
            key={`teammate-${teammate.slot}`} 
            className={`teammate-card${statusClass}`}
          >
            <div className="teammate-card__header">
              <span className="teammate-card__slot">P{teammate.slot + 1}</span>
              <span className="teammate-card__name">{character.name}</span>
            </div>
            
            {(isDisconnected || isDefeated) ? (
              <div className="teammate-card__status-overlay">
                <strong>{statusLabel}</strong>
              </div>
            ) : (
              <div className="teammate-card__stats">
                <div className="teammate-card__health">
                  <span className="teammate-card__label">Vida</span>
                  <span className="teammate-card__value">
                    {teammate.health}/{teammate.maxHealth}
                  </span>
                </div>
                <div className="teammate-card__charges">
                  <span className="teammate-card__charge" title="Cargas de Curacion">
                    ❤️ {teammate.healingCharges}
                  </span>
                  <span className="teammate-card__charge" title="Cargas de Poder">
                    ⚡ {teammate.powerCharges}
                  </span>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </aside>
  );
}
