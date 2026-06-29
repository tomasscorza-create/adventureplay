import { touchInputStore } from "../../game/systems/input/TouchInputStore";
import type { HudState } from "../../shared/types/game";
import type { GameplayInputAction } from "../../shared/types/input";
import type { PurchasablePower } from "../../game/data/powerShop";
import type { AchievementReward } from "../../game/data/achievements";
import { AbilityIcon } from "./AbilityIcon";

interface AbilityControlsProps {
  hud: HudState;
  onOpenShop: (power: PurchasablePower) => void;
  achievementReward?: AchievementReward;
  rewardFeedbackKey?: string;
}

export function AbilityControls({ hud, onOpenShop, achievementReward, rewardFeedbackKey }: AbilityControlsProps) {
  return (
    <section className="ability-controls" aria-label="Poderes del personaje">
      <AbilityButton
        action="heal"
        keyLabel="Q"
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
        keyLabel="E"
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
      <button
        className="ability-button__shop"
        type="button"
        onClick={onOpenShop}
        aria-label={`Comprar cargas de ${name}`}
        title={`Comprar ${name}`}
      >
        +
      </button>
    </div>
  );
}
