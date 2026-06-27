interface AbilityIconProps {
  type: "heal" | "power";
}

export function AbilityIcon({ type }: AbilityIconProps) {
  if (type === "heal") {
    return (
      <svg className="ability-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 27S5 21 5 12.5C5 7.2 11.6 5 16 10c4.4-5 11-2.8 11 2.5C27 21 16 27 16 27Z" />
        <path className="ability-icon__detail" d="M16 11v10M11 16h10" />
      </svg>
    );
  }

  return (
    <svg className="ability-icon" viewBox="0 0 32 32" aria-hidden="true">
      <path d="m4 23 8-14 4 8 12-8-9 16-5-7-10 5Z" />
      <path className="ability-icon__detail" d="m7 27 8-5M3 18l7-4" />
    </svg>
  );
}
