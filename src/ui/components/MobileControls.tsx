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
        <TouchButton action="pause" label="P" icon="pause" ariaLabel="Pausar" compact variant="pause" />
      </div>
      <div className="mobile-controls__cluster mobile-controls__cluster--movement">
        <TouchButton action="left" label="A" icon="left" ariaLabel="Mover izquierda" variant="movement" />
        <TouchButton action="right" label="D" icon="right" ariaLabel="Mover derecha" variant="movement" />
      </div>
      <div className="mobile-controls__right">
        <div className="mobile-controls__cluster mobile-controls__cluster--actions">
          <TouchButton action="jump" label="W" icon="jump" ariaLabel="Saltar" variant="combat" />
          <TouchButton action="melee" label="J" icon="melee" ariaLabel="Atacar" variant="combat" />
          <TouchButton action="shoot" label="K" icon="shoot" ariaLabel="Disparar" variant="combat" />
        </div>
        <div className="mobile-controls__cluster mobile-controls__cluster--abilities">
          <TouchButton
            action="heal"
            label="Q"
            count={hud.healingCharges}
            ariaLabel={`Regenerar vida. ${hud.healingCharges} disponibles`}
            disabled={hud.healingCharges <= 0 || hud.health >= hud.maxHealth}
            rewardAmount={achievementReward?.healingCharges}
            rewardFeedbackKey={rewardFeedbackKey}
            variant="ability"
          />
          <TouchButton
            action="power"
            label="E"
            count={hud.powerCharges}
            ariaLabel={`Poder letal. ${hud.powerCharges} disponibles`}
            disabled={hud.powerCharges <= 0}
            rewardAmount={achievementReward?.powerCharges}
            rewardFeedbackKey={rewardFeedbackKey}
            variant="ability"
          />
        </div>
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
  icon?: TouchControlIconType;
  variant?: "movement" | "combat" | "ability" | "pause";
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
  icon,
  variant = "combat",
  rewardAmount,
  rewardFeedbackKey,
}: TouchButtonProps) {
  const ability = variant === "ability";
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
        `touch-button--${variant}`,
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
      {ability
        ? <AbilityIcon type={action === "heal" ? "heal" : "power"} />
        : icon
          ? <TouchControlIcon type={icon} />
          : <span>{label}</span>}
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

type TouchControlIconType = "left" | "right" | "jump" | "melee" | "shoot" | "pause";

function TouchControlIcon({ type }: { type: TouchControlIconType }) {
  if (type === "left" || type === "right") {
    return (
      <svg className="touch-control-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d={type === "left" ? "M21 6 10 16l11 10" : "m11 6 11 10-11 10"} />
        <path className="touch-control-icon__accent" d={type === "left" ? "M26 9 18 16l8 7" : "m6 9 8 7-8 7"} />
      </svg>
    );
  }

  if (type === "jump") {
    return (
      <svg className="touch-control-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d="m7 19 9-11 9 11" />
        <path className="touch-control-icon__accent" d="M16 9v15M8 26h16" />
      </svg>
    );
  }

  if (type === "melee") {
    return (
      <svg className="touch-control-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d="m7 25 5-5 11-15 4 4-15 11-5 5Z" />
        <path className="touch-control-icon__accent" d="m8 18 6 6M5 27l4-4" />
      </svg>
    );
  }

  if (type === "shoot") {
    return (
      <svg className="touch-control-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M5 16h21M20 9l7 7-7 7" />
        <path className="touch-control-icon__accent" d="M4 10h8M4 22h8" />
      </svg>
    );
  }

  return (
    <svg className="touch-control-icon" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M11 8v16M21 8v16" />
    </svg>
  );
}
