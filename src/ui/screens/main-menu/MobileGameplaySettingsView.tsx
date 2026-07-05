import type { MobilePerformanceMode } from "../../../game/systems/input/MobileGameplaySettings";
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

export function MobileGameplaySettingsView() {
  const settings = useMobileGameplaySettings();
  return (
    <div className="mobile-gameplay-settings" aria-label="Configuracion de jugabilidad movil">
      <section className="mobile-settings-card mobile-settings-card--scheme">
        <header><strong>Tipo de comando</strong><span>Elige la distribucion tactil para jugar.</span></header>
        <div className="mobile-command-options" role="radiogroup" aria-label="Tipo de comando movil">
          <button
            className={settings.controlScheme === "command-1" ? "is-selected" : ""}
            type="button"
            role="radio"
            aria-checked={settings.controlScheme === "command-1"}
            onClick={() => mobileGameplaySettingsStore.update({ controlScheme: "command-1" })}
          >
            <strong>Comando 1</strong>
            <small>Botones clasicos de movimiento y acciones en fila.</small>
          </button>
          <button
            className={settings.controlScheme === "command-2" ? "is-selected" : ""}
            type="button"
            role="radio"
            aria-checked={settings.controlScheme === "command-2"}
            onClick={() => mobileGameplaySettingsStore.update({ controlScheme: "command-2" })}
          >
            <strong>Comando 2</strong>
            <small>Joystick de movimiento y acciones alrededor del golpe principal.</small>
          </button>
        </div>
      </section>

      <section className="mobile-settings-card mobile-settings-card--controls">
        <header><strong>Controles tactiles</strong><span>Tamano, espacio y posicion.</span></header>
        <MobileSlider
          label="Tamaño"
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
      </section>

      <section className="mobile-settings-card mobile-settings-card--toggles">
        <MobileToggle
          label="Modo zurdo"
          description="Intercambia movimiento y ataques."
          checked={settings.leftHanded}
          onChange={(leftHanded) => mobileGameplaySettingsStore.update({ leftHanded })}
        />
        <MobileToggle
          label="Vibracion tactil"
          description="Confirma saltos, golpes, daño y recargas."
          checked={settings.hapticsEnabled}
          onChange={(hapticsEnabled) => mobileGameplaySettingsStore.update({ hapticsEnabled })}
        />
      </section>

      <section className="mobile-settings-card">
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

      <button
        className="mobile-settings-reset"
        type="button"
        onClick={() => mobileGameplaySettingsStore.reset()}
      >
        Restaurar ajustes moviles
      </button>
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
