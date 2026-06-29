import { useState } from "react";
import {
  powerPackages,
  powerShopLabels,
  type PowerPackage,
  type PurchasablePower,
} from "../../game/data/powerShop";
import type { SaveData } from "../../shared/types/game";
import { AbilityIcon } from "../components/AbilityIcon";

interface PowerShopScreenProps {
  power: PurchasablePower;
  save: SaveData;
  onPurchase: (pack: PowerPackage) => boolean;
  onContinue: () => void;
  onMenu: () => void;
}

export function PowerShopScreen({
  power,
  save,
  onPurchase,
  onContinue,
  onMenu,
}: PowerShopScreenProps) {
  const [pendingPackage, setPendingPackage] = useState<PowerPackage>();
  const [purchaseCompleted, setPurchaseCompleted] = useState(false);
  const [message, setMessage] = useState<string>();
  const labels = powerShopLabels[power];
  const currentCharges = save.characterPowerCharges[save.selectedCharacterId][power];

  const confirmPurchase = () => {
    if (!pendingPackage) {
      return;
    }

    if (!onPurchase(pendingPackage)) {
      setMessage("No tienes suficiente ORO para este paquete.");
      setPendingPackage(undefined);
      return;
    }

    setMessage(undefined);
    setPurchaseCompleted(true);
  };

  return (
    <section className={`overlay power-shop-overlay power-shop-overlay--${labels.tone}`}>
      <div className="power-shop-panel" role="dialog" aria-modal="true" aria-labelledby="power-shop-title">
        <header className="power-shop-panel__header">
          <span className="power-shop-panel__icon"><AbilityIcon type={labels.tone} /></span>
          <div>
            <small>Tienda durante la partida</small>
            <h2 id="power-shop-title">{labels.title}</h2>
          </div>
          <span className="power-shop-panel__balance"><b>{save.player.coins}</b> ORO</span>
        </header>

        {purchaseCompleted && pendingPackage ? (
          <section className="power-shop-result">
            <span className="power-shop-result__check" aria-hidden="true">✓</span>
            <div>
              <small>Compra realizada</small>
              <h3>+{pendingPackage.amount} {labels.unit}</h3>
              <p>Ahora tienes {currentCharges} cargas. ¿Cómo quieres continuar?</p>
            </div>
            <div className="power-shop-result__actions">
              <button className="button" type="button" onClick={onContinue}>Seguir jugando</button>
              <button className="button button--secondary" type="button" onClick={onMenu}>Ir al menú</button>
            </div>
          </section>
        ) : (
          <>
            <div className="power-shop-panel__current">
              <span>Disponibles</span>
              <strong>{currentCharges}</strong>
            </div>

            <div className="power-shop-packages" aria-label={`Paquetes de ${labels.title}`}>
              {powerPackages[power].map((pack) => (
                <button
                  className={`power-shop-package${pendingPackage?.amount === pack.amount ? " is-selected" : ""}`}
                  type="button"
                  key={pack.amount}
                  disabled={save.player.coins < pack.cost}
                  onClick={() => {
                    setPendingPackage(pack);
                    setMessage(undefined);
                  }}
                >
                  <span>+{pack.amount}</span>
                  <strong>{pack.cost}</strong>
                  <small>ORO</small>
                </button>
              ))}
            </div>

            {pendingPackage && (
              <div className="power-shop-confirmation">
                <span>Comprar <b>+{pendingPackage.amount}</b> por <b>{pendingPackage.cost} ORO</b></span>
                <button className="button button--small" type="button" onClick={confirmPurchase}>
                  Confirmar compra
                </button>
              </div>
            )}
            {message && <p className="power-shop-panel__message" role="status">{message}</p>}

            <button className="power-shop-panel__cancel" type="button" onClick={onContinue}>
              Volver a la partida
            </button>
          </>
        )}
      </div>
    </section>
  );
}
