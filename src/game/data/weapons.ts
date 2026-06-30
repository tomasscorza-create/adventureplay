import type { WeaponDefinition, WeaponId } from "../../shared/types/game";

export const weaponDefinitions: Record<WeaponId, WeaponDefinition> = {
  "sword-1": {
    id: "sword-1",
    textureKey: "weapon-sword-1",
    scale: 0.24,
    origin: { x: 17 / 155, y: 12 / 135 },
  },
};
