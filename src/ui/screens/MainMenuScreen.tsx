import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import menuBackgroundUrl from "../../assets/menu/menu-background.webp";
import menuAchievementsButtonUrl from "../../assets/menu/menu-achievements.webp";
import menuCharacterButtonUrl from "../../assets/menu/menu-character.webp";
import menuGearUrl from "../../assets/menu/menu-gear.webp";
import menuInventoryButtonUrl from "../../assets/menu/menu-inventory.webp";
import menuStartButtonUrl from "../../assets/menu/menu-start.webp";
import {
  achievementCategories,
  achievementDefinitions,
  getAchievementRewardLabels,
  type AchievementCategoryId,
} from "../../game/data/achievements";
import { playableCharacters } from "../../game/data/characters";
import { inventoryCategories, itemDefinitions } from "../../game/data/items";
import { levelDefinitions } from "../../game/data/levels";
import { getProfileIconDefinition, profileIconDefinitions } from "../../game/data/profileIcons";
import {
  powerPackages,
  type PowerPackage,
  type PurchasablePower,
} from "../../game/data/powerShop";
import { gameAudio } from "../../shared/audio/GameAudio";
import type { CharacterId, InventoryCategoryId, ProfileIconId, SaveData } from "../../shared/types/game";
import { AbilityIcon } from "../components/AbilityIcon";
import { AchievementIcon } from "../components/AchievementIcon";

type MenuView = "main" | "profile" | "modes" | "explore" | "characters" | "inventory" | "achievements" | "options";
type ProfileSectionId = "edit" | "statistics";

interface MainMenuScreenProps {
  playerEmail?: string;
  save: SaveData;
  onSignOut: () => void;
  onResetProgress: () => Promise<void>;
  onStartLevel: (levelId: string) => void;
  onUpdatePlayerName: (displayName: string) => boolean;
  onUpdatePlayerIcon: (profileIconId: ProfileIconId) => void;
  onSelectCharacter: (characterId: CharacterId) => void;
  onUnlockCharacter: (characterId: CharacterId, cost: number) => boolean;
  onPurchaseCharacterPower: (
    characterId: CharacterId,
    power: "healingCharges" | "powerCharges",
    amount: number,
    cost: number,
  ) => boolean;
}

const CHARACTER_UNLOCK_COST = 700;

function formatCompactAmount(value: number): string {
  const absoluteValue = Math.abs(value);

  if (absoluteValue < 10_000) {
    return value.toLocaleString("es-AR");
  }

  const [divisor, suffix] = absoluteValue >= 1_000_000_000
    ? [1_000_000_000, "B"]
    : absoluteValue >= 1_000_000
      ? [1_000_000, "M"]
      : [1_000, "K"];
  const compactValue = value / divisor;
  const maximumFractionDigits = Math.abs(compactValue) >= 100 ? 0 : Math.abs(compactValue) >= 10 ? 1 : 2;

  return `${compactValue.toLocaleString("es-AR", { maximumFractionDigits })}${suffix}`;
}

function formatGameplayTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  return `${minutes} min`;
}

interface LevelSlot {
  number: number;
  levelId?: string;
  name: string;
}

const verdantLevelSlots: LevelSlot[] = [
  { number: 1, levelId: "meadowOutpost", name: "Sendero I" },
  { number: 2, levelId: "meadowOutpost2", name: "Sendero II" },
  { number: 3, levelId: "meadowOutpost3", name: "Sendero III" },
  { number: 4, levelId: "meadowOutpost4", name: "Piedras Errantes I" },
  { number: 5, levelId: "meadowOutpost5", name: "Piedras Errantes II" },
  { number: 6, levelId: "meadowOutpost6", name: "Piedras Errantes III" },
  { number: 7, levelId: "meadowOutpost7", name: "Caceria del Coloso I" },
  { number: 8, levelId: "meadowOutpost8", name: "Caceria del Coloso II" },
  { number: 9, levelId: "meadowOutpost9", name: "Caceria del Coloso III" },
  { number: 10, levelId: "meadowOutpost10", name: "Caceria del Coloso IV" },
];

const enchantedLevelSlots: LevelSlot[] = [
  { number: 1, levelId: "enchantedGrove1", name: "Umbral encantado" },
  { number: 2, levelId: "enchantedGrove2", name: "Raices despiertas" },
  { number: 3, levelId: "enchantedGrove3", name: "Dosel vigilante" },
  { number: 4, levelId: "enchantedGrove4", name: "Senderos cambiantes" },
  { number: 5, levelId: "enchantedGrove5", name: "Corazon del bosque" },
  { number: 6, levelId: "enchantedGrove6", name: "Santuario quebrado" },
  { number: 7, levelId: "enchantedGrove7", name: "Caceria esmeralda I" },
  { number: 8, levelId: "enchantedGrove8", name: "Caceria esmeralda II" },
  { number: 9, levelId: "enchantedGrove9", name: "Caceria esmeralda III" },
  { number: 10, levelId: "enchantedGrove10", name: "Corazon ancestral" },
];

interface RegionDefinition {
  id: string;
  name: string;
  status: string;
  levels: LevelSlot[];
}

