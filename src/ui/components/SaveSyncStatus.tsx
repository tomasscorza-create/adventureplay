import { useEffect, useState } from "react";
import type { SaveSyncState } from "../../game/systems/save/GameSaveStore";

interface SaveSyncStatusProps {
  state: SaveSyncState;
  error?: string;
  quiet?: boolean;
  onRetry: () => Promise<void>;
}

const labels: Record<Exclude<SaveSyncState, "disconnected" | "error">, string> = {
  loading: "Cargando progreso",
  pending: "Guardando progreso",
  synced: "Progreso sincronizado",
};

export function SaveSyncStatus({ state, error, quiet = false, onRetry }: SaveSyncStatusProps) {
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    if (state !== "synced") {
      setShowSynced(false);
      return;
    }

    setShowSynced(true);
    const timeoutId = window.setTimeout(() => setShowSynced(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [state]);

  const hasError = state === "error" || Boolean(error);
  if (
    state === "disconnected"
    || (quiet && !hasError)
    || (state === "synced" && !showSynced && !hasError)
  ) {
    return null;
  }

  const label = hasError
    ? error ?? "No se pudo guardar el progreso."
    : labels[state as Exclude<SaveSyncState, "disconnected" | "error">];

  return (
    <aside
      className={`save-sync-status save-sync-status--${hasError ? "error" : state}`}
      role={hasError ? "alert" : "status"}
      aria-live={hasError ? "assertive" : "polite"}
    >
      <span className="save-sync-status__icon" aria-hidden="true">
        {hasError ? (
          <svg viewBox="0 0 24 24"><path d="M12 3 2.8 20h18.4L12 3Zm0 5.2v6.2m0 3.1v.2" /></svg>
        ) : state === "synced" ? (
          <svg viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7" /></svg>
        ) : (
          <svg className="save-sync-status__spinner" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7" /></svg>
        )}
      </span>
      <span>{label}</span>
      {hasError && (
        <button type="button" onClick={() => void onRetry()}>
          Reintentar
        </button>
      )}
    </aside>
  );
}
