import Phaser from "phaser";
import { EVENTS } from "../../shared/constants/events";
import { levelDefinitions } from "../data/levels";
import { gameEvents } from "../events/EventBus";

export class GameOverScene extends Phaser.Scene {
  private unbindRestart?: () => void;
  private unbindMenu?: () => void;

  constructor() {
    super("GameOverScene");
  }

  create(data: { result?: "defeat" | "victory"; restartLevelId?: string }): void {
    const sceneRestartLevelId = data.restartLevelId && levelDefinitions[data.restartLevelId]
      ? data.restartLevelId
      : undefined;
    this.cameras.main.setBackgroundColor(data.result === "victory" ? "#10291f" : "#23111a");
    gameEvents.emit(EVENTS.SCREEN_CHANGED, data.result === "victory" ? "victory" : "game-over");

    this.unbindRestart = gameEvents.on(EVENTS.RESTART_GAME, ({ levelId }) => {
      const restartLevelId = levelDefinitions[levelId] ? levelId : sceneRestartLevelId;
      if (!restartLevelId) {
        this.scene.start("MainMenuScene");
        return;
      }
      this.scene.start("LevelScene", { levelId: restartLevelId });
    });

    this.unbindMenu = gameEvents.on(EVENTS.GO_TO_MENU, () => {
      this.scene.start("MainMenuScene");
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unbindRestart?.();
      this.unbindMenu?.();
    });
  }
}
