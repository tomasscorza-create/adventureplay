import {
  getAchievementRewardLabels,
  type AchievementIconId,
  type AchievementReward,
} from "../../game/data/achievements";
import { AchievementIcon } from "./AchievementIcon";

interface AchievementUnlockToastProps {
  icon: AchievementIconId;
  title: string;
  reward: AchievementReward;
}

export function AchievementUnlockToast({ icon, title, reward }: AchievementUnlockToastProps) {
  const rewardLabels = getAchievementRewardLabels(reward);

  return (
    <section className="achievement-unlock" role="status" aria-live="polite" aria-atomic="true">
      <div className="achievement-unlock__icon" aria-hidden="true">
        <AchievementIcon icon={icon} />
      </div>
      <div className="achievement-unlock__copy">
        <span className="achievement-unlock__eyebrow">Logro desbloqueado</span>
        <strong>{title}</strong>
        <span className="achievement-unlock__reward">Recompensa: {rewardLabels.join(" + ")}</span>
      </div>
      <span className="achievement-unlock__shine" aria-hidden="true" />
      <span className="achievement-unlock__timer" aria-hidden="true" />
    </section>
  );
}
