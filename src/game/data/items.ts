import type { InventoryCategoryId, ItemDefinition } from "../../shared/types/game";

export const inventoryCategories: Array<{ id: InventoryCategoryId; name: string }> = [
  { id: "plansKeys", name: "Planos y llaves" },
  { id: "toolsWeapons", name: "Herramientas y armas" },
  { id: "potions", name: "Pociones" },
];

export const itemDefinitions: Record<string, ItemDefinition> = {
  bronzeCoin: {
    id: "bronzeCoin",
    name: "ORO",
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
  ancientMechanism: {
    id: "ancientMechanism",
    name: "Mecanismo antiguo",
    type: "resource",
    value: 1,
    inventoryCategory: "toolsWeapons",
    description: "Engranaje recuperado en una camara de ingenio.",
  },
  runicCounterweight: {
    id: "runicCounterweight",
    name: "Contrapeso runico",
    type: "resource",
    value: 1,
    inventoryCategory: "toolsWeapons",
    description: "Pesa calibrada que conserva el pulso de una camara antigua.",
  },
  echoPrism: {
    id: "echoPrism",
    name: "Prisma de eco",
    type: "resource",
    value: 1,
    inventoryCategory: "plansKeys",
    description: "Cristal que replica brevemente la energia de los sellos.",
  },
  architectCore: {
    id: "architectCore",
    name: "Nucleo del arquitecto",
    type: "resource",
    value: 1,
    inventoryCategory: "toolsWeapons",
    description: "Mecanismo maestro del reloj que gobierna las cuatro camaras.",
  },
  ancientGear: {
    id: "ancientGear",
    name: "Engranaje antiguo",
    type: "resource",
    value: 1,
    inventoryCategory: "toolsWeapons",
    description: "Engranaje del laberinto recuperado en la quinta camara.",
  },
  architectScepter: {
    id: "architectScepter",
    name: "Cetro del arquitecto",
    type: "resource",
    value: 1,
    inventoryCategory: "toolsWeapons",
    description: "Cetro dorado obtenido al superar el gran templo de contrapesos.",
  },
};

export const randomInventoryRewardItemIds = Object.values(itemDefinitions)
  .filter((item) => Boolean(item.inventoryCategory))
  .map((item) => item.id);
