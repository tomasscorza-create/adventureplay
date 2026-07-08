import { useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, PointerEvent, ReactElement, WheelEvent } from "react";
import modeExploreUrl from "../../assets/menu/mode-explore.webp";
import { achievementDefinitions } from "../../game/data/achievements";
import {
  canChooseInitialCharacter,
  getNextCharacterUnlockRequirement,
  initialCharacterIds,
} from "../../game/data/characterUnlocks";
import { playableCharacters } from "../../game/data/characters";
import { levelDefinitions } from "../../game/data/levels";
import { getProfileIconDefinition, profileIconDefinitions } from "../../game/data/profileIcons";
import type { CharacterId, ProfileIconId, SaveData } from "../../shared/types/game";
import type { CoopSessionInfo } from "../../game/events/EventBus";
import { AchievementIcon } from "../components/AchievementIcon";
import { AchievementsView } from "./main-menu/AchievementsView";
import { CharacterDetail } from "./main-menu/CharacterDetail";
import { ChallengeView } from "./main-menu/ChallengeView";
import { CoopLobby, type CoopLobbyMode } from "./main-menu/CoopLobby";
import { ExploreView } from "./main-menu/ExploreView";
import { InventoryView } from "./main-menu/InventoryView";
import { MenuHeading } from "./main-menu/MenuPrimitives";
import {
  AudioSettingsPage,
  ControlSettingsPage,
  SettingsNavigationEntries,
} from "./settings/SettingsPages";
import {
  formatCompactAmount,
  formatGameplayTime,
  getCarouselOffset,
} from "./main-menu/menuUtils";

type MenuView = "main" | "profile" | "modes" | "explore" | "challenge" | "characters" | "inventory" | "achievements" | "options" | "audio" | "commands" | "mobile-controls" | "coop";
type ProfileSectionId = "edit" | "statistics";

interface MainMenuScreenProps {
  playerEmail?: string;
  save: SaveData;
  onSignOut: () => void;
  showDesktopCommandSettings: boolean;
  onResetProgress: () => Promise<void>;
  onStartLevel: (levelId: string, coop?: CoopSessionInfo) => void;
  onUpdatePlayerName: (displayName: string) => boolean;
  onUpdatePlayerIcon: (profileIconId: ProfileIconId) => void;
  onSelectCharacter: (characterId: CharacterId) => void;
  onUnlockCharacter: (characterId: CharacterId) => boolean;
  onPurchaseCharacterPower: (
    characterId: CharacterId,
    power: "healingCharges" | "powerCharges",
    amount: number,
    cost: number,
  ) => boolean;
}
interface MainAction {
  id: string;
  label: string;
  view: MenuView;
  icon: ReactElement;
}

const mainActions: MainAction[] = [
  {
    id: "start",
    label: "Iniciar juego",
    view: "modes",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.6 14 7l4.6.5-3.4 3.1.9 4.6L12 12.9l-4.1 2.3.9-4.6L5.4 7.5 10 7Z" />
        <path d="M12 15.6v5.8M8.6 21.4h6.8" />
      </svg>
    ),
  },
  {
    id: "character",
    label: "Personaje",
    view: "characters",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.4c3.3 0 5.6 2.3 5.6 5.5v2.4H6.4V8.9c0-3.2 2.3-5.5 5.6-5.5Z" />
        <path d="M6.4 11.3 5 14.6h4.4l.9-3.3M17.6 11.3l1.4 3.3h-4.4l-.9-3.3M12 11.3v5.1M9.4 20.6c.5-2.2 1.4-3.3 2.6-3.3s2.1 1.1 2.6 3.3" />
      </svg>
    ),
  },
  {
    id: "inventory",
    label: "Inventario",
    view: "inventory",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.4 9.4h15.2v10H4.4Zm1.2-4.8h12.8l1.2 4.8H4.4Z" />
        <path d="M9.8 9.4v3.4h4.4V9.4M11 15.6h2" />
      </svg>
    ),
  },
  {
    id: "achievements",
    label: "Logros",
    view: "achievements",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.2 3.6h7.6v4.6c0 3.8-1.9 6.6-3.8 6.6s-3.8-2.8-3.8-6.6Z" />
        <path d="M8.2 5.4H4.6v1.8c0 2.8 1.8 4.6 4.4 4.8M15.8 5.4h3.6v1.8c0 2.8-1.8 4.6-4.4 4.8M12 14.8v3.4M8.4 20.6h7.2" />
      </svg>
    ),
  },
];

