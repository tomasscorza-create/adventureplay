import { useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent, PointerEvent, WheelEvent } from "react";
import menuBackgroundUrl from "../../assets/menu/menu-background.webp";
import menuAchievementsButtonUrl from "../../assets/menu/menu-achievements.webp";
import menuCharacterButtonUrl from "../../assets/menu/menu-character.webp";
import menuGearUrl from "../../assets/menu/menu-gear.webp";
import menuInventoryButtonUrl from "../../assets/menu/menu-inventory.webp";
import menuStartButtonUrl from "../../assets/menu/menu-start.webp";
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
import { gameMusic } from "../../shared/music/GameMusic";
import { gameSfx } from "../../shared/sfx/GameSfx";
import type { CharacterId, ProfileIconId, SaveData } from "../../shared/types/game";
import { AchievementIcon } from "../components/AchievementIcon";
import { AchievementsView } from "./main-menu/AchievementsView";
import { CharacterDetail } from "./main-menu/CharacterDetail";
import { ExploreView } from "./main-menu/ExploreView";
import { InventoryView } from "./main-menu/InventoryView";
import { KeyboardBindingsView } from "./main-menu/KeyboardBindingsView";
import { MenuHeading, SettingToggle, VolumeControl } from "./main-menu/MenuPrimitives";
import { MobileGameplaySettingsView } from "./main-menu/MobileGameplaySettingsView";
import {
  formatCompactAmount,
  formatGameplayTime,
  getCarouselOffset,
} from "./main-menu/menuUtils";

type MenuView = "main" | "profile" | "modes" | "explore" | "characters" | "inventory" | "achievements" | "options" | "audio" | "commands" | "mobile-controls";
type ProfileSectionId = "edit" | "statistics";

