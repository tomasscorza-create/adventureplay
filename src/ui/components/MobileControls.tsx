import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { GameplayInputAction } from "../../shared/types/input";
import { touchInputStore } from "../../game/systems/input/TouchInputStore";
import type { HudState } from "../../shared/types/game";
import type { AchievementReward } from "../../game/data/achievements";
import type { PurchasablePower } from "../../game/data/powerShop";
import { AbilityIcon } from "./AbilityIcon";
import { CombatActionIcon } from "./CombatActionIcon";
import { SpinCooldownIndicator } from "./SpinCooldownIndicator";
import { getCompactActionBinding } from "../../game/systems/input/KeyboardBindingStore";
import { useKeyboardBindings } from "../hooks/useKeyboardBindings";
import {
  getActionWheelOrbitAngles,
  getJoystickIntent,
  getTouchControlZone,
  JOYSTICK_JUMP_GUARD_PX,
} from "./mobileControlsInput";
import { useMobileGameplaySettings } from "../hooks/useMobileGameplaySettings";
import { gameHaptics } from "../../shared/haptics/GameHaptics";

const TOUCH_ACTION_REACH_PX = 10;
const PRIMARY_TOUCH_ACTION_REACH_PX = 16;
const TOUCH_GUARD_PADDING_PX = 14;

interface MobileControlsProps {
  hud: HudState;
  achievementReward?: AchievementReward;
  rewardFeedbackKey?: string;
  onOpenShop: (power: PurchasablePower) => void;
}

