import { touchInputStore } from "../../game/systems/input/TouchInputStore";
import type { HudState } from "../../shared/types/game";
import type { GameplayInputAction } from "../../shared/types/input";
import { AbilityIcon } from "./AbilityIcon";

interface AbilityControlsProps {
  hud: HudState;
}

export function AbilityControls({ hud }: AbilityControlsProps) {
  return (
    <section className="ability-controls" aria-label="Poderes del personaje">
      <AbilityButton
        action="heal"
        keyLabel="Q"
        name="Regenerar"
        count={hud.healingCharges}
        disabled={hud.healingCharges <= 0 || hud.health >= hud.maxHealth}
        tone="heal"
      />
      <AbilityButton
        action="power"
        keyLabel="E"
        name="Poder letal"
        count={hud.powerCharges}
        disabled={hud.powerCharges <= 0}
        tone="power"
      />
    </section>
  );
}

interface AbilityButtonProps {
  action: GameplayInputAction;
  keyLabel: string;
  name: string;
  count: number;
  disabled: boolean;
  tone: "heal" | "power";
}

function AbilityButton({ action, keyLabel, name, count, disabled, tone }: AbilityButtonProps) {
  const activate = () => {
    touchInputStore.setAction(action, true);
    touchInputStore.setAction(action, false);
  };

  return (
    <button
      className={`ability-button ability-button--${tone}`}
      type="button"
      onClick={activate}
      disabled={disabled}
      aria-label={`${name}. ${count} disponibles. Tecla ${keyLabel}.`}
      title={`${name} - tecla ${keyLabel}`}
    >
      <span className="ability-button__key">{keyLabel}</span>
      <AbilityIcon type={tone} />
      <span className="ability-button__count">x{count}</span>
    </button>
  );
}
