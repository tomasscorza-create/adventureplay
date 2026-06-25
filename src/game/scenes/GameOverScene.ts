import Phaser from "phaser";
import { EVENTS } from "../../shared/constants/events";
import { gameEvents } from "../events/EventBus";

export class GameOverScene extends Phaser.Scene {
  private unbindRestart?: () => void;
  private unbindMenu?: () => void;

  constructor() {
    super("GameOverScene");
  }

  create(data: { result?: "defeat" | "victory" }): void {
    this.cameras.main.setBackgroundColor(data.result === "victory" ? "#10291f" : "#23111a");
    gameEvents.emit(EVENTS.SCREEN_CHANGED, data.result === "victory" ? "victory" : "game-over");

    this.unbindRestart = gameEvents.on(EVENTS.RESTART_GAME, () => {
      this.scene.start("LevelScene", { levelId: "meadowOutpost" });
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
