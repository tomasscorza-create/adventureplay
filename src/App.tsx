import { useEffect, useState } from "react";
import { gameEvents } from "./game/events/EventBus";
import {
  canChooseInitialCharacter,
  getNextCharacterUnlockRequirement,
} from "./game/data/characterUnlocks";
import type { PowerPackage, PurchasablePower } from "./game/data/powerShop";
import { createGame } from "./game/main";
import { gameSaveStore } from "./game/systems/save/GameSaveStore";
import { normalizePlayerDisplayName } from "./game/systems/save/SaveDefaults";
import type { AchievementIconId, AchievementReward } from "./game/data/achievements";
import type { LevelRewardDefinition } from "./game/data/progression";
import { gameAudio } from "./shared/audio/GameAudio";
import { EVENTS } from "./shared/constants/events";
import { MOBILE_GAMEPLAY_QUERY } from "./shared/constants/game";
import type {
  AchievementId,
  CharacterId,
  GameScreen,
  HudState,
  LevelCompletionSummary,
  ProfileIconId,
  SaveData,
} from "./shared/types/game";
import { AchievementUnlockToast } from "./ui/components/AchievementUnlockToast";
import { LevelUpToast } from "./ui/components/LevelUpToast";
import { HUD } from "./ui/components/HUD";
import { AbilityControls } from "./ui/components/AbilityControls";
import { MobileControls } from "./ui/components/MobileControls";
import { OrientationNotice } from "./ui/components/OrientationNotice";
import { PwaUpdatePrompt } from "./ui/components/PwaUpdatePrompt";
import { PwaInstallPrompt } from "./ui/components/PwaInstallPrompt";
import { SaveSyncStatus } from "./ui/components/SaveSyncStatus";
import { useGameSession } from "./ui/hooks/useGameSession";
import { AuthScreen } from "./ui/screens/AuthScreen";
import { GameOverScreen } from "./ui/screens/GameOverScreen";
import { MainMenuScreen } from "./ui/screens/MainMenuScreen";
import { LevelSummaryScreen } from "./ui/screens/LevelSummaryScreen";
import { PauseScreen } from "./ui/screens/PauseScreen";
import { PowerShopScreen } from "./ui/screens/PowerShopScreen";
import { VictoryScreen } from "./ui/screens/VictoryScreen";

const initialHud: HudState = {
  stageNumber: 1,
  health: 4,
  maxHealth: 4,
  level: 1,
  experience: 0,
  experienceToNextLevel: 100,
  coins: 0,
  healingCharges: 3,
  powerCharges: 5,
  timeRemaining: 90,
  timeLimit: 90,
  progressPercent: 0,
};

type ProgressNotification = {
  key: string;
  kind: "achievement";
  id: AchievementId;
  title: string;
  icon: AchievementIconId;
  reward: AchievementReward;
} | {
  key: string;
  kind: "level-up";
  level: number;
  reward?: LevelRewardDefinition;
};

const PROGRESS_NOTIFICATION_DURATION_MS = 4600;
function useMobileGameplayControls() {
  const [usesMobileControls, setUsesMobileControls] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(MOBILE_GAMEPLAY_QUERY).matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_GAMEPLAY_QUERY);
    const syncControls = () => setUsesMobileControls(mediaQuery.matches);

    syncControls();
    mediaQuery.addEventListener("change", syncControls);
    return () => mediaQuery.removeEventListener("change", syncControls);
  }, []);

  return usesMobileControls;
}

