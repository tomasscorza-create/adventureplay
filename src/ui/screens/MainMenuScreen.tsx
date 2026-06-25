interface MainMenuScreenProps {
  onStart: () => void;
}

export function MainMenuScreen({ onStart }: MainMenuScreenProps) {
  return (
    <section className="overlay overlay--menu">
      <div className="panel panel--menu">
        <span className="panel__eyebrow">Saga del Bosque Antiguo</span>
        <h1>Superjuego</h1>
        <p>Primer sendero de una aventura 2D entre ruinas, hongos brillantes y guardianes del bosque.</p>
        <div className="actions">
          <button className="button" type="button" onClick={onStart}>
            Iniciar partida
          </button>
        </div>
      </div>
    </section>
  );
}
