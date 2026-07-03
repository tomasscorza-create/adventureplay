interface CombatActionIconProps {
  type: "melee" | "spin";
  className?: string;
}

export function CombatActionIcon({ type, className = "touch-control-icon" }: CombatActionIconProps) {
  if (type === "melee") {
    return (
      <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
        <path d="m7 25 5-5 11-15 4 4-15 11-5 5Z" />
        <path className="touch-control-icon__accent" d="m8 18 6 6M5 27l4-4" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="m10 24 4-4 10-14 3 3-14 10-3 5Z" />
      <path className="touch-control-icon__accent" d="M7 21A11 11 0 1 1 24 23M7 21l1-7m-1 7 7-1" />
    </svg>
  );
}
