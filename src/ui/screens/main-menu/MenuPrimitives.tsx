import type { CSSProperties } from "react";

export function MenuHeading({
  title,
  onBack,
  backLabel = "Volver",
  hideBack = false,
  animatedTitle = false,
  variant,
}: {
  title: string;
  onBack: () => void;
  backLabel?: string;
  hideBack?: boolean;
  animatedTitle?: boolean;
  variant: "profile" | "settings" | "audio" | "heroes" | "hero-detail" | "modes" | "inventory" | "explore" | "achievements";
}) {
  return (
    <div className={`menu-heading menu-heading--${variant}${animatedTitle ? " menu-heading--shimmer" : ""}`}>
      {!hideBack && (
        <button
          className="button button--secondary button--small menu-heading__back"
          type="button"
          onClick={onBack}
        >
          <span className="menu-heading__back-icon" aria-hidden="true">&lsaquo;</span>
          <span>{backLabel}</span>
        </button>
      )}
      <div>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

export function SettingToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={`settings-toggle${enabled ? " settings-toggle--on" : ""}`}
      type="button"
      aria-pressed={enabled}
      onClick={onToggle}
    >
      <span className="settings-toggle__copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
      <span className="settings-toggle__control" aria-hidden="true">
        <span className="settings-toggle__knob" />
      </span>
      <span className="settings-toggle__state">{enabled ? "ON" : "OFF"}</span>
    </button>
  );
}

export function VolumeControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="volume-control">
      <span className="volume-control__header">
        <strong>Intensidad de {label.toLowerCase()}</strong>
        <output>{value}%</output>
      </span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        aria-label={`Intensidad de ${label}`}
        aria-valuetext={`${value} por ciento`}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        style={{ "--volume-progress": `${value}%` } as CSSProperties}
      />
      <span className="volume-control__scale" aria-hidden="true">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </span>
    </label>
  );
}
