interface CombatActionIconProps {
  type: "melee" | "spin";
  className?: string;
}

export function CombatActionIcon({ type, className = "touch-control-icon" }: CombatActionIconProps) {
  if (type === "melee") {
    return (
      <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M26 5.8c-.5 4.6-2.6 8.7-6.2 12.3l-5.1 5.1-5.9-5.9 5.1-5.1C17.5 8.6 21.4 6.3 26 5.8Z" />
        <path className="touch-control-icon__accent" d="m8.4 18.9 4.7 4.7M5.4 26.6l4.1-4.1" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="m9.6 20.2 9.3-9.3c1.8-1.8 4-3 6.5-3.6-.6 2.5-1.8 4.7-3.6 6.5l-9.3 9.3-2.9-2.9Z" />
      <path className="touch-control-icon__accent" d="M7 21A11 11 0 1 1 24 23M7 21l1-7m-1 7 7-1" />
    </svg>
  );
}
