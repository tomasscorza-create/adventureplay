interface GameOverScreenProps {
  onRestart: () => void;
  onMenu: () => void;
}

export function GameOverScreen({ onRestart, onMenu }: GameOverScreenProps) {
  return (
    <section className="overlay overlay--danger">
      <div className="panel">
        <span className="panel__eyebrow">La bruma avanzo</span>
        <h2>Derrota</h2>
        <p>El bosque reclamo el sendero. Vuelve a intentarlo con otro ritmo.</p>
        <div className="actions">
          <button className="button" type="button" onClick={onRestart}>
            Reintentar
          </button>
          <button className="button button--secondary" type="button" onClick={onMenu}>
            Menu
          </button>
        </div>
      </div>
    </section>
  );
}