export function MainMenuScreen({
  playerEmail,
  save,
  onSignOut,
  showDesktopCommandSettings,
  onResetProgress,
  onStartLevel,
  onUpdatePlayerName,
  onUpdatePlayerIcon,
  onSelectCharacter,
  onUnlockCharacter,
  onPurchaseCharacterPower,
}: MainMenuScreenProps) {
  const [view, setView] = useState<MenuView>(() => save.primaryCharacterId ? "main" : "characters");
  const [coopMode, setCoopMode] = useState<CoopLobbyMode>("challenge");
  const [inspectedCharacterId, setInspectedCharacterId] = useState<CharacterId>();
  const [activeProfileSectionId, setActiveProfileSectionId] = useState<ProfileSectionId>("edit");
  const [activeRegionId, setActiveRegionId] = useState("verdant-frontier");
  const [previewRegionId, setPreviewRegionId] = useState<string>();
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [isResettingProgress, setIsResettingProgress] = useState(false);
  const [showExploreEntryHint, setShowExploreEntryHint] = useState(false);
  const [activeCharacterId, setActiveCharacterId] = useState<CharacterId>(save.selectedCharacterId);
  const characterSwipeStartX = useRef<number | undefined>(undefined);
  const characterSwipeConsumed = useRef(false);
  const characterWheelLockedUntil = useRef(0);
  const selectedCharacter = playableCharacters.find((character) => character.id === save.selectedCharacterId)
    ?? playableCharacters[0];
  const carouselCharacters = useMemo(() => {
    const initialOrder = [
      ...initialCharacterIds
        .map((characterId) => playableCharacters.find((character) => character.id === characterId))
        .filter((character) => character !== undefined),
      ...playableCharacters.filter(
        (character) => !canChooseInitialCharacter(character.id),
      ),
    ];
    if (!save.primaryCharacterId) {
      return initialOrder;
    }
    return [
      ...initialOrder.filter((character) => save.unlockedCharacterIds.includes(character.id)),
      ...initialOrder.filter((character) => !save.unlockedCharacterIds.includes(character.id)),
    ];
  }, [save.primaryCharacterId, save.unlockedCharacterIds]);
  const activeCharacterIndex = Math.max(
    0,
    carouselCharacters.findIndex((character) => character.id === activeCharacterId),
  );
  const nextCharacterUnlockRequirement = getNextCharacterUnlockRequirement(
    save.unlockedCharacterIds,
  );
  const playerDisplayName = save.player.displayName
    || playerEmail?.split("@")[0]?.trim()
    || selectedCharacter.name;
  const [isEditingPlayerName, setIsEditingPlayerName] = useState(false);
  const [isChoosingProfileIcon, setIsChoosingProfileIcon] = useState(false);
  const [playerNameDraft, setPlayerNameDraft] = useState(playerDisplayName);
  const [playerNameError, setPlayerNameError] = useState<string>();
  const selectedProfileIcon = getProfileIconDefinition(save.player.profileIconId);
  const runMenuAction = (action: () => void) => {
    action();
  };
  const moveCharacterCarousel = (direction: -1 | 1) => {
    const nextIndex = (
      activeCharacterIndex + direction + carouselCharacters.length
    ) % carouselCharacters.length;
    setActiveCharacterId(carouselCharacters[nextIndex].id);
  };
  const showCharacterInCarousel = (index: number) => {
    if (index === activeCharacterIndex) {
      return;
    }
    setActiveCharacterId(carouselCharacters[index].id);
  };
  const handleCharacterCarouselWheel = (event: WheelEvent<HTMLDivElement>) => {
    const now = performance.now();
    if (now < characterWheelLockedUntil.current) {
      return;
    }
    const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;
    if (Math.abs(dominantDelta) < 12) {
      return;
    }
    characterWheelLockedUntil.current = now + 320;
    moveCharacterCarousel(dominantDelta > 0 ? 1 : -1);
  };
  const handleCharacterCarouselKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    moveCharacterCarousel(event.key === "ArrowRight" ? 1 : -1);
  };
  const handleCharacterPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    characterSwipeStartX.current = event.clientX;
    characterSwipeConsumed.current = false;
  };
  const handleCharacterPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const startX = characterSwipeStartX.current;
    characterSwipeStartX.current = undefined;
    if (startX === undefined) {
      return;
    }
    const distance = event.clientX - startX;
    if (Math.abs(distance) >= 44) {
      characterSwipeConsumed.current = true;
      moveCharacterCarousel(distance < 0 ? 1 : -1);
      window.setTimeout(() => {
        characterSwipeConsumed.current = false;
      }, 0);
    }
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

    setPlayerNameDraft(normalizedName);
    setPlayerNameError(undefined);
    setIsEditingPlayerName(false);
  };

  const averageActionsPerMinute = save.statistics.gameplaySeconds > 0
    ? Math.round(save.statistics.actions / (save.statistics.gameplaySeconds / 60))
    : 0;
  const unlockedAchievementCount = achievementDefinitions.filter((achievement) =>
    save.achievements.unlockedIds.includes(achievement.id),
  ).length;
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
        <div className="menu-shell">
          {view === "main" && (
            <div className="home-monument" aria-label="Menu principal">
              <div className="menu-ambience" aria-hidden="true">
                <span className="menu-ambience__glint menu-ambience__glint--one" />
                <span className="menu-ambience__glint menu-ambience__glint--two" />
                {Array.from({ length: 6 }, (_, index) => (
                  <span className={`menu-ambience__mote menu-ambience__mote--${index + 1}`} key={index} />
                ))}
              </div>
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
                        <circle cx="12" cy="12" r="8.4" />
                        <circle cx="12" cy="12" r="4.9" />
                        <path d="M12 9.7 13.9 12 12 14.3 10.1 12 12 9.7Z" />
                      </svg>
                      <strong>{formatCompactAmount(save.player.coins)}</strong>
                    </span>
                  </span>
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
                    <span className="menu-relic__icon" aria-hidden="true">{action.icon}</span>
                    <span className="menu-relic__label">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === "profile" && (
            <div className="menu-chamber menu-chamber--profile">
              <MenuHeading title="Mi perfil" variant="profile" onBack={() => setView("main")} />

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
              <MenuHeading title="Ajustes" variant="settings" onBack={() => setView("main")} />

              <SettingsNavigationEntries
                showDesktopCommandSettings={showDesktopCommandSettings}
                onOpenAudio={() => setView("audio")}
                onOpenControls={() => setView(showDesktopCommandSettings ? "commands" : "mobile-controls")}
              />

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

          {view === "audio" && <AudioSettingsPage onBack={() => setView("options")} />}

          {view === "commands" && showDesktopCommandSettings && (
            <ControlSettingsPage showDesktopCommandSettings onBack={() => setView("options")} />
          )}

          {view === "mobile-controls" && !showDesktopCommandSettings && (
            <ControlSettingsPage
              showDesktopCommandSettings={false}
              onBack={() => setView("options")}
            />
          )}

          {view === "inventory" && <InventoryView save={save} onBack={() => setView("main")} />}

          {view === "achievements" && <AchievementsView save={save} onBack={() => setView("main")} />}

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
                    title={save.primaryCharacterId ? "Héroes" : "Elige tu héroe"}
                    variant="heroes"
                    onBack={() => setView("main")}
                    hideBack={!save.primaryCharacterId}
                    animatedTitle={!save.primaryCharacterId}
                  />

                  <div
                    className="character-carousel"
                    role="region"
                    aria-roledescription="carrusel"
                    aria-label="Personajes disponibles"
                    tabIndex={0}
                    onWheel={handleCharacterCarouselWheel}
                    onKeyDown={handleCharacterCarouselKeyDown}
                  >
                    <button
                      className="character-carousel__arrow character-carousel__arrow--previous"
                      type="button"
                      aria-label="Mostrar heroe anterior"
                      onClick={() => moveCharacterCarousel(-1)}
                    >
                      <span aria-hidden="true">‹</span>
                    </button>
                    <div
                      className="character-carousel__stage"
                      onPointerDown={handleCharacterPointerDown}
                      onPointerUp={handleCharacterPointerUp}
                      onPointerCancel={() => {
                        characterSwipeStartX.current = undefined;
                        characterSwipeConsumed.current = false;
                      }}
                    >
                    {carouselCharacters.map((character, index) => {
                      const isSelected = Boolean(
                        save.primaryCharacterId && character.id === save.selectedCharacterId,
                      );
                      const isChoosingPrimary = !save.primaryCharacterId;
                      const isUnlocked = isChoosingPrimary
                        ? canChooseInitialCharacter(character.id)
                        : save.unlockedCharacterIds.includes(character.id);
                      const carouselOffset = getCarouselOffset(
                        index,
                        activeCharacterIndex,
                        carouselCharacters.length,
                      );
                      const carouselPosition = carouselOffset === 0
                        ? "active"
                        : carouselOffset === -1
                          ? "previous"
                          : carouselOffset === 1
                            ? "next"
                            : carouselOffset < 0
                              ? "far-previous"
                              : "far-next";
                      const isActive = carouselOffset === 0;
                      return (
                        <article
                          className={`character-card character-card--${character.id}${
                            isSelected ? " character-card--selected" : ""
                          }${isUnlocked ? "" : " character-card--locked"} character-card--carousel-${carouselPosition}`}
                          key={character.id}
                          data-character-id={character.id}
                          aria-hidden={!isActive}
                        >
                          <button
                            className="character-card__select"
                            type="button"
                            aria-label={isActive ? `Seleccionar a ${character.name}` : `Mostrar a ${character.name}`}
                            aria-pressed={isSelected}
                            disabled={isActive && !isUnlocked}
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => {
                              if (characterSwipeConsumed.current) {
                                characterSwipeConsumed.current = false;
                                return;
                              }
                              runMenuAction(() => {
                                if (!isActive) {
                                  setActiveCharacterId(character.id);
                                  return;
                                }
                                onSelectCharacter(character.id);
                                if (isChoosingPrimary) {
                                  setShowExploreEntryHint(true);
                                  setView("modes");
                                }
                              });
                            }}
                          />
                          {!isChoosingPrimary && isActive && (
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
                          {!isUnlocked && (
                            <span className="character-card__lock-emblem" aria-hidden="true">
                              <svg viewBox="0 0 64 64">
                                <path d="M18 29v-8c0-8 6-14 14-14s14 6 14 14v8" />
                                <rect x="12" y="27" width="40" height="31" rx="8" />
                                <circle cx="32" cy="41" r="4" />
                                <path d="M32 45v6" />
                              </svg>
                            </span>
                          )}
                          <span className="character-card__identity">
                            <strong>{character.name}</strong>
                          </span>
                          {!isUnlocked && isActive && (
                            <span className="character-card__lock" aria-hidden="true">
                              {isChoosingPrimary
                                ? "Bloqueado"
                                : `LV ${nextCharacterUnlockRequirement.requiredLevel} · ${formatCompactAmount(nextCharacterUnlockRequirement.cost)}`}
                            </span>
                          )}
                        </article>
                      );
                    })}
                    </div>
                    <button
                      className="character-carousel__arrow character-carousel__arrow--next"
                      type="button"
                      aria-label="Mostrar siguiente heroe"
                      onClick={() => moveCharacterCarousel(1)}
                    >
                      <span aria-hidden="true">›</span>
                    </button>
                    <div className="character-carousel__dots" aria-label="Posicion del carrusel">
                      {carouselCharacters.map((character, index) => (
                        <button
                          className={index === activeCharacterIndex ? "character-carousel__dot character-carousel__dot--active" : "character-carousel__dot"}
                          type="button"
                          key={character.id}
                          aria-label={`Mostrar a ${character.name}`}
                          aria-current={index === activeCharacterIndex ? "true" : undefined}
                          onClick={() => showCharacterInCarousel(index)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {view === "modes" && (
            <div className="menu-chamber menu-chamber--modes">
              <MenuHeading title="Modos de juego" variant="modes" onBack={() => setView("main")} />

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
                  <img className="mode-tile__art" src={modeExploreUrl} alt="" aria-hidden="true" />
                  <span>Explorar</span>
                  <strong>Campana del continente</strong>
                </button>
                <button
                  className="mode-tile mode-tile--active mode-tile--challenge"
                  type="button"
                  onClick={() => runMenuAction(() => setView("challenge"))}
                >
                  <span className="mode-tile__sigil" aria-hidden="true" />
                  <span>Desafio</span>
                  <strong>Las camaras antiguas</strong>
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
            <ExploreView
              save={save}
              activeRegionId={activeRegionId}
              previewRegionId={previewRegionId}
              onActiveRegionChange={setActiveRegionId}
              onPreviewRegionChange={setPreviewRegionId}
              onBack={() => setView("modes")}
              onStartLevel={onStartLevel}
              onOpenCoop={() => runMenuAction(() => { setCoopMode("explore"); setView("coop"); })}
            />
          )}

          {view === "challenge" && (
            <ChallengeView
              save={save}
              onBack={() => setView("modes")}
              onStartLevel={onStartLevel}
              onOpenCoop={() => runMenuAction(() => { setCoopMode("challenge"); setView("coop"); })}
            />
          )}

          {view === "coop" && (
            <CoopLobby
              save={save}
              mode={coopMode}
              onBack={() => setView(coopMode === "explore" ? "explore" : "challenge")}
              onStartLevel={onStartLevel}
            />
          )}
        </div>
      </div>
    </section>
  );
}