export function MobileControls({ hud, achievementReward, rewardFeedbackKey, onOpenShop }: MobileControlsProps) {
  const bindings = useKeyboardBindings();
  const settings = useMobileGameplaySettings();
  const wheelOrbitAngles = getActionWheelOrbitAngles(settings.actionWheelRotationDegrees);
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
    const extendedPointers = new Map<number, GameplayInputAction>();

    const releaseExtendedPointer = (event: PointerEvent) => {
      const action = extendedPointers.get(event.pointerId);
      if (!action) {
        return;
      }

      extendedPointers.delete(event.pointerId);
      touchInputStore.setAction(action, false);
    };

    const jumpFromOpenScreenArea = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const interactiveTarget = event.target.closest(
        "button, a, input, select, textarea, [role='button'], [data-touch-control]",
      );
      if (interactiveTarget) {
        return;
      }

      const controls = Array.from(
        document.querySelectorAll<HTMLElement>("[data-touch-action], [data-touch-control='joystick']"),
      );
      const nearbyControls = controls
        .map((control) => {
          const rect = control.getBoundingClientRect();
          const primaryAction = control.dataset.touchPriority === "primary";
          const actionReach = control.dataset.touchAction
            ? primaryAction ? PRIMARY_TOUCH_ACTION_REACH_PX : TOUCH_ACTION_REACH_PX
            : 0;
          const guardReach = control.dataset.touchControl === "joystick"
            ? JOYSTICK_JUMP_GUARD_PX
            : actionReach + TOUCH_GUARD_PADDING_PX;
          const zone = getTouchControlZone(
            event.clientX,
            event.clientY,
            rect,
            actionReach,
            guardReach,
          );
          const centerDistance = Math.hypot(
            event.clientX - (rect.left + rect.width / 2),
            event.clientY - (rect.top + rect.height / 2),
          );

          return { control, zone, centerDistance };
        })
        .filter(({ zone }) => zone !== "outside")
        .sort((first, second) => first.centerDistance - second.centerDistance);

      const nearestControl = nearbyControls[0];
      if (nearestControl) {
        const action = nearestControl.control.dataset.touchAction as GameplayInputAction | undefined;
        const disabled = nearestControl.control.matches(":disabled");
        if (nearestControl.zone === "action" && action && !disabled) {
          event.preventDefault();
          extendedPointers.set(event.pointerId, action);
          touchInputStore.setAction(action, true);
          gameHaptics.play(action === "left" || action === "right" ? "joystick" : "control");
        }
        return;
      }

      triggerJump(event.clientX, event.clientY);
    };

    document.addEventListener("pointerdown", jumpFromOpenScreenArea, { passive: false });
    document.addEventListener("pointerup", releaseExtendedPointer);
    document.addEventListener("pointercancel", releaseExtendedPointer);
    return () => {
      document.removeEventListener("pointerdown", jumpFromOpenScreenArea);
      document.removeEventListener("pointerup", releaseExtendedPointer);
      document.removeEventListener("pointercancel", releaseExtendedPointer);
      extendedPointers.forEach((action) => touchInputStore.setAction(action, false));
      window.clearTimeout(jumpFeedbackTimeout.current);
      touchInputStore.reset();
    };
  }, [triggerJump]);

  const controlStyle = {
    "--mobile-control-scale": settings.controlScalePercent / 100,
    "--mobile-control-gap": `${settings.controlGap}px`,
    "--mobile-control-opacity": settings.controlOpacityPercent / 100,
    "--mobile-movement-inset": `${settings.movementInset}px`,
    "--mobile-actions-inset": `${settings.actionsInset}px`,
    "--mobile-wheel-orbit-radius": `${73 + settings.controlGap / 2}px`,
    "--mobile-wheel-spin-angle": `${wheelOrbitAngles.spin}deg`,
    "--mobile-wheel-spin-counter-angle": `${-wheelOrbitAngles.spin}deg`,
    "--mobile-wheel-heal-angle": `${wheelOrbitAngles.heal}deg`,
    "--mobile-wheel-heal-counter-angle": `${-wheelOrbitAngles.heal}deg`,
    "--mobile-wheel-power-angle": `${wheelOrbitAngles.power}deg`,
    "--mobile-wheel-power-counter-angle": `${-wheelOrbitAngles.power}deg`,
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
          <JoystickControl />
          <div className="mobile-controls__right mobile-controls__right--radial">
            <div
              className={`mobile-action-wheel mobile-action-wheel--prefer-${settings.preferredRadialAction}`}
              aria-label="Acciones del personaje"
            >
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
                disabled={hud.healingCharges > 0 && hud.health >= hud.maxHealth}
                rewardAmount={achievementReward?.healingCharges}
                rewardFeedbackKey={rewardFeedbackKey}
                variant="ability"
                className="mobile-action-wheel__heal"
                isShopMode={hud.healingCharges <= 0}
                onShopClick={() => onOpenShop("healingCharges")}
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
                disabled={false}
                rewardAmount={achievementReward?.powerCharges}
                rewardFeedbackKey={rewardFeedbackKey}
                variant="ability"
                className="mobile-action-wheel__power"
                isShopMode={hud.powerCharges <= 0}
                onShopClick={() => onOpenShop("powerCharges")}
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
                disabled={hud.healingCharges > 0 && hud.health >= hud.maxHealth}
                rewardAmount={achievementReward?.healingCharges}
                rewardFeedbackKey={rewardFeedbackKey}
                variant="ability"
                isShopMode={hud.healingCharges <= 0}
                onShopClick={() => onOpenShop("healingCharges")}
              />
              <TouchButton
                action="power"
                label={getCompactActionBinding(bindings, "power")}
                count={hud.powerCharges}
                ariaLabel={`Poder letal. ${hud.powerCharges} disponibles`}
                disabled={false}
                rewardAmount={achievementReward?.powerCharges}
                rewardFeedbackKey={rewardFeedbackKey}
                variant="ability"
                isShopMode={hud.powerCharges <= 0}
                onShopClick={() => onOpenShop("powerCharges")}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function JoystickControl() {
  const baseRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | undefined>(undefined);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState("idle");
  const directionRef = useRef("idle");

  const updateDirectionFeedback = (nextDirection: string) => {
    if (directionRef.current === nextDirection) {
      return;
    }
    directionRef.current = nextDirection;
    setDirection(nextDirection);
  };

  const release = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (event && activePointer.current !== event.pointerId) {
      return;
    }
    touchInputStore.setAction("left", false);
    touchInputStore.setAction("right", false);
    activePointer.current = undefined;
    setKnobOffset({ x: 0, y: 0 });
    updateDirectionFeedback("idle");
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
    const maxRadius = rect.width * 0.31;
    const offset = { x: Math.max(-maxRadius, Math.min(maxRadius, deltaX)), y: 0 };
    const intent = getJoystickIntent(deltaX, rect.width * 0.16);
    const nextDirection = intent.left ? "left" : intent.right ? "right" : "idle";

    setKnobOffset(offset);
    updateDirectionFeedback(nextDirection);
    touchInputStore.setAction("left", intent.left);
    touchInputStore.setAction("right", intent.right);
  };

  return (
    <div
      ref={baseRef}
      className={`mobile-joystick mobile-joystick--${direction}`}
      data-touch-control="joystick"
      role="application"
      aria-label="Joystick: arrastra a izquierda o derecha para moverte"
      onPointerDown={(event) => {
        event.preventDefault();
        if (activePointer.current !== undefined) {
          return;
        }
        activePointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        gameHaptics.play("joystick");
        updateFromPointer(event);
      }}
      onPointerMove={updateFromPointer}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="mobile-joystick__direction mobile-joystick__direction--left" aria-hidden="true">‹</span>
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
  isShopMode?: boolean;
  onShopClick?: () => void;
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
  isShopMode = false,
  onShopClick,
}: TouchButtonProps) {
  const ability = variant === "ability";
  const [pressed, setPressedState] = useState(false);
  const setPressed = (pressed: boolean) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    
    if (isShopMode) {
      if (pressed && onShopClick) {
        gameHaptics.play("control");
        onShopClick();
      }
      return;
    }

    if (pressed) {
      event.currentTarget.setPointerCapture(event.pointerId);
      gameHaptics.play(action === "left" || action === "right" ? "joystick" : "control");
    }

    setPressedState(pressed);
    touchInputStore.setAction(action, pressed);
  };

  return (
    <button
      className={[
        "touch-button",
        compact ? "touch-button--compact" : "",
        cooldownRemainingMs > 0 ? "touch-button--cooldown" : "",
        pressed ? "is-pressed" : "",
        `touch-button--${variant}`,
        className,
      ].filter(Boolean).join(" ")}
      type="button"
      data-touch-action={action}
      data-touch-priority={variant === "movement" || action === "melee" ? "primary" : undefined}
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={setPressed(true)}
      onPointerUp={setPressed(false)}
      onPointerCancel={setPressed(false)}
      onContextMenu={(event) => event.preventDefault()}
    >
      {ability
        ? <AbilityIcon type={action === "heal" ? "heal" : "power"} />
        : icon
          ? <TouchControlIcon type={icon} />
          : <span>{label}</span>}
      <SpinCooldownIndicator remainingMs={cooldownRemainingMs} />
      {(ability || variant === "combat") && <span className="touch-button__key">{label}</span>}
      {ability && (
        isShopMode ? (
          <span className="touch-button__shop-icon">+</span>
        ) : (
          <small className="touch-button__count">x{count}</small>
        )
      )}
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
