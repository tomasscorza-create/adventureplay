export interface GameplayInputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  melee: boolean;
  shoot: boolean;
  pause: boolean;
}

export interface GameplayInputFrame extends GameplayInputState {
  jumpJustPressed: boolean;
  meleeJustPressed: boolean;
  shootJustPressed: boolean;
  pauseJustPressed: boolean;
}

export type GameplayInputAction = keyof GameplayInputState;

export const emptyGameplayInputState: GameplayInputState = {
  left: false,
  right: false,
  jump: false,
  melee: false,
  shoot: false,
  pause: false,
};
