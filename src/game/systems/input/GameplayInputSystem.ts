import Phaser from "phaser";
import {
  emptyGameplayInputState,
  type GameplayInputFrame,
} from "../../../shared/types/input";
import { touchInputStore } from "./TouchInputStore";

export class GameplayInputSystem {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: KeyboardBindings;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is not available.");
    }

    this.cursors = keyboard.createCursorKeys();
    this.keys = {
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      jump: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      melee: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      shoot: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      pause: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P),
      escape: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };
  }

  readFrame(): GameplayInputFrame {
    const touch = touchInputStore.getState();
    const frame = {
      ...emptyGameplayInputState,
      left: this.cursors.left.isDown || this.keys.left.isDown || touch.left,
      right: this.cursors.right.isDown || this.keys.right.isDown || touch.right,
      jump: this.cursors.up.isDown || this.keys.up.isDown || this.keys.jump.isDown || touch.jump,
      melee: this.keys.melee.isDown || touch.melee,
      shoot: this.keys.shoot.isDown || touch.shoot,
      pause: this.keys.pause.isDown || this.keys.escape.isDown || touch.pause,
      jumpJustPressed:
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.keys.up) ||
        Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
        touchInputStore.wasJustPressed("jump"),
      meleeJustPressed:
        Phaser.Input.Keyboard.JustDown(this.keys.melee) ||
        touchInputStore.wasJustPressed("melee"),
      shootJustPressed:
        Phaser.Input.Keyboard.JustDown(this.keys.shoot) ||
        touchInputStore.wasJustPressed("shoot"),
      pauseJustPressed:
        Phaser.Input.Keyboard.JustDown(this.keys.pause) ||
        Phaser.Input.Keyboard.JustDown(this.keys.escape) ||
        touchInputStore.wasJustPressed("pause"),
    };

    touchInputStore.commitFrame();
    return frame;
  }
}

interface KeyboardBindings {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key;
  melee: Phaser.Input.Keyboard.Key;
  shoot: Phaser.Input.Keyboard.Key;
  pause: Phaser.Input.Keyboard.Key;
  escape: Phaser.Input.Keyboard.Key;
}
