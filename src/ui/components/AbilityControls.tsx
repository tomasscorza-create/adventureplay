import { touchInputStore } from "../../game/systems/input/TouchInputStore";
import type { HudState } from "../../shared/types/game";
import type { GameplayInputAction } from "../../shared/types/input";
import type { PurchasablePower } from "../../game/data/powerShop";
import type { AchievementReward } from "../../game/data/achievements";
import { AbilityIcon } from "./AbilityIcon";
import { CombatActionIcon } from "./CombatActionIcon";
import { SpinCooldownIndicator } from "./SpinCooldownIndicator";
import { getCompactActionBinding } from "../../game/systems/input/KeyboardBindingStore";
import { useKeyboardBindings } from "../hooks/useKeyboardBindings";
import { coopSession } from "../../game/systems/net/CoopSession";

interface AbilityControlsProps {
  hud: HudState;
  onOpenShop: (power: PurchasablePower) => void;
  achievementReward?: AchievementReward;
  rewardFeedbackKey?: string;
}

export function AbilityControls({ hud, onOpenShop, achievementReward, rewardFeedbackKey }: AbilityControlsProps) {
  const bindings = useKeyboardBindings();
  return (
    <section className="ability-controls" aria-label="Acciones y poderes del personaje">
      <div className="desktop-combat-controls" aria-label="Ataques normales">
        <CombatButton action="melee" keyLabel={getCompactActionBinding(bindings, "melee")} name="Ataque de espada" icon="melee" />
        <CombatButton
          action="spin"
          keyLabel={getCompactActionBinding(bindings, "spin")}
          name="Ataque giratorio"
          icon="spin"
          cooldownRemainingMs={hud.spinCooldownRemainingMs}
        />
      </div>
      <AbilityButton
        action="heal"
        keyLabel={getCompactActionBinding(bindings, "heal")}
        name="Regenerar"
        count={hud.healingCharges}
        disabled={hud.healingCharges <= 0 || hud.health >= hud.maxHealth}
        tone="heal"
        rewardAmount={achievementReward?.healingCharges}
        rewardFeedbackKey={rewardFeedbackKey}
        onOpenShop={() => onOpenShop("healingCharges")}
      />
      <AbilityButton
        action="power"
        keyLabel={getCompactActionBinding(bindings, "power")}
        name="Poder letal"
        count={hud.powerCharges}
        disabled={hud.powerCharges <= 0}
        tone="power"
        rewardAmount={achievementReward?.powerCharges}
        rewardFeedbackKey={rewardFeedbackKey}
        onOpenShop={() => onOpenShop("powerCharges")}
      />
    </section>
  );
}

interface CombatButtonProps {
  action: "melee" | "spin";
  keyLabel: string;
  name: string;
  icon: "melee" | "spin";
  cooldownRemainingMs?: number;
}

function CombatButton({
  action,
  keyLabel,
  name,
  icon,
  cooldownRemainingMs = 0,
}: CombatButtonProps) {
  const activate = () => {
    touchInputStore.setAction(action, true);
    touchInputStore.setAction(action, false);
  };

  const coolingDown = cooldownRemainingMs > 0;
  return (
    <button
      className="desktop-combat-button"
      type="button"
      onClick={activate}
      disabled={coolingDown}
      aria-label={coolingDown
        ? `${name}. Disponible en ${Math.ceil(cooldownRemainingMs / 1000)} segundos.`
        : `${name}. Tecla ${keyLabel}.`}
      title={`${name} - tecla ${keyLabel}`}
    >
      <span className="desktop-combat-button__key">{keyLabel}</span>
      <CombatActionIcon type={icon} className="desktop-combat-button__icon" />
      <SpinCooldownIndicator remainingMs={cooldownRemainingMs} />
    </button>
  );
}

interface AbilityButtonProps {
  action: GameplayInputAction;
  keyLabel: string;
  name: string;
  count: number;
  disabled: boolean;
  tone: "heal" | "power";
  rewardAmount?: number;
  rewardFeedbackKey?: string;
  onOpenShop: () => void;
}

function AbilityButton({
  action,
  keyLabel,
  name,
  count,
  disabled,
  tone,
  rewardAmount,
  rewardFeedbackKey,
  onOpenShop,
}: AbilityButtonProps) {
  const activate = () => {
    touchInputStore.setAction(action, true);
    touchInputStore.setAction(action, false);
  };

  return (
    <div className="ability-control">
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
      {rewardAmount && (
        <span className={`ability-reward-feedback ability-reward-feedback--${tone}`} key={`${tone}-${rewardFeedbackKey}`}>
          +{rewardAmount}
        </span>
      )}
      {!coopSession.isActive && (
        <button
          className="ability-button__shop"
          type="button"
          onClick={onOpenShop}
          aria-label={`Comprar cargas de ${name}`}
          title={`Comprar ${name}`}
        >
          +
        </button>
      )}
    </div>
  );
}
