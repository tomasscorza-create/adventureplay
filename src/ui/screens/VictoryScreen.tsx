import type { HudState } from "../../shared/types/game";

interface VictoryScreenProps {
  hud: HudState;
  onRestart: () => void;
  onMenu: () => void;
}

export function VictoryScreen({ hud, onRestart, onMenu }: VictoryScreenProps) {
  return (
    <section className="overlay overlay--victory">
      <div className="panel">
        <span className="panel__eyebrow">Sendero conquistado</span>
        <h2>Victoria</h2>
        <p>
          Nivel completado con {hud.coins} ORO y nivel {hud.level}.
        </p>
        <div className="actions">
          <button className="button" type="button" onClick={onRestart}>
            Jugar otra vez
          </button>
          <button className="button button--secondary" type="button" onClick={onMenu}>
            Menu
          </button>
        </div>
      </div>
    </section>
  );
}
