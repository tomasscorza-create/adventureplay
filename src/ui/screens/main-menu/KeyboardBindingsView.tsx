import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  getBindingCodeFromKeyboardEvent,
  getBindingLabel,
  keyboardBindingStore,
  keyboardCommandDefinitions,
  type KeyboardBindingSlot,
  type KeyboardCommandAction,
} from "../../../game/systems/input/KeyboardBindingStore";
import { useKeyboardBindings } from "../../hooks/useKeyboardBindings";

interface EditingBinding {
  action: KeyboardCommandAction;
  slot: KeyboardBindingSlot;
}

export function KeyboardBindingsView() {
  const bindings = useKeyboardBindings();
  const [editing, setEditing] = useState<EditingBinding>();
  const [error, setError] = useState<string>();

  const captureBinding = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    action: KeyboardCommandAction,
    slot: KeyboardBindingSlot,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.code === "Backspace" || event.code === "Delete") {
      const result = keyboardBindingStore.setBinding(action, slot, null);
      setError(result.ok ? undefined : result.error);
      if (result.ok) setEditing(undefined);
      return;
    }

    const code = getBindingCodeFromKeyboardEvent(event.nativeEvent);
    if (!code) {
      setError("Esa tecla no esta disponible. Usa letras, numeros, flechas o teclas de control.");
      return;
    }
    const result = keyboardBindingStore.setBinding(action, slot, code);
    setError(result.ok ? undefined : result.error);
    if (result.ok) setEditing(undefined);
  };

  return (
    <div className="keyboard-settings" aria-label="Configuracion de comandos de teclado">
      <div className="keyboard-settings__intro">
        <div>
          <strong>Comandos de desktop</strong>
          <span>Selecciona una casilla y presiona la nueva tecla. Retroceso o Supr la libera.</span>
        </div>
        <button
          type="button"
          onClick={() => {
            keyboardBindingStore.reset();
            setEditing(undefined);
            setError(undefined);
          }}
        >
          Restaurar
        </button>
      </div>

      {error && <p className="keyboard-settings__error" role="alert">{error}</p>}

      <div className="keyboard-settings__header" aria-hidden="true">
        <span>Accion</span><span>Primario</span><span>Secundario</span>
      </div>
      <div className="keyboard-settings__list">
        {keyboardCommandDefinitions.map(({ action, label, description }) => (
          <div className="keyboard-command" key={action}>
            <span className="keyboard-command__copy">
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
            {(["primary", "secondary"] as const).map((slot) => {
              const isEditing = editing?.action === action && editing.slot === slot;
              return (
                <button
                  className={`keyboard-command__binding${isEditing ? " keyboard-command__binding--editing" : ""}`}
                  type="button"
                  key={slot}
                  onClick={() => {
                    setEditing({ action, slot });
                    setError(undefined);
                  }}
                  onKeyDown={isEditing
                    ? (event) => captureBinding(event, action, slot)
                    : undefined}
                  aria-label={`${slot === "primary" ? "Comando primario" : "Comando secundario"} de ${label}: ${getBindingLabel(bindings[action][slot])}`}
                >
                  {isEditing ? "Presiona..." : getBindingLabel(bindings[action][slot])}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