interface MainMenuScreenProps {
  playerEmail?: string;
  save: SaveData;
  onSignOut: () => void;
  showDesktopCommandSettings: boolean;
  onResetProgress: () => Promise<void>;
  onStartLevel: (levelId: string) => void;
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
const mainActions = [
  { id: "start", label: "Iniciar juego", view: "modes" as const, imageUrl: menuStartButtonUrl },
  { id: "character", label: "Personaje", view: "characters" as const, imageUrl: menuCharacterButtonUrl },
  { id: "inventory", label: "Inventario", view: "inventory" as const, imageUrl: menuInventoryButtonUrl },
  { id: "achievements", label: "Logros", view: "achievements" as const, imageUrl: menuAchievementsButtonUrl },
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
  const [inspectedCharacterId, setInspectedCharacterId] = useState<CharacterId>();
  const [activeProfileSectionId, setActiveProfileSectionId] = useState<ProfileSectionId>("edit");
  const [activeRegionId, setActiveRegionId] = useState("verdant-frontier");
  const [previewRegionId, setPreviewRegionId] = useState<string>();
  const [audioSettings, setAudioSettings] = useState({
    soundEnabled: gameSfx.isEnabled(),
    musicEnabled: gameMusic.isEnabled(),
    soundVolume: gameSfx.getVolume(),
    musicVolume: gameMusic.getVolume(),
  });
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
  const toggleSound = () => {
    const soundEnabled = gameSfx.setEnabled(!gameSfx.isEnabled());
    setAudioSettings((current) => ({
      ...current,
      soundEnabled,
    }));
  };
  const toggleMusic = () => {
    const musicEnabled = gameMusic.setEnabled(!gameMusic.isEnabled());
    setAudioSettings((current) => ({
      ...current,
      musicEnabled,
    }));
  };
  const setSoundVolume = (volume: number) => {
    const soundVolume = gameSfx.setVolume(volume);
    setAudioSettings((current) => ({ ...current, soundVolume }));
  };
  const setMusicVolume = (volume: number) => {
    const musicVolume = gameMusic.setVolume(volume);
    setAudioSettings((current) => ({ ...current, musicVolume }));
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
              <div className="menu-ambience" aria-hidden="true">
                <span className="menu-ambience__glint menu-ambience__glint--one" />
                <span className="menu-ambience__glint menu-ambience__glint--two" />
                {Array.from({ length: 6 }, (_, index) => (
                  <span className={`menu-ambience__leaf menu-ambience__leaf--${index + 1}`} key={index} />
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

              <button
                className="settings-entry"
                type="button"
                onClick={() => setView("audio")}
              >
                <span className="settings-entry__icon" aria-hidden="true">♪</span>
                <span className="settings-entry__copy">
                  <strong>Sonido y musica</strong>
                  <small>Volumen, musica y efectos del juego.</small>
                </span>
                <span className="settings-entry__arrow" aria-hidden="true">›</span>
              </button>

              {showDesktopCommandSettings && (
                <button
                  className="settings-entry"
                  type="button"
                  onClick={() => setView("commands")}
                >
                  <span className="settings-entry__icon" aria-hidden="true">⌨</span>
                  <span className="settings-entry__copy">
                    <strong>Comandos</strong>
                    <small>Personaliza teclas primarias y secundarias.</small>
                  </span>
                  <span className="settings-entry__arrow" aria-hidden="true">›</span>
                </button>
              )}

              {!showDesktopCommandSettings && (
                <button
                  className="settings-entry"
                  type="button"
                  onClick={() => setView("mobile-controls")}
                >
                  <span className="settings-entry__icon" aria-hidden="true">✥</span>
                  <span className="settings-entry__copy">
                    <strong>Controles moviles</strong>
                    <small>Tipo de comando, posicion, vibracion y rendimiento.</small>
                  </span>
                  <span className="settings-entry__arrow" aria-hidden="true">›</span>
                </button>
              )}

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

          {view === "audio" && (
            <div className="menu-chamber menu-chamber--options menu-chamber--audio">
              <MenuHeading
                title="Sonido y música"
                variant="audio"
                onBack={() => setView("options")}
              />

              <div className="settings-panel settings-panel--audio" aria-label="Configuracion de sonido y musica">
                <section className="audio-setting-card" aria-label="Configuracion de sonido">
                  <SettingToggle
                    label="Sonido"
                    description="Efectos medievales de interfaz, combate y progreso."
                    enabled={audioSettings.soundEnabled}
                    onToggle={toggleSound}
                  />
                  <VolumeControl
                    label="Sonido"
                    value={audioSettings.soundVolume}
                    onChange={setSoundVolume}
                  />
                </section>

                <section className="audio-setting-card" aria-label="Configuracion de musica">
                  <SettingToggle
                    label="Musica"
                    description="Musica medieval adaptada a menus y dificultad."
                    enabled={audioSettings.musicEnabled}
                    onToggle={toggleMusic}
                  />
                  <VolumeControl
                    label="Musica"
                    value={audioSettings.musicVolume}
                    onChange={setMusicVolume}
                  />
                </section>
              </div>
            </div>
          )}

          {view === "commands" && showDesktopCommandSettings && (
            <div className="menu-chamber menu-chamber--options menu-chamber--commands">
              <MenuHeading title="Comandos" variant="settings" onBack={() => setView("options")} />
              <KeyboardBindingsView />
            </div>
          )}

          {view === "mobile-controls" && !showDesktopCommandSettings && (
            <div className="menu-chamber menu-chamber--mobile-settings">
              <MenuHeading title="Controles moviles" variant="settings" onBack={() => setView("options")} />
              <MobileGameplaySettingsView />
            </div>
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
            <ExploreView
              save={save}
              activeRegionId={activeRegionId}
              previewRegionId={previewRegionId}
              onActiveRegionChange={setActiveRegionId}
              onPreviewRegionChange={setPreviewRegionId}
              onBack={() => setView("modes")}
              onStartLevel={onStartLevel}
            />
          )}
        </div>
      </div>
    </section>
  );
}

