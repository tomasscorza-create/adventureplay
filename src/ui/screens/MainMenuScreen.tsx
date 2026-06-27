import { useMemo, useState } from "react";
import { playableCharacters } from "../../game/data/characters";
import { inventoryCategories, itemDefinitions } from "../../game/data/items";
import { levelDefinitions } from "../../game/data/levels";
import { gameAudio } from "../../shared/audio/GameAudio";
import type { CharacterId, InventoryCategoryId, SaveData } from "../../shared/types/game";

type MenuView = "main" | "modes" | "explore" | "characters" | "inventory" | "options";

interface MainMenuScreenProps {
  playerEmail?: string;
  save: SaveData;
  onSignOut: () => void;
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
  { number: 3, levelId: "meadowOutpost3", name: "Sendero III" },
  { number: 4, levelId: "meadowOutpost4", name: "Piedras Errantes I" },
  { number: 5, levelId: "meadowOutpost5", name: "Piedras Errantes II" },
  { number: 6, levelId: "meadowOutpost6", name: "Piedras Errantes III" },
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

const mainActions = [
  { id: "start", label: "Iniciar juego", view: "modes" as const },
  { id: "character", label: "Personaje", view: "characters" as const },
  { id: "inventory", label: "Inventario", view: "inventory" as const },
];

const categoryIconLabels: Record<InventoryCategoryId, string> = {
  plansKeys: "K",
  toolsWeapons: "A",
  potions: "P",
};

export function MainMenuScreen({
  playerEmail,
  save,
  onSignOut,
  onStartLevel,
  onSelectCharacter,
}: MainMenuScreenProps) {
  const [view, setView] = useState<MenuView>("main");
  const [activeInventoryCategoryId, setActiveInventoryCategoryId] =
    useState<InventoryCategoryId>("plansKeys");
  const [audioSettings, setAudioSettings] = useState(() => gameAudio.getSettings());
  const runMenuAction = (action: () => void) => {
    gameAudio.playUiSelect();
    action();
  };
  const toggleSound = () => {
    gameAudio.playUiSelect();
    setAudioSettings(gameAudio.setSoundEnabled(!audioSettings.soundEnabled));
  };
  const toggleMusic = () => {
    gameAudio.playUiSelect();
    setAudioSettings(gameAudio.setMusicEnabled(!audioSettings.musicEnabled));
  };

  const inventoryGroups = useMemo(() => {
    const itemCountsByCategory = new Map<InventoryCategoryId, Map<string, number>>();

    for (const itemId of save.player.inventory) {
      const item = itemDefinitions[itemId];
      if (!item?.inventoryCategory) {
        continue;
      }

      const categoryCounts = itemCountsByCategory.get(item.inventoryCategory) ?? new Map<string, number>();
      categoryCounts.set(itemId, (categoryCounts.get(itemId) ?? 0) + 1);
      itemCountsByCategory.set(item.inventoryCategory, categoryCounts);
    }

    return inventoryCategories.map((category) => {
      const categoryCounts = itemCountsByCategory.get(category.id);
      const items = categoryCounts
        ? Array.from(categoryCounts.entries()).map(([itemId, amount]) => ({
            amount,
            item: itemDefinitions[itemId],
          }))
        : [];

      return { ...category, items };
    });
  }, [save.player.inventory]);

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
      <div className={`menu-stage menu-stage--${view}`}>
        <span className="menu-stage__arch menu-stage__arch--left" aria-hidden="true" />
        <span className="menu-stage__arch menu-stage__arch--right" aria-hidden="true" />
        <span className="menu-stage__vista menu-stage__vista--left" aria-hidden="true" />
        <span className="menu-stage__vista menu-stage__vista--right" aria-hidden="true" />
        <div className="menu-shell">
          {view === "main" && (
            <div className="home-monument" aria-label="Menu principal">
              <div className="home-monument__topline">
                <span className="home-monument__plaque">Menu principal</span>
                <span className="session-controls">
                  {playerEmail && <span className="session-controls__email">{playerEmail}</span>}
                  <button
                    className="session-controls__button"
                    type="button"
                    onClick={() => runMenuAction(onSignOut)}
                  >
                    Salir
                  </button>
                  <button
                    className="options-gear"
                    type="button"
                    aria-label="Opciones"
                    onClick={() => runMenuAction(() => setView("options"))}
                  >
                    <svg className="options-gear__icon" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="3.4" />
                      <path d="M12 2.8v3.1M12 18.1v3.1M2.8 12h3.1M18.1 12h3.1M5.5 5.5l2.2 2.2M16.3 16.3l2.2 2.2M18.5 5.5l-2.2 2.2M7.7 16.3l-2.2 2.2" />
                    </svg>
                  </button>
                </span>
              </div>
              <h1 className="game-title">
                <span>Adventure</span>
                <span>Reigns</span>
              </h1>

              <div className="menu-relics">
                {mainActions.map((action) => (
                  <button
                    className={`menu-relic menu-relic--${action.id}`}
                    type="button"
                    key={action.id}
                    onClick={() => runMenuAction(() => setView(action.view))}
                  >
                    <span className="menu-relic__icon" aria-hidden="true" />
                    <span className="menu-relic__label">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === "options" && (
            <div className="menu-chamber menu-chamber--options">
              <MenuHeading eyebrow="Opciones" title="Ajustes" onBack={() => setView("main")} />

              <div className="settings-panel" aria-label="Opciones de audio">
                <SettingToggle
                  label="Sonido"
                  description="Efectos de interfaz, golpes, saltos y acciones."
                  enabled={audioSettings.soundEnabled}
                  onToggle={toggleSound}
                />
                <SettingToggle
                  label="Musica"
                  description="Melodia suave de fondo durante menus y partida."
                  enabled={audioSettings.musicEnabled}
                  onToggle={toggleMusic}
                />
              </div>
            </div>
          )}

          {view === "inventory" && (
            <div className="menu-chamber menu-chamber--inventory">
              <MenuHeading eyebrow="Inventario" title="Bolsa de viaje" onBack={() => setView("main")} />

              <div className="inventory-screen" aria-label="Inventario del jugador">
                <div className="inventory-screen__summary">
                  <span>{save.player.inventory.length} piezas guardadas</span>
                  <strong>Frontera Verde</strong>
                </div>

                <div className="inventory-tabs" role="tablist" aria-label="Categorias de inventario">
                  {inventoryGroups.map((category) => {
                    const isActive = category.id === activeInventoryCategoryId;
                    return (
                      <button
                        className={`inventory-tab inventory-tab--${category.id}${
                          isActive ? " inventory-tab--active" : ""
                        }`}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        key={category.id}
                        onClick={() => runMenuAction(() => setActiveInventoryCategoryId(category.id))}
                      >
                        <span className="inventory-tab__seal" aria-hidden="true">
                          {categoryIconLabels[category.id]}
                        </span>
                        <span>{category.name}</span>
                        <strong>{category.items.length}</strong>
                      </button>
                    );
                  })}
                </div>

                {inventoryGroups.map((category) => (
                  <section
                    className={`inventory-page${
                      category.id === activeInventoryCategoryId ? " inventory-page--active" : ""
                    }`}
                    key={category.id}
                    hidden={category.id !== activeInventoryCategoryId}
                  >
                    <div className="inventory-page__header">
                      <span>{category.name}</span>
                      <strong>{category.items.length} / 12</strong>
                    </div>

                    <div className="inventory-slots">
                      {category.items.map(({ item, amount }) => (
                        <article
                          className={`inventory-slot inventory-slot--filled inventory-slot--${item.type}`}
                          key={item.id}
                        >
                          <span className="inventory-slot__icon">{item.name.slice(0, 1)}</span>
                          <span className="inventory-slot__body">
                            <strong>{item.name}</strong>
                            <span>{item.description ?? "Pieza recogida durante la aventura."}</span>
                          </span>
                          {amount > 1 && <span className="inventory-slot__amount">x{amount}</span>}
                        </article>
                      ))}

                      {Array.from({ length: Math.max(0, 6 - category.items.length) }, (_slot, index) => (
                        <span className="inventory-slot inventory-slot--empty" key={`${category.id}-empty-${index}`}>
                          Ranura vacia
                        </span>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}

          {view === "characters" && (
            <div className="menu-chamber menu-chamber--characters">
              <MenuHeading eyebrow="Personaje" title="Elegir heroe" onBack={() => setView("main")} />

              <div className="character-list" aria-label="Personajes disponibles">
                {playableCharacters.map((character) => {
                  const isSelected = character.id === save.selectedCharacterId;
                  return (
                    <button
                      className={`character-card character-card--${character.id}${
                        isSelected ? " character-card--selected" : ""
                      }`}
                      type="button"
                      key={character.id}
                      data-character-id={character.id}
                      aria-pressed={isSelected}
                      onClick={() => runMenuAction(() => onSelectCharacter(character.id))}
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
            <div className="menu-chamber menu-chamber--modes">
              <MenuHeading eyebrow="Modos de juego" title="Seleccion" onBack={() => setView("main")} />

              <div className="mode-grid">
                <button className="mode-tile mode-tile--active" type="button" onClick={() => runMenuAction(() => setView("explore"))}>
                  <span className="mode-tile__sigil" aria-hidden="true" />
                  <span>Explorar</span>
                  <strong>Campana del continente</strong>
                </button>
                <button className="mode-tile mode-tile--locked" type="button" disabled>
                  <span className="mode-tile__sigil" aria-hidden="true" />
                  <span>Desafio</span>
                  <strong>Proximamente</strong>
                </button>
                <button className="mode-tile mode-tile--locked" type="button" disabled>
                  <span className="mode-tile__sigil" aria-hidden="true" />
                  <span>Arena</span>
                  <strong>Proximamente</strong>
                </button>
              </div>
            </div>
          )}

          {view === "explore" && (
            <div className="menu-chamber menu-chamber--map">
              <MenuHeading eyebrow="Explorar" title="Continente de Arvand" onBack={() => setView("modes")} backLabel="Modos" />

              <div className="explore-layout">
                <div className="continent-map" aria-label="Mapa de regiones">
                  <span className="continent-map__compass" aria-hidden="true" />
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
                            gameAudio.playUiSelect();
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
      </div>
    </section>
  );
}

function MenuHeading({
  eyebrow,
  title,
  onBack,
  backLabel = "Volver",
}: {
  eyebrow: string;
  title: string;
  onBack: () => void;
  backLabel?: string;
}) {
  return (
    <div className="menu-heading">
      <div>
        <span className="panel__eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <button
        className="button button--secondary button--small"
        type="button"
        onClick={() => {
          gameAudio.playUiSelect();
          onBack();
        }}
      >
        {backLabel}
      </button>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={`settings-toggle${enabled ? " settings-toggle--on" : ""}`}
      type="button"
      aria-pressed={enabled}
      onClick={onToggle}
    >
      <span className="settings-toggle__copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
      <span className="settings-toggle__control" aria-hidden="true">
        <span className="settings-toggle__knob" />
      </span>
      <span className="settings-toggle__state">{enabled ? "ON" : "OFF"}</span>
    </button>
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
