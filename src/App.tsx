import { useEffect, useState } from "react";
import { gameEvents } from "./game/events/EventBus";
import { createGame } from "./game/main";
import { EVENTS } from "./shared/constants/events";
import type { GameScreen, HudState } from "./shared/types/game";
import { HUD } from "./ui/components/HUD";
import { MobileControls } from "./ui/components/MobileControls";
import { OrientationNotice } from "./ui/components/OrientationNotice";
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

export function App() {
  const [screen, setScreen] = useState<GameScreen>("main-menu");
  const [hud, setHud] = useState<HudState>(initialHud);

  useEffect(() => {
    const game = createGame("game-root");
    return () => {
      game.destroy(true);
    };
  }, []);

  useEffect(() => {
    const offHud = gameEvents.on(EVENTS.HUD_UPDATED, setHud);
    const offScreen = gameEvents.on(EVENTS.SCREEN_CHANGED, setScreen);
    return () => {
      offHud();
      offScreen();
    };
  }, []);

  const startGame = () => gameEvents.emit(EVENTS.START_GAME, undefined);
  const resumeGame = () => gameEvents.emit(EVENTS.RESUME_GAME, undefined);
  const restartGame = () => gameEvents.emit(EVENTS.RESTART_GAME, undefined);
  const goToMenu = () => gameEvents.emit(EVENTS.GO_TO_MENU, undefined);

  return (
    <main className="app-shell">
      <div id="game-root" className="game-root" />
      {(screen === "playing" || screen === "paused") && <HUD hud={hud} />}
      {(screen === "playing" || screen === "paused") && <OrientationNotice />}
      {screen === "playing" && <MobileControls />}
      {screen === "main-menu" && <MainMenuScreen onStart={startGame} />}
      {screen === "paused" && (
        <PauseScreen onResume={resumeGame} onRestart={restartGame} onMenu={goToMenu} />
      )}
      {screen === "game-over" && (
        <GameOverScreen onRestart={restartGame} onMenu={goToMenu} />
      )}
      {screen === "victory" && (
        <VictoryScreen hud={hud} onRestart={restartGame} onMenu={goToMenu} />
      )}
    </main>
  );
}
