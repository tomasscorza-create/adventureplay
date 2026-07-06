import type { LevelCoinSpawn, PlatformDefinition } from "../../shared/types/game";

export type PuzzleActivationId = string;

interface PuzzleObstacleDefinition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PuzzleLevelDefinition {
  id: string;
  name: string;
  stageNumber: number;
  nextLevelId?: string;
  difficultyRating: number;
  worldWidth: number;
  timeLimitSeconds: number;
  experienceReward: number;
  playerStart: { x: number; y: number };
  platforms: PlatformDefinition[];
  coins: LevelCoinSpawn[];
  crates: Array<{ x: number; y: number }>;
  plates: Array<{ id: string; x: number; y: number; width: number }>;
  levers: Array<{ id: string; x: number; y: number }>;
  gates: Array<{ id: string; x: number; y: number; width: number; height: number; requiredActivations?: string[] }>;
  boxJumpZones?: Array<{ x: number; y: number; width: number }>;
  seals: PuzzleObstacleDefinition[];
  hazards: Array<PuzzleObstacleDefinition & { damage: number }>;
  inventoryReward: { claimId: string; itemId: string; x: number; y: number };
  goal: { x: number; y: number };
  requiredActivations: PuzzleActivationId[];
  supportsCooperative: boolean;

  // Retrocompatibilidad para campos singulares
  crate?: { x: number; y: number };
  boxJumpZone?: { x: number; y: number; width: number };
  plate?: { x: number; y: number; width: number };
  lever?: { x: number; y: number };
  gate?: PuzzleObstacleDefinition;
}

export const puzzleLevelOrder = [
  "trialChamber1",
  "trialChamber2",
  "trialChamber3",
  "trialChamber4",
  "trialChamber5",
  "trialChamber6",
] as const;