export function App() {
  const [screen, setScreen] = useState<GameScreen>("main-menu");
  const [hud, setHud] = useState<HudState>(initialHud);
  const [healthPickupFeedback, setHealthPickupFeedback] = useState({ sequence: 0, restored: 0 });
  const [damageFeedbackSequence, setDamageFeedbackSequence] = useState(0);
  const [progressQueue, setProgressQueue] = useState<ProgressNotification[]>([]);
  const [levelSummary, setLevelSummary] = useState<LevelCompletionSummary>();
  const [activePowerShop, setActivePowerShop] = useState<PurchasablePower>();
  const [activeLevelId, setActiveLevelId] = useState("meadowOutpost");
  const {
    authError,
    authNotice,
    authStatus,
    isSupabaseConfigured,
    playerEmail,
    resetProgress: resetSessionProgress,
    retrySaveSync,
    save,
    saveSyncError,
    saveSyncState,
    setSave,
    signIn,
    signOut: signOutSession,
    signUp,
  } = useGameSession();
  const usesMobileGameplayControls = useMobileGameplayControls();

  useEffect(() => {
    const game = createGame("game-root");
    return () => {
      game.destroy(true);
    };
  }, []);

  useEffect(() => {
    if (authStatus === "signed-out") {
      setScreen("main-menu");
    }
  }, [authStatus]);

  useEffect(() => {
    const offHud = gameEvents.on(EVENTS.HUD_UPDATED, setHud);
    const offHealthPickup = gameEvents.on(EVENTS.HEALTH_PICKUP_COLLECTED, ({ restored }) => {
      setHealthPickupFeedback((current) => ({
        sequence: current.sequence + 1,
        restored,
      }));
    });
    const offPlayerDamaged = gameEvents.on(EVENTS.PLAYER_DAMAGED, () => {
      setDamageFeedbackSequence((current) => current + 1);
    });
    const offAchievementUnlocked = gameEvents.on(EVENTS.ACHIEVEMENT_UNLOCKED, (achievement) => {
      const notification: ProgressNotification = {
        ...achievement,
        key: `achievement:${achievement.id}`,
        kind: "achievement",
      };
      setProgressQueue((current) => (
        current.some((queued) => queued.key === notification.key)
          ? current
          : [...current, notification]
      ));
    });
    const offPlayerLeveledUp = gameEvents.on(EVENTS.PLAYER_LEVELED_UP, ({ level, reward }) => {
      const notification: ProgressNotification = {
        key: `level-up:${level}`,
        kind: "level-up",
        level,
        reward,
      };
      setProgressQueue((current) => (
        current.some((queued) => queued.key === notification.key)
          ? current
          : [...current, notification]
      ));
    });
    const offActiveLevelChanged = gameEvents.on(EVENTS.ACTIVE_LEVEL_CHANGED, ({ levelId }) => {
      setActiveLevelId(levelId);
    });
    const offScreen = gameEvents.on(EVENTS.SCREEN_CHANGED, (nextScreen) => {
      setScreen(nextScreen);
      if (nextScreen !== "level-transition") {
        setLevelSummary(undefined);
      }
      if (nextScreen !== "power-shop") {
        setActivePowerShop(undefined);
      }
      if (nextScreen !== "playing" && nextScreen !== "paused") {
        setHealthPickupFeedback({ sequence: 0, restored: 0 });
      }
    });
    const offCompleted = gameEvents.on(EVENTS.LEVEL_COMPLETED, (summary) => {
      setLevelSummary(summary);
      setSave(gameSaveStore.load());
    });
    return () => {
      offHud();
      offHealthPickup();
      offPlayerDamaged();
      offAchievementUnlocked();
      offPlayerLeveledUp();
      offActiveLevelChanged();
      offScreen();
      offCompleted();
    };
  }, [setSave]);

  const activeNotification = progressQueue[0];
  const activeAchievement = activeNotification?.kind === "achievement"
    ? activeNotification
    : undefined;

  useEffect(() => {
    if (!activeNotification) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setProgressQueue((current) => current.slice(1));
    }, PROGRESS_NOTIFICATION_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [activeNotification]);

  const signOut = async () => {
    gameAudio.playUiSelect();
    if (!await signOutSession()) {
      return;
    }

    gameEvents.emit(EVENTS.GO_TO_MENU, undefined);
  };
  const resetProgress = async () => {
    gameAudio.playUiSelect();
    const freshSave = await resetSessionProgress();
    if (!freshSave) {
      return;
    }

    setHud(initialHud);
    setScreen("main-menu");
    gameEvents.emit(EVENTS.GO_TO_MENU, undefined);
  };

  const startGame = (levelId: string) => {
    const currentSave = gameSaveStore.load();
    if (
      authStatus !== "signed-in" ||
      !currentSave.primaryCharacterId ||
      !currentSave.unlockedCharacterIds.includes(currentSave.selectedCharacterId)
    ) {
      return;
    }

    setSave(currentSave);
    setActiveLevelId(levelId);
    gameEvents.emit(EVENTS.START_GAME, { levelId });
  };
  const selectCharacter = (characterId: CharacterId) => {
    const currentSave = gameSaveStore.load();
    const isChoosingPrimary = !currentSave.primaryCharacterId;
    if (
      (isChoosingPrimary && !canChooseInitialCharacter(characterId))
      || (!isChoosingPrimary && !currentSave.unlockedCharacterIds.includes(characterId))
    ) {
      return;
    }

    const nextSave: SaveData = {
      ...currentSave,
      selectedCharacterId: characterId,
      primaryCharacterId: currentSave.primaryCharacterId ?? characterId,
      unlockedCharacterIds: isChoosingPrimary
        ? [characterId]
        : currentSave.unlockedCharacterIds,
    };
    gameSaveStore.save(nextSave);
    setSave(nextSave);
  };
  const updatePlayerName = (displayName: string): boolean => {
    const normalizedName = normalizePlayerDisplayName(displayName);
    if (!normalizedName) {
      return false;
    }

    const nextSave = structuredClone(gameSaveStore.load());
    nextSave.player.displayName = normalizedName;
    gameSaveStore.save(nextSave);
    setSave(nextSave);
    return true;
  };
  const updatePlayerIcon = (profileIconId: ProfileIconId) => {
    const nextSave = structuredClone(gameSaveStore.load());
    nextSave.player.profileIconId = profileIconId;
    gameSaveStore.save(nextSave);
    setSave(nextSave);
  };
  const unlockCharacter = (characterId: CharacterId): boolean => {
    const currentSave = gameSaveStore.load();
    const requirement = getNextCharacterUnlockRequirement(currentSave.unlockedCharacterIds);
    if (
      !currentSave.primaryCharacterId ||
      currentSave.unlockedCharacterIds.includes(characterId) ||
      currentSave.player.level < requirement.requiredLevel ||
      currentSave.player.coins < requirement.cost
    ) {
      return false;
    }

    const nextSave = structuredClone(currentSave);
    nextSave.player.coins -= requirement.cost;
    nextSave.unlockedCharacterIds.push(characterId);
    gameSaveStore.save(nextSave);
    setSave(nextSave);
    return true;
  };
  const purchaseCharacterPower = (
    characterId: CharacterId,
    power: "healingCharges" | "powerCharges",
    amount: number,
    cost: number,
  ): boolean => {
    const currentSave = gameSaveStore.load();
    if (currentSave.player.coins < cost) {
      return false;
    }

    const nextSave = structuredClone(currentSave);
    nextSave.player.coins -= cost;
    nextSave.characterPowerCharges[characterId][power] += amount;
    gameSaveStore.save(nextSave);
    setSave(nextSave);
    return true;
  };
  const resumeGame = () => {
    gameAudio.playUiSelect();
    gameEvents.emit(EVENTS.RESUME_GAME, undefined);
  };
  const restartGame = () => {
    gameAudio.playUiSelect();
    gameEvents.emit(EVENTS.RESTART_GAME, { levelId: activeLevelId });
  };
  const goToMenu = () => {
    gameAudio.playUiSelect();
    gameEvents.emit(EVENTS.GO_TO_MENU, undefined);
    setSave(gameSaveStore.load());
  };
  const continueAfterSummary = () => {
    if (!levelSummary) {
      return;
    }

    gameAudio.playUiSelect();
    gameEvents.emit(EVENTS.CONTINUE_LEVEL, {
      completedLevelId: levelSummary.levelId,
      nextLevelId: levelSummary.nextLevelId,
    });
  };
  const openPowerShop = (power: PurchasablePower) => {
    gameAudio.playUiSelect();
    setSave(gameSaveStore.load());
    setActivePowerShop(power);
    gameEvents.emit(EVENTS.PAUSE_FOR_POWER_SHOP, undefined);
  };
  const purchasePowerDuringGame = (pack: PowerPackage): boolean => {
    if (!activePowerShop) {
      return false;
    }

    const currentSave = gameSaveStore.load();
    return purchaseCharacterPower(
      currentSave.selectedCharacterId,
      activePowerShop,
      pack.amount,
      pack.cost,
    );
  };
  const continueFromPowerShop = () => {
    gameAudio.playUiSelect();
    gameEvents.emit(EVENTS.RESUME_GAME, undefined);
  };

  const needsAuth = authStatus !== "signed-in";

  return (
    <main className="app-shell">
      <div id="game-root" className="game-root" />
      {damageFeedbackSequence > 0 && (
        <div
          key={`damage-feedback-${damageFeedbackSequence}`}
          className="damage-screen-flash"
          aria-hidden="true"
        />
      )}
      {!needsAuth && activeNotification && (
        screen === "playing" || screen === "paused" || screen === "level-transition"
      ) && (
        activeNotification.kind === "achievement" ? (
          <AchievementUnlockToast
            key={activeNotification.key}
            icon={activeNotification.icon}
            title={activeNotification.title}
            reward={activeNotification.reward}
          />
        ) : (
          <LevelUpToast
            key={activeNotification.key}
            level={activeNotification.level}
            reward={activeNotification.reward}
          />
        )
      )}
      {!needsAuth && (screen === "playing" || screen === "paused") && (
        <HUD
          hud={hud}
          healthPickupFeedback={healthPickupFeedback}
          achievementReward={activeAchievement?.reward}
          rewardFeedbackKey={activeAchievement?.id}
        />
      )}
      {!needsAuth && screen === "playing" && !usesMobileGameplayControls && (
        <AbilityControls
          hud={hud}
          achievementReward={activeAchievement?.reward}
          rewardFeedbackKey={activeAchievement?.id}
          onOpenShop={openPowerShop}
        />
      )}
      {!needsAuth && (screen === "playing" || screen === "paused") && <OrientationNotice />}
      {!needsAuth && screen === "playing" && usesMobileGameplayControls && (
        <MobileControls
          hud={hud}
          achievementReward={activeAchievement?.reward}
          rewardFeedbackKey={activeAchievement?.id}
        />
      )}
      {!needsAuth && screen === "main-menu" && (
        <MainMenuScreen
          playerEmail={playerEmail}
          save={save}
          onSignOut={signOut}
          onResetProgress={resetProgress}
          onStartLevel={startGame}
          onUpdatePlayerName={updatePlayerName}
          onUpdatePlayerIcon={updatePlayerIcon}
          onSelectCharacter={selectCharacter}
          onUnlockCharacter={unlockCharacter}
          onPurchaseCharacterPower={purchaseCharacterPower}
        />
      )}
      {!needsAuth && screen === "paused" && (
        <PauseScreen onResume={resumeGame} onRestart={restartGame} onMenu={goToMenu} />
      )}
      {!needsAuth && screen === "game-over" && (
        <GameOverScreen onRestart={restartGame} onMenu={goToMenu} />
      )}
      {!needsAuth && screen === "level-transition" && levelSummary && (
        <LevelSummaryScreen summary={levelSummary} onContinue={continueAfterSummary} />
      )}
      {!needsAuth && screen === "power-shop" && activePowerShop && (
        <PowerShopScreen
          power={activePowerShop}
          save={save}
          onPurchase={purchasePowerDuringGame}
          onContinue={continueFromPowerShop}
          onMenu={goToMenu}
        />
      )}
      {!needsAuth && screen === "victory" && (
        <VictoryScreen hud={hud} onRestart={restartGame} onMenu={goToMenu} />
      )}
      {needsAuth && (
        <AuthScreen
          disabled={!isSupabaseConfigured}
          error={authError}
          notice={authNotice}
          isLoading={authStatus === "checking" || authStatus === "loading-save"}
          onSignIn={signIn}
          onSignUp={signUp}
        />
      )}
      <SaveSyncStatus
        state={saveSyncState}
        error={saveSyncError}
        quiet={screen === "playing" || screen === "paused"}
        onRetry={retrySaveSync}
      />
      <PwaInstallPrompt
        visible={needsAuth || screen === "main-menu" || screen === "game-over" || screen === "victory"}
      />
      <PwaUpdatePrompt />
    </main>
  );
}
