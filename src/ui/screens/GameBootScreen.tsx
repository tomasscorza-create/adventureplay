interface GameBootScreenProps {
  failed: boolean;
  onRetry: () => void;
}

export function GameBootScreen({ failed, onRetry }: GameBootScreenProps) {
  return (
    <section className="overlay overlay--menu" role="status" aria-live="polite">
      <div className="auth-panel">
        <span className="panel__eyebrow">Preparando aventura</span>
        <h1>{failed ? "No pudimos cargar el juego" : "Cargando mundo"}</h1>
        <p className={failed ? "auth-error" : "auth-notice"}>
          {failed
            ? "Revisa la conexión e intenta cargar los recursos nuevamente."
            : "Estamos cargando el motor y los recursos de tu partida."}
        </p>
        {failed && (
          <button className="button" type="button" onClick={onRetry}>
            Reintentar
          </button>
        )}
      </div>
    </section>
  );
}
