import { gameAudio } from "../../../shared/audio/GameAudio";

export function MenuHeading({
  eyebrow,
  title,
  onBack,
  backLabel = "Volver",
  hideBack = false,
  centered = false,
  animatedTitle = false,
}: {
  eyebrow?: string;
  title: string;
  onBack: () => void;
  backLabel?: string;
  hideBack?: boolean;
  centered?: boolean;
  animatedTitle?: boolean;
}) {
  return (
    <div className={`menu-heading${centered ? " menu-heading--centered" : ""}${animatedTitle ? " menu-heading--shimmer" : ""}`}>
      <div>
        {eyebrow && <span className="panel__eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {!hideBack && (
        <button
          className="button button--secondary button--small"
          type="button"
          onClick={() => {
            gameAudio.playUiSelect();
            onBack();
          }}
        >
          {backLabel}
        </button>
      )}
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
