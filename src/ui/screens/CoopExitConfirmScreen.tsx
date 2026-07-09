interface CoopExitConfirmScreenProps {
  onStay: () => void;
  onLeave: () => void;
}

// Confirmacion de salida durante una partida co-op. La escena no se pausa (la
// sesion seguiria corriendo en el otro dispositivo): este panel solo evita que
// un Esc o un toque accidental en pausa termine la expedicion para ambos.
export function CoopExitConfirmScreen({ onStay, onLeave }: CoopExitConfirmScreenProps) {
  return (
    <section className="overlay overlay--pause">
      <div className="panel panel--pause">
        <span className="panel__eyebrow">Expedicion compartida</span>
        <h2>Salir del cooperativo</h2>
        <p>La partida sigue en curso y no puede pausarse. Si sales, la sesion termina para ambos jugadores.</p>
        <div className="actions">
          <button className="button" type="button" onClick={onStay}>Seguir jugando</button>
          <button className="button button--secondary" type="button" onClick={onLeave}>Salir de la partida</button>
        </div>
      </div>
    </section>
  );
}
