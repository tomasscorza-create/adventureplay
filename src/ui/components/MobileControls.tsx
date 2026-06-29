import { useEffect } from "react";
import type { GameplayInputAction } from "../../shared/types/input";
import { touchInputStore } from "../../game/systems/input/TouchInputStore";
import type { HudState } from "../../shared/types/game";
import type { AchievementReward } from "../../game/data/achievements";
import { AbilityIcon } from "./AbilityIcon";

interface MobileControlsProps {
  hud: HudState;
  achievementReward?: AchievementReward;
  rewardFeedbackKey?: string;
}

export function MobileControls({ hud, achievementReward, rewardFeedbackKey }: MobileControlsProps) {
  useEffect(() => {
    return () => touchInputStore.reset();
  }, []);

  return (
    <section className="mobile-controls" aria-label="Controles tactiles">
      <div className="mobile-controls__pause">
        <TouchButton action="pause" label="||" ariaLabel="Pausar" compact />
      </div>
      <div className="mobile-controls__cluster mobile-controls__cluster--movement">
        <TouchButton action="left" label="<" ariaLabel="Mover izquierda" />
        <TouchButton action="right" label=">" ariaLabel="Mover derecha" />
      </div>
      <div className="mobile-controls__cluster mobile-controls__cluster--actions">
        <TouchButton
          action="heal"
          label="Q"
          count={hud.healingCharges}
          ariaLabel={`Regenerar vida. ${hud.healingCharges} disponibles`}
          disabled={hud.healingCharges <= 0 || hud.health >= hud.maxHealth}
          rewardAmount={achievementReward?.healingCharges}
          rewardFeedbackKey={rewardFeedbackKey}
          ability
        />
        <TouchButton
          action="power"
          label="E"
          count={hud.powerCharges}
          ariaLabel={`Poder letal. ${hud.powerCharges} disponibles`}
          disabled={hud.powerCharges <= 0}
          rewardAmount={achievementReward?.powerCharges}
          rewardFeedbackKey={rewardFeedbackKey}
          ability
        />
        <TouchButton action="jump" label="^" ariaLabel="Saltar" />
        <TouchButton action="melee" label="J" ariaLabel="Atacar" />
        <TouchButton action="shoot" label="K" ariaLabel="Disparar" />
      </div>
    </section>
  );
}

interface TouchButtonProps {
  action: GameplayInputAction;
  label: string;
  ariaLabel: string;
  compact?: boolean;
  count?: number;
  disabled?: boolean;
  ability?: boolean;
  rewardAmount?: number;
  rewardFeedbackKey?: string;
}

function TouchButton({
  action,
  label,
  ariaLabel,
  compact = false,
  count,
  disabled = false,
  ability = false,
  rewardAmount,
  rewardFeedbackKey,
}: TouchButtonProps) {
  const setPressed = (pressed: boolean) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (pressed) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    touchInputStore.setAction(action, pressed);
  };

  return (
    <button
      className={[
        "touch-button",
        compact ? "touch-button--compact" : "",
        ability ? "touch-button--ability" : "",
      ].filter(Boolean).join(" ")}
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={setPressed(true)}
      onPointerUp={setPressed(false)}
      onPointerCancel={setPressed(false)}
      onPointerLeave={setPressed(false)}
      onContextMenu={(event) => event.preventDefault()}
    >
      {ability ? <AbilityIcon type={action === "heal" ? "heal" : "power"} /> : <span>{label}</span>}
      {ability && <span className="touch-button__key">{label}</span>}
      {ability && <small className="touch-button__count">x{count}</small>}
      {rewardAmount && (
        <span className="touch-button__reward-feedback" key={`${action}-${rewardFeedbackKey}`}>
          +{rewardAmount}
        </span>
      )}
    </button>
  );
}
