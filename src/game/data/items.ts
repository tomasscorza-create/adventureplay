import type { InventoryCategoryId, ItemDefinition } from "../../shared/types/game";

export const inventoryCategories: Array<{ id: InventoryCategoryId; name: string }> = [
  { id: "plansKeys", name: "Planos y llaves" },
  { id: "toolsWeapons", name: "Herramientas y armas" },
  { id: "potions", name: "Pociones" },
];

export const itemDefinitions: Record<string, ItemDefinition> = {
  bronzeCoin: {
    id: "bronzeCoin",
    name: "Bronze Coin",
    type: "coin",
    value: 1,
  },
  forestGatePlan: {
    id: "forestGatePlan",
    name: "Plano de compuerta",
    type: "resource",
    value: 1,
    inventoryCategory: "plansKeys",
    description: "Pieza de ruta para desbloqueos del continente.",
  },
  oldIronKey: {
    id: "oldIronKey",
    name: "Llave de hierro",
    type: "resource",
    value: 1,
    inventoryCategory: "plansKeys",
    description: "Llave para accesos cerrados de Frontera Verde.",
  },
  fieldHook: {
    id: "fieldHook",
    name: "Gancho de campo",
    type: "resource",
    value: 1,
    inventoryCategory: "toolsWeapons",
    description: "Herramienta preparada para futuras rutas especiales.",
  },
  trainingBlade: {
    id: "trainingBlade",
    name: "Hoja de practica",
    type: "resource",
    value: 1,
    inventoryCategory: "toolsWeapons",
    description: "Arma base para futuras mejoras.",
  },
  smallHealthPotion: {
    id: "smallHealthPotion",
    name: "Pocion menor",
    type: "consumable",
    value: 1,
    inventoryCategory: "potions",
    description: "Consumible de recuperacion para sistemas futuros.",
  },
};
