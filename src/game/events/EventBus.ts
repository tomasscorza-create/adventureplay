import type {
  AchievementId,
  GameScreen,
  HudState,
  LevelCompletionSummary,
} from "../../shared/types/game";
import type { AchievementIconId, AchievementReward } from "../data/achievements";
import type { LevelRewardDefinition } from "../data/progression";
import type { SfxCue } from "../data/sfx";
import type { HapticCue } from "../../shared/haptics/GameHaptics";
import type { CoopRole, CoopStartPlayer } from "../systems/net/coopMessages";
import { EVENTS } from "../../shared/constants/events";

export interface CoopSessionInfo {
  role: CoopRole;
  code: string;
  // Slot del jugador local dentro de la sala (0 = host, 1..N = guests).
  localSlot: number;
  // Roster autoritativo de la partida (slot + heroe), tal como lo fijo el host.
  roster: CoopStartPlayer[];
}

type GameEventMap = {
  [EVENTS.START_GAME]: { levelId: string; coop?: CoopSessionInfo };
  [EVENTS.RESUME_GAME]: undefined;
  [EVENTS.PAUSE_FOR_POWER_SHOP]: undefined;
  [EVENTS.RESTART_GAME]: { levelId: string };
  [EVENTS.CONTINUE_LEVEL]: { completedLevelId: string; nextLevelId?: string };
  [EVENTS.GO_TO_MENU]: undefined;
  [EVENTS.ACTIVE_LEVEL_CHANGED]: { levelId: string };
  [EVENTS.SFX_REQUESTED]: { cue: SfxCue };
  [EVENTS.HAPTIC_REQUESTED]: { cue: HapticCue };
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
