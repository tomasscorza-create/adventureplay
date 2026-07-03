import Phaser from "phaser";
import {
  emptyGameplayInputState,
  type GameplayInputFrame,
} from "../../../shared/types/input";
import { touchInputStore } from "./TouchInputStore";
import {
  keyboardBindingStore,
  type KeyboardCommandAction,
} from "./KeyboardBindingStore";

export class GameplayInputSystem {
  private readonly keys: KeyboardBindings;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is not available.");
    }

    const configuredBindings = keyboardBindingStore.getBindings();
    this.keys = Object.fromEntries(
      Object.entries(configuredBindings).map(([action, pair]) => [
        action,
        [pair.primary, pair.secondary]
          .filter((code) => code !== null)
          .map((code) => keyboard.addKey(code)),
      ]),
    ) as KeyboardBindings;
  }

  readFrame(): GameplayInputFrame {
    const touch = touchInputStore.getState();
    const frame = {
      ...emptyGameplayInputState,
      left: this.isDown("left") || touch.left,
      right: this.isDown("right") || touch.right,
      jump: this.isDown("jump") || touch.jump,
      melee: this.isDown("melee") || touch.melee,
      spin: this.isDown("spin") || touch.spin,
      heal: this.isDown("heal") || touch.heal,
      power: this.isDown("power") || touch.power,
      pause: this.isDown("pause") || touch.pause,
      jumpJustPressed:
        this.wasJustPressed("jump") ||
        touchInputStore.wasJustPressed("jump"),
      meleeJustPressed:
        this.wasJustPressed("melee") ||
        touchInputStore.wasJustPressed("melee"),
      spinJustPressed:
        this.wasJustPressed("spin") ||
        touchInputStore.wasJustPressed("spin"),
      healJustPressed:
        this.wasJustPressed("heal") ||
        touchInputStore.wasJustPressed("heal"),
      powerJustPressed:
        this.wasJustPressed("power") ||
        touchInputStore.wasJustPressed("power"),
      pauseJustPressed:
        this.wasJustPressed("pause") ||
        touchInputStore.wasJustPressed("pause"),
    };

    touchInputStore.commitFrame();
    return frame;
  }

  private isDown(action: KeyboardCommandAction): boolean {
    return this.keys[action].some((key) => key.isDown);
  }

  private wasJustPressed(action: KeyboardCommandAction): boolean {
    return this.keys[action].some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}

type KeyboardBindings = Record<KeyboardCommandAction, Phaser.Input.Keyboard.Key[]>;
