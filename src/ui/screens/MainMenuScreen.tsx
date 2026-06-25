import { useMemo, useState } from "react";
import { playableCharacters } from "../../game/data/characters";
import { levelDefinitions } from "../../game/data/levels";
import type { CharacterId, SaveData } from "../../shared/types/game";

type MenuView = "main" | "modes" | "explore" | "characters";

interface MainMenuScreenProps {
  save: SaveData;
  onStartLevel: (levelId: string) => void;
  onSelectCharacter: (characterId: CharacterId) => void;
}

interface LevelSlot {
  number: number;
  levelId?: string;
  name: string;
}

const levelSlots: LevelSlot[] = [
  { number: 1, levelId: "meadowOutpost", name: "Sendero I" },
  { number: 2, levelId: "meadowOutpost2", name: "Sendero II" },
  { number: 3, name: "Nivel 3" },
  { number: 4, name: "Nivel 4" },
  { number: 5, name: "Nivel 5" },
  { number: 6, name: "Nivel 6" },
  { number: 7, name: "Nivel 7" },
  { number: 8, name: "Nivel 8" },
  { number: 9, name: "Nivel 9" },
  { number: 10, name: "Nivel 10" },
];

const regions = [
  { id: "verdant-frontier", name: "Frontera Verde", status: "Disponible" },
  { id: "ash-crown", name: "Corona de Ceniza", status: "Proximamente" },
  { id: "sunken-marsh", name: "Marisma Hundida", status: "Proximamente" },
  { id: "north-spires", name: "Agujas del Norte", status: "Proximamente" },
];

export function MainMenuScreen({ save, onStartLevel, onSelectCharacter }: MainMenuScreenProps) {
  const [view, setView] = useState<MenuView>("main");

  const nextPlayableLevelId = useMemo(() => {
    return levelSlots.find((slot) => {
      if (!slot.levelId) {
        return false;
      }

      const isUnlocked = save.unlockedLevels.includes(slot.levelId);
      const isCompleted = save.completedLevels.includes(slot.levelId);
      return isUnlocked && !isCompleted;
    })?.levelId;
  }, [save.completedLevels, save.unlockedLevels]);

  return (
    <section className="overlay overlay--menu">
      <div className="menu-shell">
        {view === "main" && (
          <div className="menu-panel menu-panel--compact">
            <span className="panel__eyebrow">Menu principal</span>
            <h1>Superjuego</h1>
            <div className="menu-actions">
              <button className="button" type="button" onClick={() => setView("modes")}>
                Iniciar juego
              </button>
              <button className="button button--secondary" type="button" onClick={() => setView("characters")}>
                Personaje
              </button>
            </div>
          </div>
        )}

        {view === "characters" && (
          <div className="menu-panel menu-panel--wide">
            <div className="menu-heading">
              <div>
                <span className="panel__eyebrow">Personaje</span>
                <h2>Elegir heroe</h2>
              </div>
              <button className="button button--secondary button--small" type="button" onClick={() => setView("main")}>
                Volver
              </button>
            </div>

            <div className="character-list" aria-label="Personajes disponibles">
              {playableCharacters.map((character) => {
                const isSelected = character.id === save.selectedCharacterId;
                return (
                  <button
                    className={`character-card${isSelected ? " character-card--selected" : ""}`}
                    type="button"
                    key={character.id}
                    data-character-id={character.id}
                    aria-pressed={isSelected}
                    onClick={() => onSelectCharacter(character.id)}
                  >
                    <span className={`character-card__avatar character-card__avatar--${character.id}`}>
                      {character.name.slice(0, 1)}
                    </span>
                    <span className="character-card__body">
                      <strong>{character.name}</strong>
                      <span>{character.description}</span>
                    </span>
                    <span className="character-card__status">{isSelected ? "Seleccionado" : "Disponible"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === "modes" && (
          <div className="menu-panel menu-panel--wide">
            <div className="menu-heading">
              <div>
                <span className="panel__eyebrow">Modos de juego</span>
                <h2>Seleccion</h2>
              </div>
              <button className="button button--secondary button--small" type="button" onClick={() => setView("main")}>
                Volver
              </button>
            </div>

            <div className="mode-grid">
              <button className="mode-tile mode-tile--active" type="button" onClick={() => setView("explore")}>
                <span>Explorar</span>
                <strong>Campana del continente</strong>
              </button>
              <button className="mode-tile" type="button" disabled>
                <span>Desafio</span>
                <strong>Proximamente</strong>
              </button>
              <button className="mode-tile" type="button" disabled>
                <span>Arena</span>
                <strong>Proximamente</strong>
              </button>
            </div>
          </div>
        )}

        {view === "explore" && (
          <div className="menu-panel menu-panel--map">
            <div className="menu-heading">
              <div>
                <span className="panel__eyebrow">Explorar</span>
                <h2>Continente de Arvand</h2>
              </div>
              <button className="button button--secondary button--small" type="button" onClick={() => setView("modes")}>
                Modos
              </button>
            </div>

            <div className="explore-layout">
              <div className="continent-map" aria-label="Mapa de regiones">
                {regions.map((region, index) => (
                  <button
                    className={`region-piece region-piece--${index + 1}`}
                    type="button"
                    key={region.id}
                    disabled={index !== 0}
                  >
                    <span>{region.name}</span>
                    <strong>{region.status}</strong>
                  </button>
                ))}
              </div>

              <div className="level-column" aria-label="Niveles de Frontera Verde">
                <div className="level-column__header">
                  <span>Frontera Verde</span>
                  <strong>10 niveles</strong>
                </div>

                <div className="level-list">
                  {levelSlots.map((slot) => {
                    const levelExists = Boolean(slot.levelId && levelDefinitions[slot.levelId]);
                    const isUnlocked = Boolean(slot.levelId && save.unlockedLevels.includes(slot.levelId));
                    const isCompleted = Boolean(slot.levelId && save.completedLevels.includes(slot.levelId));
                    const isCurrent = slot.levelId === nextPlayableLevelId;
                    const canPlay = levelExists && isUnlocked;
                    const status = getLevelStatus({
                      levelExists,
                      isCompleted,
                      isCurrent,
                      isUnlocked,
                    });

                    return (
                      <button
                        className={`level-card level-card--${status.kind}`}
                        type="button"
                        key={slot.number}
                        disabled={!canPlay}
                        onClick={() => {
                          if (slot.levelId) {
                            onStartLevel(slot.levelId);
                          }
                        }}
                      >
                        <span className="level-card__number">LV {slot.number}</span>
                        <span className="level-card__name">{slot.name}</span>
                        <span className="level-card__status">{status.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function getLevelStatus({
  levelExists,
  isCompleted,
  isCurrent,
  isUnlocked,
}: {
  levelExists: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  isUnlocked: boolean;
}): { kind: "completed" | "current" | "locked" | "soon"; label: string } {
  if (!levelExists) {
    return { kind: "soon", label: "Proximamente" };
  }

  if (isCompleted) {
    return { kind: "completed", label: "Completado" };
  }

  if (isCurrent || isUnlocked) {
    return { kind: "current", label: "Pendiente" };
  }

  return { kind: "locked", label: "Bloqueado" };
}
