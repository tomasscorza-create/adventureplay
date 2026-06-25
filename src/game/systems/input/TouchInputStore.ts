import {
  emptyGameplayInputState,
  type GameplayInputAction,
  type GameplayInputState,
} from "../../../shared/types/input";

class TouchInputStore {
  private state: GameplayInputState = { ...emptyGameplayInputState };
  private previousState: GameplayInputState = { ...emptyGameplayInputState };
  private queuedPresses = new Set<GameplayInputAction>();

  setAction(action: GameplayInputAction, pressed: boolean): void {
    if (pressed) {
      this.queuedPresses.add(action);
    }

    this.state = {
      ...this.state,
      [action]: pressed,
    };
  }

  reset(): void {
    this.state = { ...emptyGameplayInputState };
    this.previousState = { ...emptyGameplayInputState };
    this.queuedPresses.clear();
  }

  getState(): GameplayInputState {
    return { ...this.state };
  }

  wasJustPressed(action: GameplayInputAction): boolean {
    return this.queuedPresses.has(action) || (this.state[action] && !this.previousState[action]);
  }

  commitFrame(): void {
    this.previousState = { ...this.state };
    this.queuedPresses.clear();
  }
}

export const touchInputStore = new TouchInputStore();
