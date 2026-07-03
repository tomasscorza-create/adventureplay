export interface GameplayInputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  melee: boolean;
  spin: boolean;
  heal: boolean;
  power: boolean;
  pause: boolean;
}

export interface GameplayInputFrame extends GameplayInputState {
  jumpJustPressed: boolean;
  meleeJustPressed: boolean;
  spinJustPressed: boolean;
  healJustPressed: boolean;
  powerJustPressed: boolean;
  pauseJustPressed: boolean;
}

export type GameplayInputAction = keyof GameplayInputState;

export const emptyGameplayInputState: GameplayInputState = {
  left: false,
  right: false,
  jump: false,
  melee: false,
  spin: false,
  heal: false,
  power: false,
  pause: false,
};
