import { coopSession } from "../../game/systems/net/CoopSession";

interface GameOverScreenProps {
  onRestart: () => void;
  onMenu: () => void;
}

export function GameOverScreen({ onRestart, onMenu }: GameOverScreenProps) {
  const isWaiting = coopSession.isActive && coopSession.role === "guest";
  return (
    <section className="overlay overlay--danger">
      <div className="panel">
        <span className="panel__eyebrow">La bruma avanzo</span>
        <h2>Derrota</h2>
        <p>El bosque reclamo el sendero. Vuelve a intentarlo con otro ritmo.</p>
        <div className="actions">
          <button className="button" type="button" onClick={onRestart} disabled={isWaiting}>
            {isWaiting ? "Esperando al anfitrion…" : "Reintentar"}
          </button>
          <button className="button button--secondary" type="button" onClick={onMenu}>
            Menu
          </button>
        </div>
      </div>
    </section>
  );
}
