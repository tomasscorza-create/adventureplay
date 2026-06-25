import { useEffect } from "react";
import type { GameplayInputAction } from "../../shared/types/input";
import { touchInputStore } from "../../game/systems/input/TouchInputStore";

export function MobileControls() {
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
}

function TouchButton({ action, label, ariaLabel, compact = false }: TouchButtonProps) {
  const setPressed = (pressed: boolean) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (pressed) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    touchInputStore.setAction(action, pressed);
  };

  return (
    <button
      className={compact ? "touch-button touch-button--compact" : "touch-button"}
      type="button"
      aria-label={ariaLabel}
      onPointerDown={setPressed(true)}
      onPointerUp={setPressed(false)}
      onPointerCancel={setPressed(false)}
      onPointerLeave={setPressed(false)}
      onContextMenu={(event) => event.preventDefault()}
    >
      {label}
    </button>
  );
}
