interface AbilityIconProps {
  type: "heal" | "power";
}

export function AbilityIcon({ type }: AbilityIconProps) {
  if (type === "heal") {
    return (
      <svg className="ability-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 27.2c-.4 0-.8-.1-1.1-.4C10 23.2 4.6 19.1 4.6 13.2c0-3.8 2.9-6.7 6.6-6.7 1.9 0 3.6.8 4.8 2.2 1.2-1.4 2.9-2.2 4.8-2.2 3.7 0 6.6 2.9 6.6 6.7 0 5.9-5.4 10-10.3 13.6-.3.3-.7.4-1.1.4Z" />
        <path className="ability-icon__detail" d="M16 11.8v8.6M11.7 16.1h8.6" />
      </svg>
    );
  }

  return (
    <svg className="ability-icon" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M19.2 3.9 8.1 16.4c-.6.7-.1 1.7.8 1.7h5.2l-2.9 9.1c-.3 1 1 1.7 1.7.9l11-12.5c.6-.7.1-1.7-.8-1.7h-5.2l2.9-9.1c.4-1-.9-1.7-1.6-.9Z" />
      <path className="ability-icon__detail" d="M17.4 8.4 12 14.6h4.6l-1.8 5.6" />
    </svg>
  );
}
