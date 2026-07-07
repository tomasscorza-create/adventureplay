import type { AchievementIconId } from "../../game/data/achievements";

interface AchievementIconProps {
  icon: AchievementIconId | "check" | "lock" | "trophy";
}

export function AchievementIcon({ icon }: AchievementIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {icon === "flag" && <path d="M5.5 21V3.6m0 1.2h11.4l-2.7 3.1 2.7 3.1H5.5" />}
      {icon === "shield" && <path d="M12 2.8 5.2 5.7v5.2c0 4.7 2.7 8.1 6.8 9.8 4.1-1.7 6.8-5.1 6.8-9.8V5.7L12 2.8Zm-3.1 8.9 2.2 2.2 4-4.7" />}
      {icon === "swords" && <path d="m5.2 4.3 5.9 5.9M18.8 4.3l-5.9 5.9M4.2 19.8l5.1-5.1m10.5 5.1-5.1-5.1M3.2 3.2l2.8 7.4 2.8-2.8-5.6-4.6Zm17.6 0-2.8 7.4-2.8-2.8 5.6-4.6ZM6.3 16.6l1.1 1.1m10.3-1.1-1.1 1.1" />}
      {icon === "claw" && <path d="M7.2 4.2c1.9 2.9 1.9 5.9 0 8.8m5-9.8c1.9 3.8 1.9 7.1 0 10.8m5-8.8c1 3.8.3 6.9-1.9 9.8M5.2 19.8c3-3.9 7-4.9 12-3" />}
      {icon === "coin" && <><circle cx="12" cy="12" r="8.4" /><circle cx="12" cy="12" r="4.9" /><path d="M12 9.7 13.9 12 12 14.3 10.1 12 12 9.7Z" /></>}
      {icon === "checkpoint" && <path d="M5.5 21V3.6m0 1.2h11.4l-2.1 3.1 2.1 3.1H5.5m3.2 10h6.2" />}
      {icon === "chest" && <path d="M4.4 9.4h15.2v10H4.4Zm1.2-4.8h12.8l1.2 4.8H4.4Zm4.2 4.8v3.4h4.4V9.4m-2.8 6.4h1.2" />}
      {icon === "map" && <path d="m4 5 5-2 6 2 5-2v16l-5 2-6-2-5 2V5Zm5-2v16m6-14v16" />}
      {icon === "check" && <path d="m5 12 4 4L19 6" />}
      {icon === "lock" && <path d="M6.2 10.2h11.6V20H6.2Zm2.8 0V7.1a3 3 0 0 1 6 0v3.1M12 13.6v3" />}
      {icon === "trophy" && <path d="M8.4 3.8h7.2v4.4c0 3.7-1.6 6.5-3.6 6.5s-3.6-2.8-3.6-6.5Zm0 1.7H4.8v1.7c0 2.7 1.8 4.4 4.2 4.6m6.6-6.3h3.6v1.7c0 2.7-1.8 4.4-4.2 4.6M12 14.7v3.2m-3.5 2.3h7" />}
    </svg>
  );
}
