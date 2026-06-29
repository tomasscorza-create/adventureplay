import type { AchievementIconId } from "../../game/data/achievements";

interface AchievementIconProps {
  icon: AchievementIconId | "check" | "lock" | "trophy";
}

export function AchievementIcon({ icon }: AchievementIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {icon === "flag" && <path d="M5 21V4m1 1h11l-2.8 3L17 11H6" />}
      {icon === "shield" && <path d="M12 3 5 6v5c0 4.8 2.7 8.2 7 10 4.3-1.8 7-5.2 7-10V6l-7-3Zm-3 9 2 2 4-5" />}
      {icon === "swords" && <path d="m5 4 6 6m8-6-6 6M4 19l5-5m11 5-5-5M3 3l3 8 3-3-6-5Zm18 0-3 8-3-3 6-5Z" />}
      {icon === "claw" && <path d="M7 4c2 3 2 6 0 9m5-10c2 4 2 7 0 11m5-9c1 4 0 7-2 10M5 20c3-4 7-5 12-3" />}
      {icon === "coin" && <><ellipse cx="12" cy="12" rx="8" ry="9" /><path d="M9 8h4.5a2 2 0 0 1 0 4H10a2 2 0 0 0 0 4h5M12 6v12" /></>}
      {icon === "checkpoint" && <path d="M5 21V4m1 1h11l-2 3 2 3H6m3 10h6" />}
      {icon === "chest" && <path d="M4 9h16v11H4V9Zm1-5h14l1 5H4l1-5Zm5 5v4h4V9m-3 7h2" />}
      {icon === "map" && <path d="m4 5 5-2 6 2 5-2v16l-5 2-6-2-5 2V5Zm5-2v16m6-14v16" />}
      {icon === "check" && <path d="m5 12 4 4L19 6" />}
      {icon === "lock" && <path d="M6 10h12v10H6V10Zm3 0V7a3 3 0 0 1 6 0v3m-3 4v3" />}
      {icon === "trophy" && <path d="M8 4h8v4c0 4-2 7-4 7s-4-3-4-7V4Zm0 2H4v2c0 3 2 5 5 5m7-7h4v2c0 3-2 5-5 5m-3 2v4m-4 1h8" />}
    </svg>
  );
}