const regions: RegionDefinition[] = [
  { id: "verdant-frontier", name: "Frontera Verde", status: "10 niveles", levels: verdantLevelSlots },
  { id: "enchanted-forest", name: "Bosque encantado", status: "10 niveles", levels: enchantedLevelSlots },
  { id: "sunken-marsh", name: "Marisma Hundida", status: "Proximamente", levels: [] },
  { id: "north-spires", name: "Agujas del Norte", status: "Proximamente", levels: [] },
];

const mainActions = [
  { id: "start", label: "Iniciar juego", view: "modes" as const, imageUrl: menuStartButtonUrl },
  { id: "character", label: "Personaje", view: "characters" as const, imageUrl: menuCharacterButtonUrl },
  { id: "inventory", label: "Inventario", view: "inventory" as const, imageUrl: menuInventoryButtonUrl },
  { id: "achievements", label: "Logros", view: "achievements" as const, imageUrl: menuAchievementsButtonUrl },
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
  onResetProgress,
  onStartLevel,
  onUpdatePlayerName,
  onUpdatePlayerIcon,
  onSelectCharacter,
  onUnlockCharacter,
  onPurchaseCharacterPower,
}: MainMenuScreenProps) {
  const [view, setView] = useState<MenuView>(() => save.primaryCharacterId ? "main" : "characters");
  const [inspectedCharacterId, setInspectedCharacterId] = useState<CharacterId>();
  const [activeInventoryCategoryId, setActiveInventoryCategoryId] =
    useState<InventoryCategoryId>("plansKeys");
  const [activeAchievementCategoryId, setActiveAchievementCategoryId] =
    useState<AchievementCategoryId>("adventure");
  const [activeProfileSectionId, setActiveProfileSectionId] = useState<ProfileSectionId>("edit");
  const [activeRegionId, setActiveRegionId] = useState("verdant-frontier");
  const [audioSettings, setAudioSettings] = useState(() => gameAudio.getSettings());
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [isResettingProgress, setIsResettingProgress] = useState(false);
  const [showExploreEntryHint, setShowExploreEntryHint] = useState(false);
  const selectedCharacter = playableCharacters.find((character) => character.id === save.selectedCharacterId)
    ?? playableCharacters[0];
  const playerDisplayName = save.player.displayName
    || playerEmail?.split("@")[0]?.trim()
    || selectedCharacter.name;
  const [isEditingPlayerName, setIsEditingPlayerName] = useState(false);
  const [isChoosingProfileIcon, setIsChoosingProfileIcon] = useState(false);
  const [playerNameDraft, setPlayerNameDraft] = useState(playerDisplayName);
  const [playerNameError, setPlayerNameError] = useState<string>();
  const selectedProfileIcon = getProfileIconDefinition(save.player.profileIconId);
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
  const openProfilePage = () => {
    runMenuAction(() => {
      setIsEditingPlayerName(false);
      setIsChoosingProfileIcon(false);
      setPlayerNameError(undefined);
      setActiveProfileSectionId("edit");
      setView("profile");
    });
  };
  const beginPlayerNameEdit = () => {
    runMenuAction(() => {
      setPlayerNameDraft(playerDisplayName);
      setPlayerNameError(undefined);
      setIsEditingPlayerName(true);
    });
  };
  const submitPlayerName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = playerNameDraft.trim().replace(/\s+/g, " ");
    if (!onUpdatePlayerName(normalizedName)) {
      setPlayerNameError("Usa entre 2 y 20 caracteres.");
      return;
    }

    gameAudio.playUiSelect();
    setPlayerNameDraft(normalizedName);
    setPlayerNameError(undefined);
    setIsEditingPlayerName(false);
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

  const activeRegion = regions.find((region) => region.id === activeRegionId) ?? regions[0];
  const activeLevelSlots = activeRegion.levels;
  const nextPlayableLevelId = useMemo(() => {
    return activeLevelSlots.find((slot) => {
      if (!slot.levelId) {
        return false;
      }

      const isUnlocked = save.unlockedLevels.includes(slot.levelId);
      const isCompleted = save.completedLevels.includes(slot.levelId);
      return isUnlocked && !isCompleted;
    })?.levelId;
  }, [activeLevelSlots, save.completedLevels, save.unlockedLevels]);
  const unlockedAchievementCount = achievementDefinitions.filter((achievement) =>
    save.achievements.unlockedIds.includes(achievement.id),
  ).length;
  const achievementGroups = achievementCategories.map((category) => {
    const achievements = achievementDefinitions.filter((achievement) => achievement.category === category.id);
    const completedCount = achievements.filter((achievement) =>
      save.achievements.unlockedIds.includes(achievement.id),
    ).length;

    return { ...category, achievements, completedCount };
  });
  const averageActionsPerMinute = save.statistics.gameplaySeconds > 0
    ? Math.round(save.statistics.actions / (save.statistics.gameplaySeconds / 60))
    : 0;
  const exploredRegionCount = new Set(
    save.completedLevels.map((levelId) => levelDefinitions[levelId]?.theme).filter(Boolean),
  ).size;
  const defeatedEnemyFamilyCount = new Set(
    save.achievements.defeatedEnemyIds.map((enemyId) => enemyId === "e2m3" ? "m3" : enemyId),
  ).size;
  const successfulRunPercent = save.statistics.runsPlayed > 0
    ? Math.round((save.statistics.completedRuns / save.statistics.runsPlayed) * 100)
    : 0;

  return (
    <section className="overlay overlay--menu">
      <div className={`menu-stage menu-stage--${view}`}>
        <span className="menu-stage__arch menu-stage__arch--left" aria-hidden="true" />
        <span className="menu-stage__arch menu-stage__arch--right" aria-hidden="true" />
        <span className="menu-stage__vista menu-stage__vista--left" aria-hidden="true" />
        <span className="menu-stage__vista menu-stage__vista--right" aria-hidden="true" />
        <div className="menu-shell">
          {view === "main" && (
            <div
              className="home-monument"
              aria-label="Menu principal"
              style={{ "--menu-background-image": `url(${menuBackgroundUrl})` } as CSSProperties}
            >
              <div className="home-monument__topline">
                <button
                  className="menu-player-profile"
                  type="button"
                  aria-label={`Abrir perfil de ${playerDisplayName}`}
                  onClick={openProfilePage}
                >
                  <img src={selectedProfileIcon.imageUrl} alt="" aria-hidden="true" />
                  <strong>{playerDisplayName}</strong>
                </button>
                <span className="session-controls">
                  <span className="menu-player-stats">
                    <span className="menu-player-stat" aria-label={`Nivel ${save.player.level}`}>
                      <svg className="menu-player-stat__icon menu-player-stat__icon--level" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 2.8 15 8l5.8 1.2-4 4.3.6 5.8-5.4-2.4-5.4 2.4.6-5.8-4-4.3L9 8Z" />
                      </svg>
                      <strong>{save.player.level}</strong>
                    </span>
                    <span className="menu-player-stat" aria-label={`${save.player.coins.toLocaleString("es-AR")} ORO`}>
                      <svg className="menu-player-stat__icon menu-player-stat__icon--gold" viewBox="0 0 24 24" aria-hidden="true">
                        <ellipse cx="12" cy="12" rx="8" ry="9" />
                        <path d="M9 8h4.5a2 2 0 0 1 0 4H10a2 2 0 0 0 0 4h5M12 6v12" />
                      </svg>
                      <strong>{formatCompactAmount(save.player.coins)}</strong>
                    </span>
                  </span>
                  <button
                    className="options-gear"
                    type="button"
                    aria-label="Opciones"
                    style={{ "--menu-gear-image": `url(${menuGearUrl})` } as CSSProperties}
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
                    aria-label={action.label}
                    title={action.label}
                    style={{ "--menu-button-image": `url(${action.imageUrl})` } as CSSProperties}
                    onClick={() => runMenuAction(() => setView(action.view))}
                  >
                    <span className="menu-relic__icon" aria-hidden="true" />
                    <span className="menu-relic__label">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === "profile" && (
            <div className="menu-chamber menu-chamber--profile">
              <MenuHeading eyebrow="Perfil del jugador" title="Mi perfil" onBack={() => setView("main")} />

              <div className="profile-screen" aria-label="Perfil del jugador">
                <div className="profile-tabs" role="tablist" aria-label="Secciones del perfil">
                  <button
                    className={`profile-tab${activeProfileSectionId === "edit" ? " profile-tab--active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={activeProfileSectionId === "edit"}
                    onClick={() => runMenuAction(() => setActiveProfileSectionId("edit"))}
                  >
                    <span className="profile-tab__seal" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16v4Zm9-13 4 4M4 20l5-1-4-4-1 5Z" /></svg>
                    </span>
                    <span>Editar perfil</span>
                  </button>
                  <button
                    className={`profile-tab${activeProfileSectionId === "statistics" ? " profile-tab--active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={activeProfileSectionId === "statistics"}
                    onClick={() => runMenuAction(() => setActiveProfileSectionId("statistics"))}
                  >
                    <span className="profile-tab__seal" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M5 20V10h4v10H5Zm6 0V4h4v16h-4Zm6 0v-7h4v7h-4Z" /></svg>
                    </span>
                    <span>Estadísticas</span>
                  </button>
                </div>

                {activeProfileSectionId === "edit" && (
                <section className="profile-section">
                  <header className="profile-section__header">
                    <span className="profile-section__seal" aria-hidden="true">
                      <img src={selectedProfileIcon.imageUrl} alt="" />
                    </span>
                    <div>
                      <h2>Editar perfil</h2>
                      <p>Personaliza cómo te presentas en Adventure Reigns.</p>
                    </div>
                  </header>

                  <div className="profile-editor">
                    <div className="profile-preview">
                      <span className="profile-preview__portrait">
                        <img src={selectedProfileIcon.imageUrl} alt="" aria-hidden="true" />
                      </span>
                      <strong>{playerDisplayName}</strong>
                      <small>LV {save.player.level}</small>
                    </div>

                    <div className="profile-settings">
                      <article className="profile-setting-card">
                        <div className="profile-setting-card__copy">
                          <span>Nombre de usuario</span>
                          {!isEditingPlayerName && <strong>{playerDisplayName}</strong>}
                        </div>
                        {isEditingPlayerName ? (
                          <form className="menu-profile-name-form" onSubmit={submitPlayerName}>
                            <input
                              type="text"
                              value={playerNameDraft}
                              minLength={2}
                              maxLength={20}
                              aria-label="Nuevo nombre de usuario"
                              autoFocus
                              onChange={(event) => {
                                setPlayerNameDraft(event.target.value);
                                setPlayerNameError(undefined);
                              }}
                            />
                            {playerNameError && <small role="alert">{playerNameError}</small>}
                            <span className="menu-profile-name-form__actions">
                              <button type="button" onClick={() => setIsEditingPlayerName(false)}>Cancelar</button>
                              <button type="submit">Guardar</button>
                            </span>
                          </form>
                        ) : (
                          <button className="profile-setting-card__action" type="button" onClick={beginPlayerNameEdit}>
                            Editar
                          </button>
                        )}
                      </article>

                      <article className="profile-setting-card profile-setting-card--readonly">
                        <div className="profile-setting-card__copy">
                          <span>Correo de la cuenta</span>
                          <strong>{playerEmail ?? "No disponible"}</strong>
                        </div>
                      </article>

                      <article className="profile-setting-card profile-setting-card--icon">
                        <div className="profile-setting-card__copy">
                          <span>Icono</span>
                          <strong>Elige tu retrato</strong>
                        </div>
                        <button
                          className="profile-setting-card__action"
                          type="button"
                          onClick={() => runMenuAction(() => setIsChoosingProfileIcon((isChoosing) => !isChoosing))}
                        >
                          {isChoosingProfileIcon ? "Cerrar" : "Elegir"}
                        </button>
                        {isChoosingProfileIcon && (
                          <div className="menu-profile-icon-grid">
                            {profileIconDefinitions.map((icon, index) => (
                              <button
                                className={`menu-profile-icon-choice${icon.id === save.player.profileIconId ? " menu-profile-icon-choice--selected" : ""}`}
                                type="button"
                                key={icon.id}
                                aria-label={`Elegir icono ${index + 1}`}
                                aria-pressed={icon.id === save.player.profileIconId}
                                onClick={() => {
                                  gameAudio.playUiSelect();
                                  onUpdatePlayerIcon(icon.id);
                                }}
                              >
                                <img src={icon.imageUrl} alt="" aria-hidden="true" />
                              </button>
                            ))}
                          </div>
                        )}
                      </article>
                    </div>
                  </div>
                </section>
                )}

                {activeProfileSectionId === "statistics" && (
                  <section className="profile-section profile-section--statistics">
                    <header className="profile-section__header">
                      <span className="profile-section__seal profile-section__seal--chart" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M5 20V10h4v10H5Zm6 0V4h4v16h-4Zm6 0v-7h4v7h-4Z" /></svg>
                      </span>
                      <div>
                        <h2>Estadísticas</h2>
                        <p>Tu recorrido acumulado dentro de los escenarios.</p>
                      </div>
                    </header>

                    <div className="profile-statistics-featured">
                      <article className="profile-stat-card profile-stat-card--featured">
                        <span className="profile-stat-card__icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2M9 3h6" /></svg>
                        </span>
                        <div><span>Tiempo en escenario</span><strong>{formatGameplayTime(save.statistics.gameplaySeconds)}</strong></div>
                      </article>
                      <article className="profile-stat-card profile-stat-card--featured">
                        <span className="profile-stat-card__icon" aria-hidden="true"><AchievementIcon icon="swords" /></span>
                        <div><span>APM promedio</span><strong>{averageActionsPerMinute}</strong></div>
                      </article>
                      <article className="profile-stat-card profile-stat-card--featured">
                        <span className="profile-stat-card__icon" aria-hidden="true"><AchievementIcon icon="claw" /></span>
                        <div><span>Monstruos derrotados</span><strong>{save.achievements.monstersDefeated.toLocaleString("es-AR")}</strong></div>
                      </article>
                      <article className="profile-stat-card profile-stat-card--featured">
                        <span className="profile-stat-card__icon" aria-hidden="true"><AchievementIcon icon="coin" /></span>
                        <div><span>ORO recogido</span><strong>{save.achievements.goldCollected.toLocaleString("es-AR")}</strong></div>
                      </article>
                    </div>

                    <div className="profile-statistics-group">
                      <header><h3>Progreso de aventura</h3><span>{successfulRunPercent}% de recorridos completados</span></header>
                      <div className="profile-statistics-grid">
                        <article className="profile-stat-card">
                          <span className="profile-stat-card__icon" aria-hidden="true"><AchievementIcon icon="flag" /></span>
                          <div><span>Niveles únicos</span><strong>{save.completedLevels.length}</strong></div>
                        </article>
                        <article className="profile-stat-card">
                          <span className="profile-stat-card__icon" aria-hidden="true"><AchievementIcon icon="map" /></span>
                          <div><span>Regiones exploradas</span><strong>{exploredRegionCount}</strong></div>
                        </article>
                        <article className="profile-stat-card">
                          <span className="profile-stat-card__icon" aria-hidden="true"><AchievementIcon icon="trophy" /></span>
                          <div><span>Logros</span><strong>{unlockedAchievementCount}/{achievementDefinitions.length}</strong></div>
                        </article>
                        <article className="profile-stat-card">
                          <span className="profile-stat-card__icon" aria-hidden="true"><AchievementIcon icon="shield" /></span>
                          <div><span>Niveles perfectos</span><strong>{save.achievements.flawlessLevelIds.length}</strong></div>
                        </article>
                        <article className="profile-stat-card">
                          <span className="profile-stat-card__icon" aria-hidden="true"><AchievementIcon icon="chest" /></span>
                          <div><span>Cajas abiertas</span><strong>{save.claimedRewardBoxes.length}</strong></div>
                        </article>
                        <article className="profile-stat-card">
                          <span className="profile-stat-card__icon" aria-hidden="true"><AchievementIcon icon="checkpoint" /></span>
                          <div><span>Checkpoints únicos</span><strong>{save.achievements.activatedCheckpointIds.length}</strong></div>
                        </article>
                        <article className="profile-stat-card">
                          <span className="profile-stat-card__icon" aria-hidden="true"><AchievementIcon icon="claw" /></span>
                          <div><span>Familias descubiertas</span><strong>{defeatedEnemyFamilyCount}/4</strong></div>
                        </article>
                        <article className="profile-stat-card">
                          <span className="profile-stat-card__icon" aria-hidden="true"><AchievementIcon icon="swords" /></span>
                          <div><span>Mejor cacería</span><strong>{save.achievements.mostEnemiesDefeatedInLevel}</strong></div>
                        </article>
                      </div>
                    </div>

                    <div className="profile-statistics-group">
                      <header><h3>Recorridos</h3><span>Actividad registrada desde esta actualización</span></header>
                      <div className="profile-statistics-grid profile-statistics-grid--runs">
                        <article className="profile-stat-card"><div><span>Intentos jugados</span><strong>{save.statistics.runsPlayed}</strong></div></article>
                        <article className="profile-stat-card"><div><span>Metas alcanzadas</span><strong>{save.statistics.completedRuns}</strong></div></article>
                        <article className="profile-stat-card"><div><span>Derrotas</span><strong>{save.statistics.defeats}</strong></div></article>
                        <article className="profile-stat-card"><div><span>Acciones registradas</span><strong>{save.statistics.actions.toLocaleString("es-AR")}</strong></div></article>
                      </div>
                    </div>
                  </section>
                )}
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

              <section className="account-settings" aria-label="Cuenta y progreso">
                <div className="account-settings__header">
                  <span>Cuenta</span>
                  {playerEmail && <strong>{playerEmail}</strong>}
                </div>
                <div className="account-settings__actions">
                  <button
                    className="account-action account-action--signout"
                    type="button"
                    onClick={() => runMenuAction(onSignOut)}
                  >
                    <span>Salir de la cuenta</span>
                    <small>Cierra la sesion sin borrar el progreso.</small>
                  </button>
                  <button
                    className="account-action account-action--reset"
                    type="button"
                    onClick={() => {
                      gameAudio.playUiSelect();
                      setShowResetConfirmation(true);
                    }}
                  >
                    <span>Reiniciar juego</span>
                    <small>Borra todo el progreso y vuelve al inicio.</small>
                  </button>
                </div>
              </section>

              {showResetConfirmation && (
                <div className="reset-confirmation" role="dialog" aria-modal="true" aria-label="Confirmar reinicio del juego">
                  <span className="reset-confirmation__warning" aria-hidden="true">!</span>
                  <div className="reset-confirmation__copy">
                    <strong>¿Reiniciar todo el juego?</strong>
                    <p>
                      Se borrarán ORO, inventario, niveles, cajas, logros, personaje seleccionado y cargas de todos los héroes. La cuenta de acceso seguirá existiendo.
                    </p>
                  </div>
                  <div className="reset-confirmation__actions">
                    <button
                      type="button"
                      disabled={isResettingProgress}
                      onClick={() => {
                        gameAudio.playUiSelect();
                        setShowResetConfirmation(false);
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      className="reset-confirmation__confirm"
                      type="button"
                      disabled={isResettingProgress}
                      onClick={async () => {
                        setIsResettingProgress(true);
                        await onResetProgress();
                        setIsResettingProgress(false);
                        setShowResetConfirmation(false);
                        setView("characters");
                      }}
                    >
                      {isResettingProgress ? "Reiniciando..." : "Borrar progreso"}
                    </button>
                  </div>
                </div>
              )}
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

          {view === "achievements" && (
            <div className="menu-chamber menu-chamber--achievements">
              <MenuHeading eyebrow="Progreso" title="Logros" onBack={() => setView("main")} />

              <div className="achievement-screen" aria-label="Logros del jugador">
                <div className="achievement-summary">
                  <span className="achievement-summary__icon" aria-hidden="true">
                    <AchievementIcon icon="trophy" />
                  </span>
                  <div className="achievement-summary__count">
                    <strong>{unlockedAchievementCount}/{achievementDefinitions.length}</strong>
                    <span>Completados</span>
                  </div>
                  <span className="achievement-summary__track" aria-hidden="true">
                    <span style={{ width: `${Math.round((unlockedAchievementCount / achievementDefinitions.length) * 100)}%` }} />
                  </span>
                </div>

                <div className="achievement-tabs" role="tablist" aria-label="Categorias de logros">
                  {achievementGroups.map((category) => {
                    const isActive = category.id === activeAchievementCategoryId;
                    return (
                      <button
                        className={`achievement-tab${isActive ? " achievement-tab--active" : ""}`}
                        id={`achievement-tab-${category.id}`}
                        type="button"
                        role="tab"
                        aria-controls={`achievement-page-${category.id}`}
                        aria-selected={isActive}
                        key={category.id}
                        onClick={() => runMenuAction(() => setActiveAchievementCategoryId(category.id))}
                      >
                        <span className="achievement-tab__seal" aria-hidden="true">
                          <AchievementIcon icon={category.icon} />
                        </span>
                        <span>{category.name}</span>
                        <strong>{category.completedCount}/{category.achievements.length}</strong>
                      </button>
                    );
                  })}
                </div>

                <div className="achievement-pages">
                  {achievementGroups.map((category) => (
                    <section
                      className={`achievement-category achievement-page${
                        category.id === activeAchievementCategoryId ? " achievement-page--active" : ""
                      }`}
                      id={`achievement-page-${category.id}`}
                      role="tabpanel"
                      aria-labelledby={`achievement-tab-${category.id}`}
                      key={category.id}
                      hidden={category.id !== activeAchievementCategoryId}
                    >
                      <header className="achievement-category__header">
                        <span aria-hidden="true"><AchievementIcon icon={category.icon} /></span>
                        <h2>{category.name}</h2>
                        <strong>{category.completedCount}/{category.achievements.length}</strong>
                      </header>
                      <div className="achievement-grid">
                        {category.achievements.map((achievement) => {
                            const isUnlocked = save.achievements.unlockedIds.includes(achievement.id);
                            const progress = achievement.getProgress(save);
                            const progressPercent = Math.round((progress / achievement.target) * 100);
                            return (
                              <article
                                className={`achievement-card${isUnlocked ? " achievement-card--completed" : ""}`}
                                key={achievement.id}
                              >
                                <div className="achievement-card__emblem" aria-hidden="true">
                                  <span className="achievement-card__seal">
                                    <AchievementIcon icon={achievement.icon} />
                                  </span>
                                  <span className="achievement-card__difficulty">
                                    {Array.from(
                                      { length: achievement.difficulty === "medium" ? 2 : 1 },
                                      (_bolt, index) => (
                                        <span className="achievement-card__bolt" key={index}>
                                          <svg viewBox="0 0 24 24" focusable="false">
                                            <path d="M13.8 2 5.5 13h5.8L10.2 22l8.3-11h-5.8L13.8 2Z" />
                                          </svg>
                                        </span>
                                      ),
                                    )}
                                  </span>
                                </div>
                                <span
                                  className="achievement-card__status"
                                  aria-label={isUnlocked ? "Completado" : "Bloqueado"}
                                  title={isUnlocked ? "Completado" : "Bloqueado"}
                                >
                                  <AchievementIcon icon={isUnlocked ? "check" : "lock"} />
                                </span>
                                <div className="achievement-card__copy">
                                  <h3>{achievement.title}</h3>
                                  <p>{achievement.description}</p>
                                  <span className="achievement-card__reward">
                                    Recompensa: {getAchievementRewardLabels(achievement.reward).join(" + ")}
                                  </span>
                                </div>
                                <div className="achievement-card__footer">
                                  <span className="achievement-card__progress" aria-label={`${progress} de ${achievement.target}`}>
                                    <span style={{ width: `${progressPercent}%` }} />
                                  </span>
                                  <small>{progress}/{achievement.target}</small>
                                </div>
                              </article>
                            );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === "characters" && (
            <div className="menu-chamber menu-chamber--characters">
              {inspectedCharacterId ? (
                <CharacterDetail
                  characterId={inspectedCharacterId}
                  save={save}
                  onBack={() => setInspectedCharacterId(undefined)}
                  onPurchase={onPurchaseCharacterPower}
                  onUnlock={onUnlockCharacter}
                />
              ) : (
                <>
                  <MenuHeading
                    title={save.primaryCharacterId ? "Elegir heroe" : "Escoge tu personaje principal"}
                    onBack={() => setView("main")}
                    hideBack={!save.primaryCharacterId}
                    centered={!save.primaryCharacterId}
                    animatedTitle={!save.primaryCharacterId}
                  />

                  <div className="character-list" aria-label="Personajes disponibles">
                    {playableCharacters.map((character) => {
                      const isSelected = Boolean(
                        save.primaryCharacterId && character.id === save.selectedCharacterId,
                      );
                      const isChoosingPrimary = !save.primaryCharacterId;
                      const isUnlocked = isChoosingPrimary || save.unlockedCharacterIds.includes(character.id);
                      return (
                        <article
                          className={`character-card character-card--${character.id}${
                            isSelected ? " character-card--selected" : ""
                          }${isUnlocked ? "" : " character-card--locked"}`}
                          key={character.id}
                          data-character-id={character.id}
                        >
                          <button
                            className="character-card__select"
                            type="button"
                            aria-label={`Seleccionar a ${character.name}`}
                            aria-pressed={isSelected}
                            disabled={!isUnlocked}
                            onClick={() => runMenuAction(() => {
                              onSelectCharacter(character.id);
                              if (isChoosingPrimary) {
                                setShowExploreEntryHint(true);
                                setView("modes");
                              }
                            })}
                          />
                          {!isChoosingPrimary && (
                            <button
                              className="character-card__view"
                              type="button"
                              onClick={() => runMenuAction(() => setInspectedCharacterId(character.id))}
                            >
                              Ver
                            </button>
                          )}
                          <img
                            className="character-card__portrait"
                            src={character.portraitUrl}
                            alt=""
                          />
                          <span className="character-card__veil" aria-hidden="true" />
                          <span className="character-card__identity">
                            <strong>{character.name}</strong>
                          </span>
                          {!isUnlocked && <span className="character-card__lock" aria-hidden="true">700</span>}
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {view === "modes" && (
            <div className="menu-chamber menu-chamber--modes">
              <MenuHeading eyebrow="Modos de juego" title="Seleccion" onBack={() => setView("main")} />

              <div className="mode-grid">
                <button
                  className={`mode-tile mode-tile--active${showExploreEntryHint ? " mode-tile--entry-hint" : ""}`}
                  type="button"
                  onAnimationEnd={(event) => {
                    if (event.animationName === "explore-mode-entry-hint") {
                      setShowExploreEntryHint(false);
                    }
                  }}
                  onClick={() => runMenuAction(() => setView("explore"))}
                >
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
                <section className="map-column" aria-label="Regiones del continente">
                  <div className="map-column__header">
                    <span>Mapa de regiones</span>
                    <strong>{regions.length} regiones</strong>
                  </div>

                  <div className="map-scroll" role="region" aria-label="Desplazar mapa de regiones" tabIndex={0}>
                    <div className="continent-map">
                      <span className="continent-map__compass" aria-hidden="true" />
                      {regions.map((region, index) => (
                        <button
                          className={`region-piece region-piece--${index + 1}${
                            region.id === activeRegion.id ? " region-piece--active" : ""
                          }${region.id === "enchanted-forest" ? " region-piece--enchanted" : ""}`}
                          type="button"
                          key={region.id}
                          disabled={region.levels.length === 0}
                          onClick={() => runMenuAction(() => setActiveRegionId(region.id))}
                        >
                          <span>{region.name}</span>
                          <strong>{region.status}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section
                  className={`level-column level-column--${activeRegion.id}`}
                  aria-label={`Niveles de ${activeRegion.name}`}
                >
                  <div className="level-column__header">
                    <span>{activeRegion.name}</span>
                    <strong>{activeLevelSlots.length} {activeLevelSlots.length === 1 ? "nivel" : "niveles"}</strong>
                  </div>

                  <div
                    className="level-list"
                    role="region"
                    aria-label={`Desplazar niveles de ${activeRegion.name}`}
                    tabIndex={0}
                  >
                    {activeLevelSlots.map((slot) => {
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
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CharacterDetail({
  characterId,
  save,
  onBack,
  onPurchase,
  onUnlock,
}: {
  characterId: CharacterId;
  save: SaveData;
  onBack: () => void;
  onPurchase: MainMenuScreenProps["onPurchaseCharacterPower"];
  onUnlock: MainMenuScreenProps["onUnlockCharacter"];
}) {
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string>();
  const [pendingPurchase, setPendingPurchase] = useState<{
    power: PurchasablePower;
    pack: PowerPackage;
  }>();
  const [showUnlockConfirmation, setShowUnlockConfirmation] = useState(false);
  const character = playableCharacters.find((candidate) => candidate.id === characterId);
  if (!character) {
    return null;
  }

  const powerCharges = save.characterPowerCharges[characterId];
  const isUnlocked = save.unlockedCharacterIds.includes(characterId);
  const requestPackage = (power: PurchasablePower, pack: PowerPackage) => {
    gameAudio.playUiSelect();
    setPurchaseMessage(undefined);
    setPendingPurchase({ power, pack });
  };
  const confirmPurchase = () => {
    if (!pendingPurchase) {
      return;
    }

    gameAudio.playUiSelect();
    const { power, pack } = pendingPurchase;
    const purchased = onPurchase(characterId, power, pack.amount, pack.cost);
    setPurchaseMessage(
      purchased
        ? `Compra realizada: +${pack.amount} ${power === "healingCharges" ? "regeneraciones" : "ataques letales"}.`
        : "No tienes suficiente ORO.",
    );
    setPendingPurchase(undefined);
  };

  return (
    <>
      <MenuHeading eyebrow="Ficha de heroe" title={character.name} onBack={onBack} backLabel="Heroes" />
      <section className="character-detail" aria-label={`Poderes disponibles de ${character.name}`}>
        <div className="character-detail__portrait-frame">
          <img src={character.portraitUrl} alt={character.name} />
          <strong>{character.name}</strong>
        </div>
        <div className="character-detail__content">
          {isUnlocked ? (
            <button
              className="character-shop-trigger"
              type="button"
              aria-expanded={isShopOpen}
              onClick={() => {
                gameAudio.playUiSelect();
                setPurchaseMessage(undefined);
                setPendingPurchase(undefined);
                setIsShopOpen((isOpen) => !isOpen);
              }}
            >
              <span className="character-shop-trigger__coin" aria-hidden="true">O</span>
              <span>{isShopOpen ? "Cerrar tienda" : "Comprar poderes"}</span>
              <ShopIcon />
              <strong>{save.player.coins} ORO</strong>
            </button>
          ) : (
            <button
              className="character-unlock-trigger"
              type="button"
              disabled={save.player.coins < CHARACTER_UNLOCK_COST}
              onClick={() => {
                gameAudio.playUiSelect();
                setShowUnlockConfirmation(true);
              }}
            >
              <span className="character-shop-trigger__coin" aria-hidden="true">O</span>
              <span>Desbloquear a {character.name}</span>
              <strong>{CHARACTER_UNLOCK_COST} ORO</strong>
            </button>
          )}

          {isUnlocked && isShopOpen ? (
            <div className="character-shop" aria-label={`Tienda de poderes para ${character.name}`}>
              <PowerPackageGroup
                title="Regenerador de vida"
                power="healingCharges"
                packages={powerPackages.healingCharges}
                coins={save.player.coins}
                onBuy={requestPackage}
              />
              <PowerPackageGroup
                title="Ataque letal"
                power="powerCharges"
                packages={powerPackages.powerCharges}
                coins={save.player.coins}
                onBuy={requestPackage}
              />
              {pendingPurchase && (
                <div className="purchase-confirmation" role="dialog" aria-modal="true" aria-label="Confirmar compra">
                  <span className="purchase-confirmation__icon" aria-hidden="true">
                    <AbilityIcon type={pendingPurchase.power === "healingCharges" ? "heal" : "power"} />
                  </span>
                  <div className="purchase-confirmation__copy">
                    <strong>Confirmar compra</strong>
                    <span>
                      +{pendingPurchase.pack.amount} {pendingPurchase.power === "healingCharges" ? "regeneraciones" : "ataques letales"} para {character.name}
                    </span>
                    <b>{pendingPurchase.pack.cost} ORO</b>
                  </div>
                  <div className="purchase-confirmation__actions">
                    <button
                      className="purchase-confirmation__cancel"
                      type="button"
                      onClick={() => {
                        gameAudio.playUiSelect();
                        setPendingPurchase(undefined);
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      className="purchase-confirmation__confirm"
                      type="button"
                      onClick={confirmPurchase}
                    >
                      Confirmar compra
                    </button>
                  </div>
                </div>
              )}
              {purchaseMessage && <p className="character-shop__message" role="status">{purchaseMessage}</p>}
            </div>
          ) : (
            <div className="character-detail__powers">
              <article className="character-detail__power character-detail__power--heal">
                <span className="character-detail__power-icon">
                  <AbilityIcon type="heal" />
                </span>
                <span>Regeneraciones disponibles</span>
                <strong>{powerCharges.healingCharges}</strong>
              </article>
              <article className="character-detail__power character-detail__power--lethal">
                <span className="character-detail__power-icon">
                  <AbilityIcon type="power" />
                </span>
                <span>Poderes letales disponibles</span>
                <strong>{powerCharges.powerCharges}</strong>
              </article>
            </div>
          )}
          {showUnlockConfirmation && !isUnlocked && (
            <div className="purchase-confirmation" role="dialog" aria-modal="true" aria-label="Confirmar desbloqueo">
              <span className="purchase-confirmation__icon" aria-hidden="true">700</span>
              <div className="purchase-confirmation__copy">
                <strong>Desbloquear a {character.name}</strong>
                <span>El personaje quedara disponible permanentemente en esta cuenta.</span>
                <b>{CHARACTER_UNLOCK_COST} ORO</b>
              </div>
              <div className="purchase-confirmation__actions">
                <button
                  className="purchase-confirmation__cancel"
                  type="button"
                  onClick={() => {
                    gameAudio.playUiSelect();
                    setShowUnlockConfirmation(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="purchase-confirmation__confirm"
                  type="button"
                  onClick={() => {
                    gameAudio.playUiSelect();
                    const unlocked = onUnlock(characterId, CHARACTER_UNLOCK_COST);
                    setShowUnlockConfirmation(false);
                    setPurchaseMessage(unlocked ? `${character.name} fue desbloqueado.` : "No tienes suficiente ORO.");
                  }}
                >
                  Confirmar desbloqueo
                </button>
              </div>
            </div>
          )}
          {purchaseMessage && !isShopOpen && <p className="character-shop__message" role="status">{purchaseMessage}</p>}
        </div>
      </section>
    </>
  );
}

function PowerPackageGroup({
  title,
  power,
  packages,
  coins,
  onBuy,
}: {
  title: string;
  power: PurchasablePower;
  packages: PowerPackage[];
  coins: number;
  onBuy: (power: PurchasablePower, pack: PowerPackage) => void;
}) {
  return (
    <section className={`power-package-group power-package-group--${power}`}>
      <div className="power-package-group__title">
        <AbilityIcon type={power === "healingCharges" ? "heal" : "power"} />
        <strong>{title}</strong>
      </div>
      <div className="power-package-list">
        {packages.map((pack) => (
          <button
            className="power-package"
            type="button"
            key={pack.amount}
            disabled={coins < pack.cost}
            onClick={() => onBuy(power, pack)}
            aria-label={`Comprar ${pack.amount} por ${pack.cost} ORO`}
          >
            <span>+{pack.amount}</span>
            <strong>{pack.cost}</strong>
            <small>ORO</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function ShopIcon() {
  return (
    <svg className="character-shop-trigger__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 7H7" />
      <circle cx="10" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  );
}

function MenuHeading({
  eyebrow,
  title,
  onBack,
  backLabel = "Volver",
  hideBack = false,
  centered = false,
  animatedTitle = false,
}: {
  eyebrow?: string;
  title: string;
  onBack: () => void;
  backLabel?: string;
  hideBack?: boolean;
  centered?: boolean;
  animatedTitle?: boolean;
}) {
  return (
    <div className={`menu-heading${centered ? " menu-heading--centered" : ""}${animatedTitle ? " menu-heading--shimmer" : ""}`}>
      <div>
        {eyebrow && <span className="panel__eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {!hideBack && (
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
      )}
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
