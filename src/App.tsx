import { useEffect, useState } from "react";
import { gameEvents } from "./game/events/EventBus";
import { createGame } from "./game/main";
import { gameSaveStore } from "./game/systems/save/GameSaveStore";
import { SupabaseSaveAdapter } from "./game/systems/save/SupabaseSaveAdapter";
import { createDefaultSave } from "./game/systems/save/SaveDefaults";
import { gameAudio } from "./shared/audio/GameAudio";
import { EVENTS } from "./shared/constants/events";
import { isSupabaseConfigured, supabase } from "./shared/supabase/client";
import type { CharacterId, GameScreen, HudState, SaveData } from "./shared/types/game";
import { HUD } from "./ui/components/HUD";
import { MobileControls } from "./ui/components/MobileControls";
import { OrientationNotice } from "./ui/components/OrientationNotice";
import { AuthScreen } from "./ui/screens/AuthScreen";
import { GameOverScreen } from "./ui/screens/GameOverScreen";
import { MainMenuScreen } from "./ui/screens/MainMenuScreen";
import { PauseScreen } from "./ui/screens/PauseScreen";
import { VictoryScreen } from "./ui/screens/VictoryScreen";

const initialHud: HudState = {
  health: 3,
  maxHealth: 3,
  level: 1,
  experience: 0,
  experienceToNextLevel: 100,
  coins: 0,
  timeRemaining: 90,
  timeLimit: 90,
  progressPercent: 0,
};

type AuthStatus = "checking" | "signed-out" | "loading-save" | "signed-in";

export function App() {
  const [screen, setScreen] = useState<GameScreen>("main-menu");
  const [hud, setHud] = useState<HudState>(initialHud);
  const [save, setSave] = useState<SaveData>(() => createDefaultSave());
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authError, setAuthError] = useState<string>();
  const [playerEmail, setPlayerEmail] = useState<string>();

  useEffect(() => {
    const game = createGame("game-root");
    return () => {
      game.destroy(true);
    };
  }, []);

  useEffect(() => {
    const offHud = gameEvents.on(EVENTS.HUD_UPDATED, setHud);
    const offScreen = gameEvents.on(EVENTS.SCREEN_CHANGED, setScreen);
    const offCompleted = gameEvents.on(EVENTS.LEVEL_COMPLETED, () => {
      setSave(gameSaveStore.load());
    });
    return () => {
      offHud();
      offScreen();
      offCompleted();
    };
  }, []);

  useEffect(() => {
    gameSaveStore.onError((error) => {
      console.error("Could not persist game save", error);
      setAuthError("No se pudo sincronizar el progreso. Revisa Supabase local.");
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      gameSaveStore.disconnect();
      setAuthStatus("signed-out");
      setAuthError("Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
      return;
    }

    const activeSupabase = supabase;
    let isActive = true;

    const loadSessionSave = async (sessionUserId?: string, email?: string) => {
      if (!sessionUserId) {
        gameSaveStore.disconnect();
        if (!isActive) {
          return;
        }

        setPlayerEmail(undefined);
        setSave(createDefaultSave());
        setScreen("main-menu");
        setAuthStatus("signed-out");
        return;
      }

      setAuthStatus("loading-save");
      setAuthError(undefined);

      try {
        const nextSave = await gameSaveStore.connect(new SupabaseSaveAdapter(activeSupabase, sessionUserId));
        if (!isActive) {
          return;
        }

        setPlayerEmail(email);
        setSave(nextSave);
        setAuthStatus("signed-in");
      } catch (error) {
        console.error("Could not load remote game save", error);
        if (!isActive) {
          return;
        }

        setAuthError("No se pudo cargar el progreso remoto. Inicia Supabase local y reintenta.");
        setAuthStatus("signed-out");
      }
    };

    activeSupabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setAuthError(error.message);
        setAuthStatus("signed-out");
        return;
      }

      void loadSessionSave(data.session?.user.id, data.session?.user.email);
    });

    const { data } = activeSupabase.auth.onAuthStateChange((_event, session) => {
      void loadSessionSave(session?.user.id, session?.user.email);
    });

    return () => {
      isActive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return;
    }

    setAuthStatus("loading-save");
    setAuthError(undefined);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error) {
      return;
    }

    if (error.message.toLowerCase().includes("invalid login credentials")) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (!signUpError) {
        return;
      }

      setAuthError(signUpError.message);
      setAuthStatus("signed-out");
      return;
    }

    setAuthError(error.message);
    setAuthStatus("signed-out");
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      return;
    }

    setAuthStatus("loading-save");
    setAuthError(undefined);
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setAuthError(error.message);
      setAuthStatus("signed-out");
    }
  };

  const signOut = async () => {
    gameAudio.playUiSelect();
    await gameSaveStore.flush();
    await supabase?.auth.signOut();
    gameEvents.emit(EVENTS.GO_TO_MENU, undefined);
  };

  const startGame = (levelId = "meadowOutpost") => {
    if (authStatus !== "signed-in") {
      return;
    }

    setSave(gameSaveStore.load());
    gameEvents.emit(EVENTS.START_GAME, { levelId });
  };
  const selectCharacter = (characterId: CharacterId) => {
    const currentSave = gameSaveStore.load();
    const nextSave = { ...currentSave, selectedCharacterId: characterId };
    gameSaveStore.save(nextSave);
    setSave(nextSave);
  };
  const resumeGame = () => {
    gameAudio.playUiSelect();
    gameEvents.emit(EVENTS.RESUME_GAME, undefined);
  };
  const restartGame = () => {
    gameAudio.playUiSelect();
    gameEvents.emit(EVENTS.RESTART_GAME, undefined);
  };
  const goToMenu = () => {
    gameAudio.playUiSelect();
    setSave(gameSaveStore.load());
    gameEvents.emit(EVENTS.GO_TO_MENU, undefined);
  };

  const needsAuth = authStatus !== "signed-in";

  return (
    <main className="app-shell">
      <div id="game-root" className="game-root" />
      {!needsAuth && (screen === "playing" || screen === "paused") && <HUD hud={hud} />}
      {!needsAuth && (screen === "playing" || screen === "paused") && <OrientationNotice />}
      {!needsAuth && screen === "playing" && <MobileControls />}
      {!needsAuth && screen === "main-menu" && (
        <MainMenuScreen
          playerEmail={playerEmail}
          save={save}
          onSignOut={signOut}
          onStartLevel={startGame}
          onSelectCharacter={selectCharacter}
        />
      )}
      {!needsAuth && screen === "paused" && (
        <PauseScreen onResume={resumeGame} onRestart={restartGame} onMenu={goToMenu} />
      )}
      {!needsAuth && screen === "game-over" && (
        <GameOverScreen onRestart={restartGame} onMenu={goToMenu} />
      )}
      {!needsAuth && screen === "victory" && (
        <VictoryScreen hud={hud} onRestart={restartGame} onMenu={goToMenu} />
      )}
      {needsAuth && (
        <AuthScreen
          disabled={!isSupabaseConfigured}
          error={authError}
          isLoading={authStatus === "checking" || authStatus === "loading-save"}
          onSignIn={signIn}
          onSignUp={signUp}
        />
      )}
    </main>
  );
}
