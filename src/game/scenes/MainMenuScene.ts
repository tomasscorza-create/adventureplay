import Phaser from "phaser";
import { EVENTS } from "../../shared/constants/events";
import { gameEvents } from "../events/EventBus";
import { puzzleLevelDefinitions } from "../data/puzzleLevels";

export class MainMenuScene extends Phaser.Scene {
  private unbindStart?: () => void;

  constructor() {
    super("MainMenuScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0a1220");
    this.addBackdrop();
    gameEvents.emit(EVENTS.SCREEN_CHANGED, "main-menu");

    this.unbindStart = gameEvents.on(EVENTS.START_GAME, (payload) => {
      this.scene.start(
        puzzleLevelDefinitions[payload.levelId] ? "PuzzleScene" : "LevelScene",
        { levelId: payload.levelId },
      );
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unbindStart?.();
    });
  }

  private addBackdrop(): void {
    this.add.rectangle(640, 360, 1280, 720, 0x0a1220);
    this.add.circle(1040, 120, 82, 0x7fd8f2, 0.14);
    this.add.circle(260, 160, 68, 0x8299b1, 0.12);
    this.add.rectangle(640, 575, 1280, 290, 0x101f33, 0.9);
    this.add.rectangle(640, 665, 1280, 120, 0x16283e, 1);

    for (let index = 0; index < 12; index += 1) {
      const x = index * 120 + 30;
      const height = 190 + (index % 3) * 34;
      this.add.rectangle(x, 520 - height / 2, 28, height, 0x141f36, 0.92);
      this.add.circle(x, 380 - (index % 3) * 20, 72, 0x1d3350, 0.92);
      this.add.circle(x - 35, 405 - (index % 2) * 28, 48, 0x24405f, 0.78);
      this.add.circle(x + 38, 400, 52, 0x203a56, 0.8);
    }

    for (let index = 0; index < 18; index += 1) {
      const x = 40 + index * 74;
      const y = 620 + (index % 2) * 18;
      this.add.circle(x, y, 8, 0x7fd8f2, 0.28);
    }
  }
}
