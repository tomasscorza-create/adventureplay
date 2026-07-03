import { useMemo, useState } from "react";
import { inventoryCategories, itemDefinitions } from "../../../game/data/items";
import type { InventoryCategoryId, SaveData } from "../../../shared/types/game";
import { MenuHeading } from "./MenuPrimitives";

const categoryIconLabels: Record<InventoryCategoryId, string> = {
  plansKeys: "K",
  toolsWeapons: "A",
  potions: "P",
};

interface InventoryViewProps {
  save: SaveData;
  onBack: () => void;
}

export function InventoryView({ save, onBack }: InventoryViewProps) {
  const [activeInventoryCategoryId, setActiveInventoryCategoryId] = useState<InventoryCategoryId>("plansKeys");
  const inventoryGroups = useMemo(() => {
    const itemCountsByCategory = new Map<InventoryCategoryId, Map<string, number>>();
    for (const itemId of save.player.inventory) {
      const item = itemDefinitions[itemId];
      if (!item?.inventoryCategory) continue;
      const counts = itemCountsByCategory.get(item.inventoryCategory) ?? new Map<string, number>();
      counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
      itemCountsByCategory.set(item.inventoryCategory, counts);
    }
    return inventoryCategories.map((category) => {
      const counts = itemCountsByCategory.get(category.id);
      const items = counts
        ? Array.from(counts.entries()).map(([itemId, amount]) => ({ amount, item: itemDefinitions[itemId] }))
        : [];
      return { ...category, items };
    });
  }, [save.player.inventory]);
  const runMenuAction = (action: () => void) => {
    action();
  };

  return (
<div className="menu-chamber menu-chamber--inventory">
  <MenuHeading title="Inventario" variant="inventory" onBack={onBack} />

  <div className="inventory-screen" aria-label="Inventario del jugador">
    <div className="inventory-screen__summary">
      <span>{save.player.inventory.length} piezas guardadas</span>
      <strong>Frontera Verde</strong>
    </div>

    <div className="inventory-tabs" role="tablist" aria-label="Categorias de inventario">
      {inventoryGroups.map((category) => {
        const isActive = category.id === activeInventoryCategoryId;
        return (
          <button
            className={`inventory-tab inventory-tab--${category.id}${
              isActive ? " inventory-tab--active" : ""
            }`}
            type="button"
            role="tab"
            aria-selected={isActive}
            key={category.id}
            onClick={() => runMenuAction(() => setActiveInventoryCategoryId(category.id))}
          >
            <span className="inventory-tab__seal" aria-hidden="true">
              {categoryIconLabels[category.id]}
            </span>
            <span>{category.name}</span>
            <strong>{category.items.length}</strong>
          </button>
        );
      })}
    </div>

    {inventoryGroups.map((category) => (
      <section
        className={`inventory-page${
          category.id === activeInventoryCategoryId ? " inventory-page--active" : ""
        }`}
        key={category.id}
        hidden={category.id !== activeInventoryCategoryId}
      >
        <div className="inventory-page__header">
          <span>{category.name}</span>
          <strong>{category.items.length} / 12</strong>
        </div>

        <div className="inventory-slots">
          {category.items.map(({ item, amount }) => (
            <article
              className={`inventory-slot inventory-slot--filled inventory-slot--${item.type}`}
              key={item.id}
            >
              <span className="inventory-slot__icon">{item.name.slice(0, 1)}</span>
              <span className="inventory-slot__body">
                <strong>{item.name}</strong>
                <span>{item.description ?? "Pieza recogida durante la aventura."}</span>
              </span>
              {amount > 1 && <span className="inventory-slot__amount">x{amount}</span>}
            </article>
          ))}

          {Array.from({ length: Math.max(0, 6 - category.items.length) }, (_slot, index) => (
            <span className="inventory-slot inventory-slot--empty" key={`${category.id}-empty-${index}`}>
              Ranura vacia
            </span>
          ))}
        </div>
      </section>
    ))}
  </div>
</div>
  );
}
