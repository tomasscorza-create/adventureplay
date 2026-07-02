import { useState } from "react";
import { getNextCharacterUnlockRequirement } from "../../../game/data/characterUnlocks";
import { playableCharacters } from "../../../game/data/characters";
import {
  powerPackages,
  type PowerPackage,
  type PurchasablePower,
} from "../../../game/data/powerShop";
import { gameAudio } from "../../../shared/audio/GameAudio";
import type { CharacterId, SaveData } from "../../../shared/types/game";
import { AbilityIcon } from "../../components/AbilityIcon";
import { MenuHeading } from "./MenuPrimitives";
import { formatCompactAmount } from "./menuUtils";

interface CharacterDetailProps {
  characterId: CharacterId;
  save: SaveData;
  onBack: () => void;
  onPurchase: (
    characterId: CharacterId,
    power: "healingCharges" | "powerCharges",
    amount: number,
    cost: number,
  ) => boolean;
  onUnlock: (characterId: CharacterId) => boolean;
}

export function CharacterDetail({
  characterId,
  save,
  onBack,
  onPurchase,
  onUnlock,
}: CharacterDetailProps) {
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string>();
  const [pendingPurchase, setPendingPurchase] = useState<{
    power: PurchasablePower;
    pack: PowerPackage;
  }>();
  const [showUnlockConfirmation, setShowUnlockConfirmation] = useState(false);
  const character = playableCharacters.find((candidate) => candidate.id === characterId);
  if (!character) {
    return null;
  }

  const powerCharges = save.characterPowerCharges[characterId];
  const isUnlocked = save.unlockedCharacterIds.includes(characterId);
  const unlockRequirement = getNextCharacterUnlockRequirement(save.unlockedCharacterIds);
  const hasUnlockLevel = save.player.level >= unlockRequirement.requiredLevel;
  const canAffordUnlock = save.player.coins >= unlockRequirement.cost;
  const canUnlock = hasUnlockLevel && canAffordUnlock;
  const requestPackage = (power: PurchasablePower, pack: PowerPackage) => {
    gameAudio.playUiSelect();
    setPurchaseMessage(undefined);
    setPendingPurchase({ power, pack });
  };
  const confirmPurchase = () => {
    if (!pendingPurchase) {
      return;
    }

    gameAudio.playUiSelect();
    const { power, pack } = pendingPurchase;
    const purchased = onPurchase(characterId, power, pack.amount, pack.cost);
    setPurchaseMessage(
      purchased
        ? `Compra realizada: +${pack.amount} ${power === "healingCharges" ? "regeneraciones" : "ataques letales"}.`
        : "No tienes suficiente ORO.",
    );
    setPendingPurchase(undefined);
  };

  return (
    <>
      <MenuHeading eyebrow="Ficha de heroe" title={character.name} onBack={onBack} backLabel="Heroes" />
      <section className="character-detail" aria-label={`Poderes disponibles de ${character.name}`}>
        <div className="character-detail__portrait-frame">
          <img src={character.portraitUrl} alt={character.name} />
          <strong>{character.name}</strong>
        </div>
        <div className="character-detail__content">
          {isUnlocked ? (
            <button
              className="character-shop-trigger"
              type="button"
              aria-expanded={isShopOpen}
              onClick={() => {
                gameAudio.playUiSelect();
                setPurchaseMessage(undefined);
                setPendingPurchase(undefined);
                setIsShopOpen((isOpen) => !isOpen);
              }}
            >
              <span className="character-shop-trigger__coin" aria-hidden="true">O</span>
              <span>{isShopOpen ? "Cerrar tienda" : "Comprar poderes"}</span>
              <ShopIcon />
              <strong>{save.player.coins} ORO</strong>
            </button>
          ) : (
            <button
              className="character-unlock-trigger"
              type="button"
              disabled={!canUnlock}
              onClick={() => {
                gameAudio.playUiSelect();
                setShowUnlockConfirmation(true);
              }}
            >
              <span className="character-shop-trigger__coin" aria-hidden="true">O</span>
              <span>
                Desbloquear a {character.name} · LV {unlockRequirement.requiredLevel}
              </span>
              <strong>{formatCompactAmount(unlockRequirement.cost)} ORO</strong>
            </button>
          )}

          {isUnlocked && isShopOpen ? (
            <div className="character-shop" aria-label={`Tienda de poderes para ${character.name}`}>
              <PowerPackageGroup
                title="Regenerador de vida"
                power="healingCharges"
                packages={powerPackages.healingCharges}
                coins={save.player.coins}
                onBuy={requestPackage}
              />
              <PowerPackageGroup
                title="Ataque letal"
                power="powerCharges"
                packages={powerPackages.powerCharges}
                coins={save.player.coins}
                onBuy={requestPackage}
              />
              {pendingPurchase && (
                <div className="purchase-confirmation" role="dialog" aria-modal="true" aria-label="Confirmar compra">
                  <span className="purchase-confirmation__icon" aria-hidden="true">
                    <AbilityIcon type={pendingPurchase.power === "healingCharges" ? "heal" : "power"} />
                  </span>
                  <div className="purchase-confirmation__copy">
                    <strong>Confirmar compra</strong>
                    <span>
                      +{pendingPurchase.pack.amount} {pendingPurchase.power === "healingCharges" ? "regeneraciones" : "ataques letales"} para {character.name}
                    </span>
                    <b>{pendingPurchase.pack.cost} ORO</b>
                  </div>
                  <div className="purchase-confirmation__actions">
                    <button
                      className="purchase-confirmation__cancel"
                      type="button"
                      onClick={() => {
                        gameAudio.playUiSelect();
                        setPendingPurchase(undefined);
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      className="purchase-confirmation__confirm"
                      type="button"
                      onClick={confirmPurchase}
                    >
                      Confirmar compra
                    </button>
                  </div>
                </div>
              )}
              {purchaseMessage && <p className="character-shop__message" role="status">{purchaseMessage}</p>}
            </div>
          ) : (
            <div className="character-detail__powers">
              <article className="character-detail__power character-detail__power--heal">
                <span className="character-detail__power-icon">
                  <AbilityIcon type="heal" />
                </span>
                <span>Regeneraciones disponibles</span>
                <strong>{powerCharges.healingCharges}</strong>
              </article>
              <article className="character-detail__power character-detail__power--lethal">
                <span className="character-detail__power-icon">
                  <AbilityIcon type="power" />
                </span>
                <span>Poderes letales disponibles</span>
                <strong>{powerCharges.powerCharges}</strong>
              </article>
            </div>
          )}
          {showUnlockConfirmation && !isUnlocked && (
            <div className="purchase-confirmation" role="dialog" aria-modal="true" aria-label="Confirmar desbloqueo">
              <span className="purchase-confirmation__icon" aria-hidden="true">
                LV{unlockRequirement.requiredLevel}
              </span>
              <div className="purchase-confirmation__copy">
                <strong>Desbloquear a {character.name}</strong>
                <span>
                  Desbloqueo permanente #{unlockRequirement.unlockNumber}. Requiere LV {unlockRequirement.requiredLevel}.
                </span>
                <b>{unlockRequirement.cost.toLocaleString("es-AR")} ORO</b>
              </div>
              <div className="purchase-confirmation__actions">
                <button
                  className="purchase-confirmation__cancel"
                  type="button"
                  onClick={() => {
                    gameAudio.playUiSelect();
                    setShowUnlockConfirmation(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="purchase-confirmation__confirm"
                  type="button"
                  onClick={() => {
                    gameAudio.playUiSelect();
                    const unlocked = onUnlock(characterId);
                    setShowUnlockConfirmation(false);
                    setPurchaseMessage(
                      unlocked
                        ? `${character.name} fue desbloqueado.`
                        : "No cumples el nivel o el ORO requerido.",
                    );
                  }}
                >
                  Confirmar desbloqueo
                </button>
              </div>
            </div>
          )}
          {purchaseMessage && !isShopOpen && <p className="character-shop__message" role="status">{purchaseMessage}</p>}
        </div>
      </section>
    </>
  );
}

function PowerPackageGroup({
  title,
  power,
  packages,
  coins,
  onBuy,
}: {
  title: string;
  power: PurchasablePower;
  packages: PowerPackage[];
  coins: number;
  onBuy: (power: PurchasablePower, pack: PowerPackage) => void;
}) {
  return (
    <section className={`power-package-group power-package-group--${power}`}>
      <div className="power-package-group__title">
        <AbilityIcon type={power === "healingCharges" ? "heal" : "power"} />
        <strong>{title}</strong>
      </div>
      <div className="power-package-list">
        {packages.map((pack) => (
          <button
            className="power-package"
            type="button"
            key={pack.amount}
            disabled={coins < pack.cost}
            onClick={() => onBuy(power, pack)}
            aria-label={`Comprar ${pack.amount} por ${pack.cost} ORO`}
          >
            <span>+{pack.amount}</span>
            <strong>{pack.cost}</strong>
            <small>ORO</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function ShopIcon() {
  return (
    <svg className="character-shop-trigger__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 7H7" />
      <circle cx="10" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  );
}
