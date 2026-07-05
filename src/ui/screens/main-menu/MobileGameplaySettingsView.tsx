import type { CSSProperties } from "react";
import type {
  MobileControlScheme,
  MobileGameplaySettings,
  MobilePerformanceMode,
} from "../../../game/systems/input/MobileGameplaySettings";
import { mobileGameplaySettingsStore } from "../../../game/systems/input/MobileGameplaySettings";
import { useMobileGameplaySettings } from "../../hooks/useMobileGameplaySettings";

const performanceModes: readonly {
  id: MobilePerformanceMode;
  label: string;
  description: string;
}[] = [
  { id: "quality", label: "Calidad", description: "Imagen mas definida." },
  { id: "balanced", label: "Equilibrado", description: "Perfil recomendado." },
  { id: "performance", label: "Rendimiento", description: "Prioriza fluidez." },
];

const commandCopy: Record<MobileControlScheme, { name: string; description: string }> = {
  "command-1": {
    name: "Comando 1",
    description: "Flechas y botones agrupados",
  },
  "command-2": {
    name: "Comando 2",
    description: "Joystick y rueda de acciones",
  },
};

export function MobileGameplaySettingsView() {
  const settings = useMobileGameplaySettings();
  const activeCommand = commandCopy[settings.controlScheme];

  return (
    <div className="mobile-gameplay-settings" aria-label="Configuracion de jugabilidad movil">
      <section className="mobile-settings-card mobile-settings-card--scheme">
        <header>
          <strong>Selecciona el comando</strong>
          <span>Cada comando conserva su propia configuracion.</span>
        </header>
        <div className="mobile-command-options" role="radiogroup" aria-label="Tipo de comando movil">
          {(["command-1", "command-2"] as const).map((scheme) => {
            const selected = settings.controlScheme === scheme;
            return (
              <button
                className={selected ? "is-selected" : ""}
                type="button"
                role="radio"
                aria-checked={selected}
                key={scheme}
                onClick={() => mobileGameplaySettingsStore.update({ controlScheme: scheme })}
              >
                <ControlPreview scheme={scheme} compact />
                <span className="mobile-command-option__copy">
                  <strong>{commandCopy[scheme].name}</strong>
                  <small>{commandCopy[scheme].description}</small>
                </span>
                <span className="mobile-command-option__state" aria-hidden="true">
                  {selected ? "Editando" : "Cambiar"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mobile-settings-card mobile-settings-card--controls">
        <header className="mobile-control-editor__heading">
          <span><small>PERSONALIZANDO</small><strong>{activeCommand.name}</strong></span>
          <span>Los cambios se guardan solo para este comando.</span>
        </header>
        <div className="mobile-control-editor">
          <div className="mobile-control-editor__preview">
            <span className="mobile-control-editor__preview-label">Vista previa</span>
            <ControlPreview scheme={settings.controlScheme} settings={settings} />
            <small>{settings.leftHanded ? "Movimiento a la derecha" : "Movimiento a la izquierda"}</small>
          </div>
          <div className="mobile-control-editor__sliders">
            <MobileSlider
              label="Tamano"
              value={settings.controlScalePercent}
              min={85}
              max={120}
              suffix="%"
              onChange={(controlScalePercent) => mobileGameplaySettingsStore.update({ controlScalePercent })}
            />
            <MobileSlider
              label="Separacion"
              value={settings.controlGap}
              min={6}
              max={22}
              suffix=" px"
              onChange={(controlGap) => mobileGameplaySettingsStore.update({ controlGap })}
            />
            <MobileSlider
              label="Opacidad"
              value={settings.controlOpacityPercent}
              min={45}
              max={100}
              suffix="%"
              onChange={(controlOpacityPercent) => mobileGameplaySettingsStore.update({ controlOpacityPercent })}
            />
            <MobileSlider
              label="Posicion movimiento"
              value={settings.movementInset}
              min={0}
              max={72}
              suffix=" px"
              onChange={(movementInset) => mobileGameplaySettingsStore.update({ movementInset })}
            />
            <MobileSlider
              label="Posicion ataques"
              value={settings.actionsInset}
              min={0}
              max={72}
              suffix=" px"
              onChange={(actionsInset) => mobileGameplaySettingsStore.update({ actionsInset })}
            />
          </div>
        </div>
        <MobileToggle
          label={`Modo zurdo en ${activeCommand.name}`}
          description="Intercambia movimiento y ataques solo en este comando."
          checked={settings.leftHanded}
          onChange={(leftHanded) => mobileGameplaySettingsStore.update({ leftHanded })}
        />
        <button
          className="mobile-control-profile-reset"
          type="button"
          onClick={() => mobileGameplaySettingsStore.resetControlProfile()}
        >
          Restaurar solo {activeCommand.name}
        </button>
      </section>

      <section className="mobile-settings-card mobile-settings-card--toggles">
        <header><strong>Ajustes generales</strong><span>Se comparten entre ambos comandos.</span></header>
        <MobileToggle
          label="Vibracion tactil"
          description="Confirma saltos, golpes, dano y recargas."
          checked={settings.hapticsEnabled}
          onChange={(hapticsEnabled) => mobileGameplaySettingsStore.update({ hapticsEnabled })}
        />
      </section>

      <section className="mobile-settings-card mobile-settings-card--performance">
        <header><strong>Rendimiento</strong><span>Se aplica sin cambiar la jugabilidad.</span></header>
        <div className="mobile-performance-options">
          {performanceModes.map((mode) => (
            <button
              className={settings.performanceMode === mode.id ? "is-selected" : ""}
              type="button"
              key={mode.id}
              aria-pressed={settings.performanceMode === mode.id}
              onClick={() => mobileGameplaySettingsStore.update({ performanceMode: mode.id })}
            >
              <strong>{mode.label}</strong><small>{mode.description}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ControlPreview({
  scheme,
  settings,
  compact = false,
}: {
  scheme: MobileControlScheme;
  settings?: MobileGameplaySettings;
  compact?: boolean;
}) {
  const style = settings ? {
    "--preview-opacity": settings.controlOpacityPercent / 100,
    "--preview-scale": settings.controlScalePercent / 100,
    "--preview-gap": `${Math.round(settings.controlGap * 0.35)}px`,
    "--preview-movement-inset": `${Math.round(settings.movementInset * 0.18)}px`,
    "--preview-actions-inset": `${Math.round(settings.actionsInset * 0.18)}px`,
  } as CSSProperties : undefined;
  const leftHanded = settings?.leftHanded ?? false;

  return (
    <div
      className={[
        "mobile-command-preview",
        `mobile-command-preview--${scheme}`,
        compact ? "mobile-command-preview--compact" : "",
        leftHanded ? "mobile-command-preview--left-handed" : "",
      ].filter(Boolean).join(" ")}
      style={style}
      aria-hidden="true"
    >
      <span className="mobile-command-preview__jump-zone">SALTO</span>
      {scheme === "command-1" ? (
        <>
          <span className="mobile-command-preview__movement">
            <i>&lsaquo;</i><i>&rsaquo;</i>
          </span>
          <span className="mobile-command-preview__actions mobile-command-preview__actions--row">
            <i>J</i><i>K</i><i>Q</i><i>E</i>
          </span>
        </>
      ) : (
        <>
          <span className="mobile-command-preview__joystick"><i /></span>
          <span className="mobile-command-preview__actions mobile-command-preview__actions--wheel">
            <i className="is-main">J</i><i className="is-top">K</i><i className="is-left">Q</i><i className="is-right">E</i>
          </span>
        </>
      )}
    </div>
  );
}

function MobileSlider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mobile-setting-slider">
      <span><strong>{label}</strong><output>{value}{suffix}</output></span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function MobileToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="mobile-setting-toggle">
      <span><strong>{label}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="mobile-setting-toggle__visual" aria-hidden="true" />
    </label>
  );
}
