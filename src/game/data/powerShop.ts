export type PurchasablePower = "healingCharges" | "powerCharges";

export interface PowerPackage {
  amount: number;
  cost: number;
}

export const powerPackages: Record<PurchasablePower, PowerPackage[]> = {
  healingCharges: [
    { amount: 3, cost: 350 },
    { amount: 5, cost: 490 },
    { amount: 12, cost: 750 },
  ],
  powerCharges: [
    { amount: 10, cost: 200 },
    { amount: 25, cost: 390 },
    { amount: 60, cost: 750 },
  ],
};

export const powerShopLabels: Record<PurchasablePower, {
  title: string;
  unit: string;
  tone: "heal" | "power";
}> = {
  healingCharges: {
    title: "Regeneración de vida",
    unit: "regeneraciones",
    tone: "heal",
  },
  powerCharges: {
    title: "Ataque letal",
    unit: "ataques letales",
    tone: "power",
  },
};
