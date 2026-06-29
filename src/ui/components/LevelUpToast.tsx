import {
  getLevelRewardLabels,
  type LevelRewardDefinition,
} from "../../game/data/progression";

interface LevelUpToastProps {
  level: number;
  reward?: LevelRewardDefinition;
}

export function LevelUpToast({ level, reward }: LevelUpToastProps) {
  return (
    <section
      className="achievement-unlock level-up-toast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="achievement-unlock__icon level-up-toast__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 20V5m-6 6 6-6 6 6M5 21h14" />
        </svg>
        <span>{level}</span>
      </div>
      <div className="achievement-unlock__copy">
        <span className="achievement-unlock__eyebrow">Nivel aumentado</span>
        <strong>Alcanzaste LV {level}</strong>
        <span className="achievement-unlock__reward">
          Recompensa: {getLevelRewardLabels(reward).join(" + ")}
        </span>
      </div>
      <span className="achievement-unlock__shine" aria-hidden="true" />
      <span className="achievement-unlock__timer" aria-hidden="true" />
    </section>
  );
}
