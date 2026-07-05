import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { GameplayInputAction } from "../../shared/types/input";
import { touchInputStore } from "../../game/systems/input/TouchInputStore";
import type { HudState } from "../../shared/types/game";
import type { AchievementReward } from "../../game/data/achievements";
import { AbilityIcon } from "./AbilityIcon";
import { CombatActionIcon } from "./CombatActionIcon";
import { SpinCooldownIndicator } from "./SpinCooldownIndicator";
import { getCompactActionBinding } from "../../game/systems/input/KeyboardBindingStore";
import { useKeyboardBindings } from "../hooks/useKeyboardBindings";
import { getJoystickIntent, isInOpenJumpArea } from "./mobileControlsInput";
import { useMobileGameplaySettings } from "../hooks/useMobileGameplaySettings";

interface MobileControlsProps {
  hud: HudState;
  achievementReward?: AchievementReward;
  rewardFeedbackKey?: string;
}

export function MobileControls({ hud, achievementReward, rewardFeedbackKey }: MobileControlsProps) {
  const bindings = useKeyboardBindings();
  const settings = useMobileGameplaySettings();
  const [jumpFeedback, setJumpFeedback] = useState<{ x: number; y: number; sequence: number }>();
  const jumpFeedbackTimeout = useRef<number | undefined>(undefined);
  const triggerJump = useCallback((x: number, y: number) => {
    touchInputStore.setAction("jump", true);
    touchInputStore.setAction("jump", false);
    setJumpFeedback((current) => ({
      x,
      y,
      sequence: (current?.sequence ?? 0) + 1,
    }));
    window.clearTimeout(jumpFeedbackTimeout.current);
    jumpFeedbackTimeout.current = window.setTimeout(() => setJumpFeedback(undefined), 520);
  }, []);

  useEffect(() => {
    const jumpFromOpenScreenArea = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const jumpHalf = settings.controlScheme === "command-2"
        ? settings.leftHanded ? "right" : "left"
        : "right";
      if (!isInOpenJumpArea(event.clientX, window.innerWidth, jumpHalf)) {
        return;
      }

      const interactiveTarget = event.target.closest(
        "button, a, input, select, textarea, [role='button'], [data-touch-control]",
      );
      if (interactiveTarget) {
        return;
      }

      triggerJump(event.clientX, event.clientY);
    };

    document.addEventListener("pointerdown", jumpFromOpenScreenArea);
    return () => {
      document.removeEventListener("pointerdown", jumpFromOpenScreenArea);
      window.clearTimeout(jumpFeedbackTimeout.current);
      touchInputStore.reset();
    };
  }, [settings.controlScheme, settings.leftHanded, triggerJump]);

  const controlStyle = {
    "--mobile-control-scale": settings.controlScalePercent / 100,
    "--mobile-control-gap": `${settings.controlGap}px`,
    "--mobile-control-opacity": settings.controlOpacityPercent / 100,
    "--mobile-movement-inset": `${settings.movementInset}px`,
    "--mobile-actions-inset": `${settings.actionsInset}px`,
  } as CSSProperties;

  return (
    <section
      className={[
        "mobile-controls",
        settings.leftHanded ? "mobile-controls--left-handed" : "",
        `mobile-controls--${settings.controlScheme}`,
      ].filter(Boolean).join(" ")}
      style={controlStyle}
      aria-label="Controles tactiles"
    >
      {jumpFeedback && (
        <span
          className="mobile-jump-feedback"
          key={jumpFeedback.sequence}
          style={{ left: jumpFeedback.x, top: jumpFeedback.y }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 28 28"><path d="m6 17 8-8 8 8M6 23l8-8 8 8" /></svg>
        </span>
      )}
      <div className="mobile-controls__pause">
        <TouchButton action="pause" label="P" icon="pause" ariaLabel="Pausar" compact variant="pause" />
      </div>
      {settings.controlScheme === "command-2" ? (
        <>
          <JoystickControl onJump={triggerJump} />
          <div className="mobile-controls__right mobile-controls__right--radial">
            <div className="mobile-action-wheel" aria-label="Acciones del personaje">
              <TouchButton
                action="spin"
                label={getCompactActionBinding(bindings, "spin")}
                icon="spin"
                ariaLabel="Ataque giratorio"
                variant="combat"
                className="mobile-action-wheel__spin"
                disabled={hud.spinCooldownRemainingMs > 0}
                cooldownRemainingMs={hud.spinCooldownRemainingMs}
              />
              <TouchButton
                action="heal"
                label={getCompactActionBinding(bindings, "heal")}
                count={hud.healingCharges}
                ariaLabel={`Regenerar vida. ${hud.healingCharges} disponibles`}
                disabled={hud.healingCharges <= 0 || hud.health >= hud.maxHealth}
                rewardAmount={achievementReward?.healingCharges}
                rewardFeedbackKey={rewardFeedbackKey}
                variant="ability"
                className="mobile-action-wheel__heal"
              />
              <TouchButton
                action="melee"
                label={getCompactActionBinding(bindings, "melee")}
                icon="melee"
                ariaLabel="Atacar"
                variant="combat"
                className="mobile-action-wheel__melee"
              />
              <TouchButton
                action="power"
                label={getCompactActionBinding(bindings, "power")}
                count={hud.powerCharges}
                ariaLabel={`Poder letal. ${hud.powerCharges} disponibles`}
                disabled={hud.powerCharges <= 0}
                rewardAmount={achievementReward?.powerCharges}
                rewardFeedbackKey={rewardFeedbackKey}
                variant="ability"
                className="mobile-action-wheel__power"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mobile-controls__cluster mobile-controls__cluster--movement">
            <TouchButton action="left" label="A" icon="left" ariaLabel="Mover izquierda" variant="movement" />
            <TouchButton action="right" label="D" icon="right" ariaLabel="Mover derecha" variant="movement" />
          </div>
          <div className="mobile-controls__right">
            <div className="mobile-controls__cluster mobile-controls__cluster--actions">
              <TouchButton action="melee" label={getCompactActionBinding(bindings, "melee")} icon="melee" ariaLabel="Atacar" variant="combat" />
              <TouchButton
                action="spin"
                label={getCompactActionBinding(bindings, "spin")}
                icon="spin"
                ariaLabel="Ataque giratorio"
                variant="combat"
                disabled={hud.spinCooldownRemainingMs > 0}
                cooldownRemainingMs={hud.spinCooldownRemainingMs}
              />
            </div>
            <div className="mobile-controls__cluster mobile-controls__cluster--abilities">
              <TouchButton
                action="heal"
                label={getCompactActionBinding(bindings, "heal")}
                count={hud.healingCharges}
                ariaLabel={`Regenerar vida. ${hud.healingCharges} disponibles`}
                disabled={hud.healingCharges <= 0 || hud.health >= hud.maxHealth}
                rewardAmount={achievementReward?.healingCharges}
                rewardFeedbackKey={rewardFeedbackKey}
                variant="ability"
              />
              <TouchButton
                action="power"
                label={getCompactActionBinding(bindings, "power")}
                count={hud.powerCharges}
                ariaLabel={`Poder letal. ${hud.powerCharges} disponibles`}
                disabled={hud.powerCharges <= 0}
                rewardAmount={achievementReward?.powerCharges}
                rewardFeedbackKey={rewardFeedbackKey}
                variant="ability"
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function JoystickControl({ onJump }: { onJump: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | undefined>(undefined);
  const jumpHeld = useRef(false);
  const maxTravel = useRef(0);
  const pointerStart = useRef({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  const release = (event?: React.PointerEvent<HTMLDivElement>, allowTapJump = true) => {
    if (event && activePointer.current !== event.pointerId) {
      return;
    }
    if (event && allowTapJump && maxTravel.current < 10) {
      onJump(event.clientX, event.clientY);
    }
    touchInputStore.setAction("left", false);
    touchInputStore.setAction("right", false);
    jumpHeld.current = false;
    activePointer.current = undefined;
    maxTravel.current = 0;
    pointerStart.current = { x: 0, y: 0 };
    setKnobOffset({ x: 0, y: 0 });
  };

  useEffect(() => () => {
    touchInputStore.setAction("left", false);
    touchInputStore.setAction("right", false);
  }, []);

  const updateFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId || !baseRef.current) {
      return;
    }
    const rect = baseRef.current.getBoundingClientRect();
    const deltaX = event.clientX - (rect.left + rect.width / 2);
    const deltaY = event.clientY - (rect.top + rect.height / 2);
    const travel = Math.hypot(deltaX, deltaY);
    const maxRadius = rect.width * 0.31;
    const scale = travel > maxRadius ? maxRadius / travel : 1;
    const offset = { x: deltaX * scale, y: deltaY * scale };
    const intent = getJoystickIntent(deltaX, deltaY, rect.width * 0.16);

    const gestureTravel = Math.hypot(
      event.clientX - pointerStart.current.x,
      event.clientY - pointerStart.current.y,
    );
    maxTravel.current = Math.max(maxTravel.current, gestureTravel);
    setKnobOffset(offset);
    touchInputStore.setAction("left", intent.left);
    touchInputStore.setAction("right", intent.right);
    if (intent.jump && !jumpHeld.current) {
      onJump(event.clientX, event.clientY);
    }
    jumpHeld.current = intent.jump;
  };

  return (
    <div
      ref={baseRef}
      className="mobile-joystick"
      data-touch-control="joystick"
      role="application"
      aria-label="Joystick: arrastra a izquierda o derecha para moverte y hacia arriba para saltar"
      onPointerDown={(event) => {
        event.preventDefault();
        activePointer.current = event.pointerId;
        maxTravel.current = 0;
        pointerStart.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromPointer(event);
      }}
      onPointerMove={updateFromPointer}
      onPointerUp={release}
      onPointerCancel={(event) => release(event, false)}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="mobile-joystick__direction mobile-joystick__direction--left" aria-hidden="true">‹</span>
      <span className="mobile-joystick__direction mobile-joystick__direction--up" aria-hidden="true">⌃</span>
      <span className="mobile-joystick__direction mobile-joystick__direction--right" aria-hidden="true">›</span>
      <span
        className="mobile-joystick__knob"
        style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
        aria-hidden="true"
      />
    </div>
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
  cooldownRemainingMs?: number;
  className?: string;
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
  cooldownRemainingMs = 0,
  className = "",
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
        cooldownRemainingMs > 0 ? "touch-button--cooldown" : "",
        `touch-button--${variant}`,
        className,
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
      <SpinCooldownIndicator remainingMs={cooldownRemainingMs} />
      {(ability || variant === "combat") && <span className="touch-button__key">{label}</span>}
      {ability && <small className="touch-button__count">x{count}</small>}
      {rewardAmount && (
        <span className="touch-button__reward-feedback" key={`${action}-${rewardFeedbackKey}`}>
          +{rewardAmount}
        </span>
      )}
    </button>
  );
}

type TouchControlIconType = "left" | "right" | "melee" | "spin" | "pause";

function TouchControlIcon({ type }: { type: TouchControlIconType }) {
  if (type === "left" || type === "right") {
    return (
      <svg className="touch-control-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d={type === "left" ? "M21 6 10 16l11 10" : "m11 6 11 10-11 10"} />
        <path className="touch-control-icon__accent" d={type === "left" ? "M26 9 18 16l8 7" : "m6 9 8 7-8 7"} />
      </svg>
    );
  }

  if (type === "melee") {
    return <CombatActionIcon type="melee" />;
  }

  if (type === "spin") {
    return <CombatActionIcon type="spin" />;
  }

  return (
    <svg className="touch-control-icon" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M11 8v16M21 8v16" />
    </svg>
  );
}
