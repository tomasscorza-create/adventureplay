interface PauseScreenProps {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

export function PauseScreen({ onResume, onRestart, onMenu }: PauseScreenProps) {
  return (
    <section className="overlay">
      <div className="panel">
        <span className="panel__eyebrow">Sendero detenido</span>
        <h2>Pausa</h2>
        <p>La niebla queda suspendida hasta que vuelvas al camino.</p>
        <div className="actions">
          <button className="button" type="button" onClick={onResume}>
            Continuar
          </button>
          <button className="button button--secondary" type="button" onClick={onRestart}>
            Reiniciar
          </button>
          <button className="button button--secondary" type="button" onClick={onMenu}>
            Menu
          </button>
        </div>
      </div>
    </section>
  );
}
