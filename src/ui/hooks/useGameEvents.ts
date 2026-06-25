import { useEffect } from "react";
import { gameEvents } from "../../game/events/EventBus";
import { EVENTS } from "../../shared/constants/events";
import type { HudState } from "../../shared/types/game";

export function useHudEvents(onHudUpdate: (hud: HudState) => void): void {
  useEffect(() => {
    return gameEvents.on(EVENTS.HUD_UPDATED, onHudUpdate);
  }, [onHudUpdate]);
}
