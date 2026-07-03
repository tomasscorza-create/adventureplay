import type {
  AchievementId,
  GameScreen,
  HudState,
  LevelCompletionSummary,
} from "../../shared/types/game";
import type { AchievementIconId, AchievementReward } from "../data/achievements";
import type { LevelRewardDefinition } from "../data/progression";
import type { SfxCue } from "../data/sfx";
import { EVENTS } from "../../shared/constants/events";

type GameEventMap = {
  [EVENTS.START_GAME]: { levelId: string };
  [EVENTS.RESUME_GAME]: undefined;
  [EVENTS.PAUSE_FOR_POWER_SHOP]: undefined;
  [EVENTS.RESTART_GAME]: { levelId: string };
  [EVENTS.CONTINUE_LEVEL]: { completedLevelId: string; nextLevelId?: string };
  [EVENTS.GO_TO_MENU]: undefined;
  [EVENTS.ACTIVE_LEVEL_CHANGED]: { levelId: string };
  [EVENTS.SFX_REQUESTED]: { cue: SfxCue };
  [EVENTS.HUD_UPDATED]: HudState;
  [EVENTS.HEALTH_PICKUP_COLLECTED]: { restored: number };
  [EVENTS.PLAYER_DAMAGED]: { amount: number };
  [EVENTS.PLAYER_LEVELED_UP]: { level: number; reward?: LevelRewardDefinition };
  [EVENTS.ACHIEVEMENT_UNLOCKED]: {
    id: AchievementId;
    title: string;
    icon: AchievementIconId;
    reward: AchievementReward;
  };
  [EVENTS.SCREEN_CHANGED]: GameScreen;
  [EVENTS.LEVEL_COMPLETED]: LevelCompletionSummary;
};

type EventKey = keyof GameEventMap;

class EventBus {
  private readonly target = new EventTarget();

  emit<Key extends EventKey>(event: Key, payload: GameEventMap[Key]): void {
    this.target.dispatchEvent(new CustomEvent(event, { detail: payload }));
  }

  on<Key extends EventKey>(
    event: Key,
    handler: (payload: GameEventMap[Key]) => void,
  ): () => void {
    const listener = (rawEvent: Event) => {
      handler((rawEvent as CustomEvent<GameEventMap[Key]>).detail);
    };

    this.target.addEventListener(event, listener);
    return () => this.target.removeEventListener(event, listener);
  }
}

export const gameEvents = new EventBus();
