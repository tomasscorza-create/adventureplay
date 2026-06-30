import { useRegisterSW } from "virtual:pwa-register/react";

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  return (
    <aside className="pwa-update" role="status" aria-live="polite">
      <div className="pwa-update__copy">
        <strong>Nueva version disponible</strong>
        <span>Actualiza cuando termines tu partida.</span>
      </div>
      <div className="pwa-update__actions">
        <button type="button" onClick={() => void updateServiceWorker(true)}>
          Actualizar
        </button>
        <button
          type="button"
          className="pwa-update__later"
          onClick={() => setNeedRefresh(false)}
        >
          Luego
        </button>
      </div>
    </aside>
  );
}
