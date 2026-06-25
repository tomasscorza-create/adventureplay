import type { PlayerStats } from "../../../shared/types/game";
import { itemDefinitions } from "../../data/items";

export class InventorySystem {
  collect(player: PlayerStats, itemId: string): void {
    const item = itemDefinitions[itemId];
    if (!item) {
      return;
    }

    if (item.type === "coin") {
      player.coins += item.value;
      return;
    }

    player.inventory.push(itemId);
  }
}