export const puzzleLevelDefinitions: Record<string, PuzzleLevelDefinition> = {
  trialChamber1: {
    id: "trialChamber1",
    name: "La camara de los dos sellos",
    stageNumber: 1,
    nextLevelId: "trialChamber2",
    difficultyRating: 100,
    worldWidth: 2400,
    timeLimitSeconds: 150,
    experienceReward: 180,
    playerStart: { x: 150, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 2400, height: 80 },
      { x: 980, y: 410, width: 380, height: 28 },
      { x: 1910, y: 520, width: 210, height: 24 },
    ],
    coins: [
      { itemId: "bronzeCoin", x: 300, y: 580, value: 2 },
      { itemId: "bronzeCoin", x: 700, y: 580, value: 3 },
      { itemId: "bronzeCoin", x: 1110, y: 350, value: 3 },
      { itemId: "bronzeCoin", x: 1450, y: 500, value: 3 },
      { itemId: "bronzeCoin", x: 2050, y: 460, value: 4 },
    ],
    crates: [{ x: 520, y: 560 }],
    plates: [{ id: "crate-plate", x: 1730, y: 625, width: 92 }],
    levers: [{ id: "upper-lever", x: 1190, y: 362 }],
    gates: [
      { id: "main-gate", x: 1600, y: 0, width: 54, height: 640, requiredActivations: ["upper-lever"] },
    ],
    boxJumpZones: [{ x: 925, y: 625, width: 82 }],
    seals: [{ x: 1940, y: 520, width: 54, height: 120 }],
    hazards: [{ x: 2140, y: 610, width: 110, height: 30, damage: 1 }],
    inventoryReward: {
      claimId: "trialChamber1:mechanism",
      itemId: "ancientMechanism",
      x: 1840,
      y: 575,
    },
    goal: { x: 2320, y: 560 },
    requiredActivations: ["crate-plate", "upper-lever"],
    supportsCooperative: true,

    // Compatibilidad singular
    crate: { x: 520, y: 560 },
    boxJumpZone: { x: 925, y: 625, width: 82 },
    plate: { x: 1730, y: 625, width: 92 },
    lever: { x: 1190, y: 362 },
    gate: { x: 1600, y: 0, width: 54, height: 640 },
  },
  trialChamber2: {
    id: "trialChamber2",
    name: "El corredor del contrapeso",
    stageNumber: 2,
    nextLevelId: "trialChamber3",
    difficultyRating: 123,
    worldWidth: 2900,
    timeLimitSeconds: 145,
    experienceReward: 220,
    playerStart: { x: 140, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 2900, height: 80 },
      { x: 1070, y: 410, width: 500, height: 26 },
      { x: 2110, y: 500, width: 190, height: 24 },
      { x: 2470, y: 450, width: 180, height: 24 },
    ],
    coins: [
      { itemId: "bronzeCoin", x: 280, y: 580, value: 3 },
      { itemId: "bronzeCoin", x: 760, y: 580, value: 3 },
      { itemId: "bronzeCoin", x: 1180, y: 350, value: 4 },
      { itemId: "bronzeCoin", x: 1430, y: 350, value: 4 },
      { itemId: "bronzeCoin", x: 2200, y: 440, value: 3 },
      { itemId: "bronzeCoin", x: 2550, y: 390, value: 3 },
    ],
    crates: [{ x: 470, y: 560 }],
    plates: [{ id: "crate-plate", x: 1900, y: 625, width: 82 }],
    levers: [{ id: "upper-lever", x: 1430, y: 362 }],
    gates: [
      { id: "main-gate", x: 1770, y: 0, width: 56, height: 640, requiredActivations: ["upper-lever"] },
    ],
    boxJumpZones: [{ x: 1015, y: 625, width: 76 }],
    seals: [
      { x: 2110, y: 500, width: 52, height: 140 },
      { x: 2460, y: 500, width: 52, height: 140 },
    ],
    hazards: [
      { x: 810, y: 610, width: 85, height: 30, damage: 1 },
      { x: 2250, y: 610, width: 120, height: 30, damage: 1 },
    ],
    inventoryReward: {
      claimId: "trialChamber2:counterweight",
      itemId: "runicCounterweight",
      x: 2000,
      y: 575,
    },
    goal: { x: 2815, y: 560 },
    requiredActivations: ["crate-plate", "upper-lever"],
    supportsCooperative: true,

    // Compatibilidad singular
    crate: { x: 470, y: 560 },
    boxJumpZone: { x: 1015, y: 625, width: 76 },
    plate: { x: 1900, y: 625, width: 82 },
    lever: { x: 1430, y: 362 },
    gate: { x: 1770, y: 0, width: 56, height: 640 },
  },
  trialChamber3: {
    id: "trialChamber3",
    name: "La galeria de las tres rupturas",
    stageNumber: 3,
    nextLevelId: "trialChamber4",
    difficultyRating: 152,
    worldWidth: 3500,
    timeLimitSeconds: 150,
    experienceReward: 270,
    playerStart: { x: 140, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 3500, height: 80 },
      { x: 800, y: 520, width: 40, height: 120 }, // Pared del canal de disparo
      { x: 800, y: 440, width: 220, height: 24 }, // Techo del canal de disparo
      { x: 1170, y: 410, width: 470, height: 25 },
      { x: 2250, y: 510, width: 150, height: 24 },
      { x: 2580, y: 440, width: 190, height: 24 },
      { x: 2950, y: 500, width: 150, height: 24 },
    ],
    coins: [
      { itemId: "bronzeCoin", x: 300, y: 580, value: 3 },
      { itemId: "bronzeCoin", x: 820, y: 580, value: 4 },
      { itemId: "bronzeCoin", x: 1260, y: 350, value: 4 },
      { itemId: "bronzeCoin", x: 1510, y: 350, value: 4 },
      { itemId: "bronzeCoin", x: 2320, y: 450, value: 4 },
      { itemId: "bronzeCoin", x: 2660, y: 380, value: 4 },
      { itemId: "bronzeCoin", x: 3200, y: 580, value: 3 },
    ],
    crates: [
      { x: 520, y: 560 },
      { x: 1400, y: 350 },
    ],
    plates: [{ id: "crate-plate", x: 2030, y: 625, width: 78 }],
    levers: [
      { id: "upper-lever", x: 1510, y: 362 },
      { id: "lever-dist", x: 950, y: 520 }, // Palanca a distancia
    ],
    gates: [
      { id: "gate-dist", x: 1060, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
      { id: "main-gate", x: 1870, y: 0, width: 58, height: 640, requiredActivations: ["upper-lever"] },
    ],
    boxJumpZones: [{ x: 1115, y: 625, width: 72 }],
    seals: [
      { x: 2200, y: 490, width: 54, height: 150 },
      { x: 2520, y: 470, width: 54, height: 170 },
      { x: 2900, y: 490, width: 54, height: 150 },
    ],
    hazards: [
      { x: 870, y: 610, width: 105, height: 30, damage: 1 },
      { x: 2170, y: 610, width: 120, height: 30, damage: 1 },
      { x: 2720, y: 610, width: 125, height: 30, damage: 1 },
      { x: 3100, y: 610, width: 100, height: 30, damage: 1 },
    ],
    inventoryReward: {
      claimId: "trialChamber3:prism",
      itemId: "echoPrism",
      x: 2110,
      y: 575,
    },
    goal: { x: 3410, y: 560 },
    requiredActivations: ["crate-plate", "upper-lever", "lever-dist"],
    supportsCooperative: true,

    // Compatibilidad singular
    crate: { x: 520, y: 560 },
    boxJumpZone: { x: 1115, y: 625, width: 72 },
    plate: { x: 2030, y: 625, width: 78 },
    lever: { x: 1510, y: 362 },
    gate: { x: 1870, y: 0, width: 58, height: 640 },
  },
  trialChamber4: {
    id: "trialChamber4",
    name: "El reloj del arquitecto",
    stageNumber: 4,
    nextLevelId: "trialChamber5",
    difficultyRating: 188,
    worldWidth: 4200,
    timeLimitSeconds: 160,
    experienceReward: 330,
    playerStart: { x: 130, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 4200, height: 80 },
      { x: 1270, y: 410, width: 470, height: 24 },
      { x: 1700, y: 500, width: 40, height: 140 }, // Pared del canal de disparo
      { x: 1700, y: 420, width: 160, height: 24 }, // Techo del canal de disparo
      { x: 2380, y: 480, width: 150, height: 24 },
      { x: 2740, y: 400, width: 180, height: 24 },
      { x: 3100, y: 480, width: 150, height: 24 },
      { x: 3470, y: 420, width: 160, height: 24 },
      { x: 3790, y: 500, width: 140, height: 24 },
    ],
    coins: [
      { itemId: "bronzeCoin", x: 280, y: 580, value: 4 },
      { itemId: "bronzeCoin", x: 860, y: 580, value: 4 },
      { itemId: "bronzeCoin", x: 1360, y: 350, value: 4 },
      { itemId: "bronzeCoin", x: 1590, y: 350, value: 4 },
      { itemId: "bronzeCoin", x: 2460, y: 420, value: 4 },
      { itemId: "bronzeCoin", x: 2820, y: 340, value: 4 },
      { itemId: "bronzeCoin", x: 3180, y: 420, value: 4 },
      { itemId: "bronzeCoin", x: 3870, y: 440, value: 4 },
    ],
    crates: [
      { x: 500, y: 560 },
      { x: 2400, y: 420 },
    ],
    plates: [{ id: "crate-plate", x: 2160, y: 625, width: 74 }],
    levers: [
      { id: "upper-lever", x: 1590, y: 362 },
      { id: "lever-dist", x: 1800, y: 500 }, // Palanca a distancia
    ],
    gates: [
      { id: "gate-dist", x: 1910, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
      { id: "main-gate", x: 2050, y: 0, width: 60, height: 640, requiredActivations: ["upper-lever"] },
    ],
    boxJumpZones: [{ x: 1215, y: 625, width: 68 }],
    seals: [
      { x: 2350, y: 470, width: 56, height: 170 },
      { x: 2680, y: 460, width: 56, height: 180 },
      { x: 3050, y: 470, width: 56, height: 170 },
      { x: 3420, y: 460, width: 56, height: 180 },
    ],
    hazards: [
      { x: 900, y: 610, width: 110, height: 30, damage: 1 },
      { x: 2290, y: 610, width: 120, height: 30, damage: 1 },
      { x: 2840, y: 610, width: 130, height: 30, damage: 1 },
      { x: 3240, y: 610, width: 120, height: 30, damage: 1 },
      { x: 3660, y: 610, width: 120, height: 30, damage: 1 },
    ],
    inventoryReward: {
      claimId: "trialChamber4:architect-core",
      itemId: "architectCore",
      x: 2250,
      y: 575,
    },
    goal: { x: 4110, y: 560 },
    requiredActivations: ["crate-plate", "upper-lever", "lever-dist"],
    supportsCooperative: true,

    // Compatibilidad singular
    crate: { x: 500, y: 560 },
    boxJumpZone: { x: 1215, y: 625, width: 68 },
    plate: { x: 2160, y: 625, width: 74 },
    lever: { x: 1590, y: 362 },
    gate: { x: 1990, y: 0, width: 60, height: 640 },
  },
  trialChamber5: {
    id: "trialChamber5",
    name: "La camara del laberinto",
    stageNumber: 5,
    nextLevelId: "trialChamber6",
    difficultyRating: 231,
    worldWidth: 4600,
    timeLimitSeconds: 180,
    experienceReward: 420,
    playerStart: { x: 150, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 4600, height: 80 },
      { x: 800, y: 450, width: 350, height: 24 },
      { x: 1500, y: 400, width: 400, height: 24 },
      { x: 2300, y: 430, width: 400, height: 24 },
      { x: 2500, y: 310, width: 40, height: 120 }, // Pared del canal de disparo
      { x: 2500, y: 230, width: 160, height: 24 }, // Techo del canal de disparo
      { x: 3100, y: 480, width: 350, height: 24 },
    ],
    coins: [
      { itemId: "bronzeCoin", x: 400, y: 580, value: 5 },
      { itemId: "bronzeCoin", x: 950, y: 390, value: 5 },
      { itemId: "bronzeCoin", x: 1700, y: 340, value: 5 },
      { itemId: "bronzeCoin", x: 2500, y: 370, value: 5 },
      { itemId: "bronzeCoin", x: 3300, y: 420, value: 5 },
    ],
    crates: [
      { x: 600, y: 560 },
      { x: 1600, y: 320 },
      { x: 3200, y: 400 },
    ],
    plates: [
      { id: "plate-1", x: 1200, y: 625, width: 80 },
      { id: "plate-2", x: 2800, y: 625, width: 80 },
    ],
    levers: [
      { id: "lever-1", x: 1800, y: 332 },
      { id: "lever-dist", x: 2600, y: 310 }, // Palanca a distancia
    ],
    gates: [
      { id: "gate-1", x: 1400, y: 0, width: 50, height: 640, requiredActivations: ["plate-1"] },
      { id: "gate-2", x: 2100, y: 0, width: 50, height: 640, requiredActivations: ["lever-1"] },
      { id: "gate-dist", x: 2700, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
      { id: "gate-3", x: 3700, y: 0, width: 50, height: 640, requiredActivations: ["plate-2"] },
    ],
    seals: [
      { x: 3900, y: 520, width: 50, height: 120 },
    ],
    hazards: [
      { x: 1000, y: 610, width: 120, height: 30, damage: 1 },
      { x: 1800, y: 610, width: 150, height: 30, damage: 1 },
      { x: 2900, y: 610, width: 150, height: 30, damage: 1 },
    ],
    inventoryReward: {
      claimId: "trialChamber5:ancient-gear",
      itemId: "ancientGear",
      x: 3500,
      y: 575,
    },
    goal: { x: 4400, y: 560 },
    requiredActivations: ["plate-1", "lever-1", "plate-2", "lever-dist"],
    supportsCooperative: true,

    // Compatibilidad singular
    crate: { x: 600, y: 560 },
    plate: { x: 1200, y: 625, width: 80 },
    lever: { x: 1800, y: 332 },
    gate: { x: 1400, y: 0, width: 50, height: 640 },
  },
  trialChamber6: {
    id: "trialChamber6",
    name: "El templo de los contrapesos",
    stageNumber: 6,
    difficultyRating: 285,
    worldWidth: 5000,
    timeLimitSeconds: 200,
    experienceReward: 500,
    playerStart: { x: 150, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 5000, height: 80 },
      { x: 450, y: 520, width: 150, height: 24 },
      { x: 700, y: 400, width: 300, height: 24 },
      { x: 1400, y: 450, width: 400, height: 24 },
      { x: 2200, y: 380, width: 450, height: 24 },
      { x: 2900, y: 360, width: 40, height: 280 }, // Pared del canal de disparo
      { x: 2900, y: 280, width: 160, height: 24 }, // Techo del canal de disparo
      { x: 3200, y: 420, width: 400, height: 24 },
      { x: 4000, y: 460, width: 300, height: 24 },
    ],
    coins: [
      { itemId: "bronzeCoin", x: 850, y: 340, value: 5 },
      { itemId: "bronzeCoin", x: 1600, y: 390, value: 5 },
      { itemId: "bronzeCoin", x: 2400, y: 320, value: 5 },
      { itemId: "bronzeCoin", x: 3400, y: 360, value: 5 },
      { itemId: "bronzeCoin", x: 4150, y: 400, value: 5 },
    ],
    crates: [
      { x: 800, y: 320 },
      { x: 1500, y: 560 },
      { x: 3300, y: 340 },
    ],
    plates: [
      { id: "plate-1", x: 1100, y: 625, width: 80 },
      { id: "plate-2", x: 2000, y: 625, width: 80 },
      { id: "plate-3", x: 3700, y: 625, width: 80 },
    ],
    levers: [
      { id: "lever-1", x: 2350, y: 332 },
      { id: "lever-dist", x: 3000, y: 360 }, // Palanca a distancia
    ],
    gates: [
      { id: "gate-1", x: 1300, y: 0, width: 50, height: 640, requiredActivations: ["plate-1"] },
      { id: "gate-2", x: 2150, y: 0, width: 50, height: 640, requiredActivations: ["plate-2"] },
      { id: "gate-dist", x: 3100, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
      { id: "gate-3", x: 3900, y: 0, width: 50, height: 640, requiredActivations: ["lever-1"] },
    ],
    seals: [
      { x: 4300, y: 520, width: 50, height: 120 },
      { x: 4500, y: 520, width: 50, height: 120 },
    ],
    hazards: [
      { x: 950, y: 610, width: 120, height: 30, damage: 1 },
      { x: 1800, y: 610, width: 150, height: 30, damage: 1 },
      { x: 2800, y: 610, width: 300, height: 30, damage: 1 },
    ],
    inventoryReward: {
      claimId: "trialChamber6:architect-scepter",
      itemId: "architectScepter",
      x: 3800,
      y: 575,
    },
    goal: { x: 4800, y: 560 },
    requiredActivations: ["plate-1", "plate-2", "plate-3", "lever-1", "lever-dist"],
    supportsCooperative: true,

    // Compatibilidad singular
    crate: { x: 800, y: 320 },
    plate: { x: 1100, y: 625, width: 80 },
    lever: { x: 2350, y: 332 },
    gate: { x: 1300, y: 0, width: 50, height: 640 },
  },
};

export const puzzleLevelIds = [...puzzleLevelOrder];
export const puzzleRewardClaimIds = puzzleLevelOrder
  .map((levelId) => puzzleLevelDefinitions[levelId].inventoryReward.claimId);
