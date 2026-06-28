import type { AchievementId, GameScreen, HudState } from "../../shared/types/game";
import { EVENTS } from "../../shared/constants/events";

type GameEventMap = {
  [EVENTS.START_GAME]: { levelId: string };
  [EVENTS.RESUME_GAME]: undefined;
  [EVENTS.RESTART_GAME]: { levelId: string };
  [EVENTS.GO_TO_MENU]: undefined;
  [EVENTS.ACTIVE_LEVEL_CHANGED]: { levelId: string };
  [EVENTS.HUD_UPDATED]: HudState;
  [EVENTS.HEALTH_PICKUP_COLLECTED]: { restored: number };
  [EVENTS.PLAYER_DAMAGED]: { amount: number };
  [EVENTS.ACHIEVEMENT_UNLOCKED]: { id: AchievementId; title: string; icon: string };
  [EVENTS.SCREEN_CHANGED]: GameScreen;
  [EVENTS.LEVEL_COMPLETED]: { levelId: string };
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
