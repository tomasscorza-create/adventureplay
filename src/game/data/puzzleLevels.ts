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
  enemies?: Array<{ type: "m0" | "m1"; x: number; y: number; patrolDistance: number }>;
  plates: Array<{ id: string; x: number; y: number; width: number; hint?: string }>;
  levers: Array<{ id: string; x: number; y: number; rangedOnly?: boolean; hint?: string }>;
  gates: Array<{ id: string; x: number; y: number; width: number; height: number; requiredActivations?: string[] }>;
  boxJumpZones?: Array<{ x: number; y: number; width: number }>;
  seals: PuzzleObstacleDefinition[];
  hazards: Array<PuzzleObstacleDefinition & { damage: number }>;
  inventoryReward: { claimId: string; itemId: string; x: number; y: number };
  goal: { x: number; y: number };
  requiredActivations: PuzzleActivationId[];
  supportsCooperative: boolean;
  visualTheme: {
    backgroundTextureKey: string;
    shadeAlpha: number;
    accentColor: number;
  };

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
  "trialChamber7",
  "trialChamber8",
  "trialChamber9",
  "trialChamber10",
  "trialChamber11",
  "trialChamber12",
  "trialChamber13",
  "trialChamber14",
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
    enemies: [{ type: "m0", x: 900, y: 600, patrolDistance: 150 }],
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
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-1",
      shadeAlpha: 0.18,
      accentColor: 0x6eb8d8,
    },

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
    enemies: [{ type: "m0", x: 600, y: 600, patrolDistance: 150 }, { type: "m0", x: 1300, y: 600, patrolDistance: 150 }],
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
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-2",
      shadeAlpha: 0.14,
      accentColor: 0x78c2dc,
    },

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
    enemies: [{ type: "m0", x: 700, y: 600, patrolDistance: 180 }, { type: "m0", x: 1400, y: 400, patrolDistance: 120 }],
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
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-3",
      shadeAlpha: 0.1,
      accentColor: 0x8fcbb2,
    },

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
      { x: 1020, y: 510, width: 120, height: 24 },
      { x: 1190, y: 440, width: 130, height: 24 },
      { x: 1360, y: 380, width: 140, height: 24 },
      { x: 1530, y: 300, width: 150, height: 24 },
      { x: 1760, y: 390, width: 40, height: 110 }, // Pared del canal de disparo en caida
      { x: 1760, y: 330, width: 180, height: 24 }, // Techo del canal de disparo
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
    enemies: [{ type: "m1", x: 1000, y: 600, patrolDistance: 200 }, { type: "m0", x: 1600, y: 600, patrolDistance: 150 }],
    plates: [{ id: "crate-plate", x: 2160, y: 625, width: 74 }],
    levers: [
      { id: "upper-lever", x: 1590, y: 362 },
      { id: "lever-dist", x: 1860, y: 390, rangedOnly: true }, // Palanca a distancia en caida
    ],
    gates: [
      { id: "gate-dist", x: 1980, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
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
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-4",
      shadeAlpha: 0.07,
      accentColor: 0xa5d29a,
    },

    // Compatibilidad singular
    crate: { x: 500, y: 560 },
    boxJumpZone: { x: 1215, y: 625, width: 68 },
    plate: { x: 2160, y: 625, width: 74 },
    lever: { x: 1590, y: 362 },
    gate: { x: 2050, y: 0, width: 60, height: 640 },
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
      { x: 2200, y: 510, width: 120, height: 24 },
      { x: 2360, y: 440, width: 120, height: 24 },
      { x: 2520, y: 380, width: 130, height: 24 },
      { x: 2680, y: 300, width: 150, height: 24 },
      { x: 2900, y: 390, width: 40, height: 110 }, // Pared del canal de disparo en caida
      { x: 2900, y: 330, width: 180, height: 24 }, // Techo del canal de disparo
      { x: 3260, y: 480, width: 350, height: 24 },
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
    enemies: [{ type: "m1", x: 800, y: 600, patrolDistance: 250 }, { type: "m0", x: 1700, y: 400, patrolDistance: 150 }],
    plates: [
      { id: "plate-1", x: 1200, y: 625, width: 80 },
      { id: "plate-2", x: 2800, y: 625, width: 80 },
    ],
    levers: [
      { id: "lever-1", x: 1800, y: 332 },
      { id: "lever-dist", x: 3000, y: 390, rangedOnly: true }, // Palanca a distancia en caida
    ],
    gates: [
      { id: "gate-1", x: 1400, y: 0, width: 50, height: 640, requiredActivations: ["plate-1"] },
      { id: "gate-2", x: 2100, y: 0, width: 50, height: 640, requiredActivations: ["lever-1"] },
      { id: "gate-dist", x: 3120, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
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
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-5",
      shadeAlpha: 0.45,
      accentColor: 0xd6b16a,
    },

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
    nextLevelId: "trialChamber7",
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
      { x: 2200, y: 510, width: 120, height: 24 },
      { x: 2360, y: 440, width: 120, height: 24 },
      { x: 2680, y: 300, width: 150, height: 24 },
      { x: 2900, y: 390, width: 40, height: 110 }, // Pared del canal, bajada para disparar durante la caida
      { x: 2900, y: 330, width: 180, height: 24 }, // Techo del canal de disparo
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
      { x: 2800, y: 560 },
      { x: 3300, y: 560 },
    ],
    enemies: [{ type: "m1", x: 900, y: 600, patrolDistance: 200 }, { type: "m1", x: 1800, y: 400, patrolDistance: 200 }],
    plates: [
      { id: "plate-1", x: 1100, y: 625, width: 80 },
      { id: "plate-2", x: 2000, y: 625, width: 80 },
      { id: "plate-3", x: 3700, y: 625, width: 80 },
    ],
    levers: [
      { id: "lever-1", x: 2350, y: 332 },
      { id: "lever-dist", x: 3000, y: 390, rangedOnly: true }, // Palanca alineada con el canal de caida
    ],
    gates: [
      { id: "gate-1", x: 1300, y: 0, width: 50, height: 640, requiredActivations: ["plate-1"] },
      { id: "gate-2", x: 2150, y: 0, width: 50, height: 640, requiredActivations: ["plate-2"] },
      { id: "gate-lever-1", x: 2700, y: 0, width: 50, height: 640, requiredActivations: ["lever-1"] },
      { id: "gate-dist", x: 3100, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
      { id: "gate-3", x: 3900, y: 0, width: 50, height: 640, requiredActivations: ["plate-3"] },
    ],
    seals: [
      { x: 4300, y: 520, width: 50, height: 120 },
      { x: 4500, y: 520, width: 50, height: 120 },
    ],
    hazards: [
      { x: 950, y: 610, width: 120, height: 30, damage: 1 },
      { x: 1800, y: 610, width: 150, height: 30, damage: 1 },
      { x: 3060, y: 610, width: 120, height: 30, damage: 1 },
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
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-6",
      shadeAlpha: 0.45,
      accentColor: 0xe5bd62,
    },

    // Compatibilidad singular
    crate: { x: 800, y: 320 },
    plate: { x: 1100, y: 625, width: 80 },
    lever: { x: 2350, y: 332 },
    gate: { x: 1300, y: 0, width: 50, height: 640 },
  },
  trialChamber7: {
    id: "trialChamber7",
    name: "La sala del lente maestro",
    stageNumber: 7,
    nextLevelId: "trialChamber8",
    difficultyRating: 350,
    worldWidth: 5700,
    timeLimitSeconds: 225,
    experienceReward: 620,
    playerStart: { x: 150, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 5700, height: 80 },
      { x: 1500, y: 410, width: 430, height: 24 },
      { x: 2200, y: 510, width: 120, height: 24 },
      { x: 2360, y: 440, width: 120, height: 24 },
      { x: 2520, y: 380, width: 130, height: 24 },
      { x: 2680, y: 300, width: 150, height: 24 },
      { x: 2900, y: 390, width: 40, height: 110 }, // Pared del canal, bajada para disparar durante la caida
      { x: 2900, y: 330, width: 180, height: 24 }, // Techo del canal de disparo
      { x: 3330, y: 480, width: 260, height: 24 },
      { x: 4200, y: 430, width: 240, height: 24 },
      { x: 5070, y: 500, width: 210, height: 24 },
    ],
    coins: [
      { itemId: "bronzeCoin", x: 500, y: 580, value: 5 },
      { itemId: "bronzeCoin", x: 1650, y: 350, value: 6 },
      { itemId: "bronzeCoin", x: 2450, y: 380, value: 6 },
      { itemId: "bronzeCoin", x: 3420, y: 420, value: 6 },
      { itemId: "bronzeCoin", x: 4300, y: 370, value: 6 },
      { itemId: "bronzeCoin", x: 5200, y: 440, value: 7 },
    ],
    crates: [
      { x: 700, y: 560 },
      { x: 3350, y: 560 },
      { x: 4550, y: 560 },
    ],
    enemies: [{ type: "m0", x: 850, y: 600, patrolDistance: 100 }, { type: "m1", x: 1900, y: 300, patrolDistance: 150 }],
    plates: [
      { id: "plate-1", x: 1120, y: 625, width: 80 },
      { id: "plate-2", x: 3600, y: 625, width: 80 },
      { id: "plate-3", x: 4850, y: 625, width: 80 },
    ],
    levers: [
      { id: "lever-1", x: 1800, y: 362 },
      { id: "lever-dist", x: 3000, y: 390, rangedOnly: true },
    ],
    gates: [
      { id: "gate-1", x: 1320, y: 0, width: 50, height: 640, requiredActivations: ["plate-1"] },
      { id: "gate-2", x: 2050, y: 0, width: 50, height: 640, requiredActivations: ["lever-1"] },
      { id: "gate-dist", x: 3120, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
      { id: "gate-3", x: 3950, y: 0, width: 50, height: 640, requiredActivations: ["plate-2"] },
      { id: "gate-4", x: 5050, y: 0, width: 50, height: 640, requiredActivations: ["plate-3"] },
    ],
    boxJumpZones: [{ x: 1450, y: 625, width: 72 }],
    seals: [
      { x: 5150, y: 500, width: 52, height: 140 },
      { x: 5310, y: 500, width: 52, height: 140 },
      { x: 5460, y: 500, width: 52, height: 140 },
    ],
    hazards: [
      { x: 950, y: 610, width: 120, height: 30, damage: 1 },
      { x: 1900, y: 610, width: 120, height: 30, damage: 1 },
      { x: 2740, y: 610, width: 90, height: 30, damage: 1 },
      { x: 3260, y: 610, width: 110, height: 30, damage: 1 },
      { x: 4300, y: 610, width: 130, height: 30, damage: 1 },
      { x: 5220, y: 610, width: 120, height: 30, damage: 1 },
    ],
    inventoryReward: {
      claimId: "trialChamber7:architect-lens",
      itemId: "architectLens",
      x: 5200,
      y: 575,
    },
    goal: { x: 5620, y: 560 },
    requiredActivations: ["plate-1", "lever-1", "lever-dist", "plate-2", "plate-3"],
    supportsCooperative: true,
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-6",
      shadeAlpha: 0.45,
      accentColor: 0xf2ce72,
    },

    // Compatibilidad singular
    crate: { x: 700, y: 560 },
    boxJumpZone: { x: 1450, y: 625, width: 72 },
    plate: { x: 1120, y: 625, width: 80 },
    lever: { x: 1800, y: 362 },
    gate: { x: 1320, y: 0, width: 50, height: 640 },
  },
  trialChamber8: {
    id: "trialChamber8",
    name: "El crisol del arquitecto",
    stageNumber: 8,
    nextLevelId: "trialChamber9",
    difficultyRating: 430,
    worldWidth: 6200,
    timeLimitSeconds: 240,
    experienceReward: 750,
    playerStart: { x: 150, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 6200, height: 80 },
      { x: 1650, y: 410, width: 380, height: 24 }, // Cornisa de la primera palanca (requiere caja)
      { x: 2450, y: 510, width: 120, height: 24 }, // Escalera 1 hacia el canal de disparo
      { x: 2610, y: 440, width: 120, height: 24 }, // Escalera 2
      { x: 2770, y: 380, width: 130, height: 24 }, // Escalera 3
      { x: 2930, y: 300, width: 150, height: 24 }, // Cornisa de caida para el disparo
      { x: 3150, y: 390, width: 40, height: 110 }, // Pared del canal de disparo en caida
      { x: 3150, y: 330, width: 180, height: 24 }, // Techo del canal de disparo
      { x: 4900, y: 430, width: 240, height: 24 }, // Cornisa de la palanca final (requiere caja reutilizada)
    ],
    coins: [
      { itemId: "bronzeCoin", x: 520, y: 580, value: 6 },
      { itemId: "bronzeCoin", x: 1840, y: 350, value: 6 },
      { itemId: "bronzeCoin", x: 2990, y: 240, value: 6 },
      { itemId: "bronzeCoin", x: 3600, y: 580, value: 6 },
      { itemId: "bronzeCoin", x: 4980, y: 370, value: 7 },
      { itemId: "bronzeCoin", x: 5060, y: 580, value: 7 },
      { itemId: "bronzeCoin", x: 5560, y: 580, value: 7 },
    ],
    crates: [
      { x: 620, y: 560 },
      { x: 3700, y: 560 },
      { x: 4300, y: 560 },
    ],
    enemies: [{ type: "m1", x: 1200, y: 600, patrolDistance: 250 }, { type: "m1", x: 2300, y: 400, patrolDistance: 150 }],
    plates: [
      { id: "plate-1", x: 1150, y: 625, width: 78 },
      { id: "plate-2", x: 4000, y: 625, width: 76 },
      { id: "plate-3", x: 4550, y: 625, width: 76 },
    ],
    levers: [
      { id: "lever-1", x: 1830, y: 362 },
      { id: "lever-dist", x: 3250, y: 390, rangedOnly: true }, // Palanca alineada con el canal de caida
      { id: "lever-2", x: 5000, y: 382 },
    ],
    gates: [
      { id: "gate-1", x: 1350, y: 0, width: 50, height: 640, requiredActivations: ["plate-1"] },
      { id: "gate-2", x: 2050, y: 0, width: 50, height: 640, requiredActivations: ["lever-1"] },
      { id: "gate-dist", x: 3370, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
      // Puerta doble: exige ambas placas presionadas a la vez (una caja por placa)
      { id: "gate-3", x: 4750, y: 0, width: 54, height: 640, requiredActivations: ["plate-2", "plate-3"] },
      { id: "gate-4", x: 5180, y: 0, width: 50, height: 640, requiredActivations: ["lever-2"] },
    ],
    boxJumpZones: [
      { x: 1600, y: 625, width: 70 },
      { x: 4850, y: 625, width: 70 },
    ],
    seals: [
      { x: 5300, y: 500, width: 52, height: 140 },
      { x: 5470, y: 500, width: 52, height: 140 },
      { x: 5640, y: 500, width: 52, height: 140 },
      { x: 5810, y: 500, width: 52, height: 140 },
    ],
    hazards: [
      { x: 880, y: 610, width: 110, height: 30, damage: 1 },
      { x: 1900, y: 610, width: 110, height: 30, damage: 1 },
      { x: 2300, y: 610, width: 100, height: 30, damage: 1 },
      { x: 3450, y: 610, width: 110, height: 30, damage: 1 },
      { x: 4150, y: 610, width: 120, height: 30, damage: 1 },
      { x: 5390, y: 610, width: 110, height: 30, damage: 1 },
      { x: 5730, y: 610, width: 110, height: 30, damage: 1 },
    ],
    inventoryReward: {
      claimId: "trialChamber8:architect-crown",
      itemId: "architectCrown",
      x: 5940,
      y: 575,
    },
    goal: { x: 6080, y: 560 },
    requiredActivations: ["plate-1", "lever-1", "lever-dist", "plate-2", "plate-3", "lever-2"],
    supportsCooperative: true,
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-6",
      shadeAlpha: 0.45,
      accentColor: 0xffdd85,
    },

    // Compatibilidad singular
    crate: { x: 620, y: 560 },
    boxJumpZone: { x: 1600, y: 625, width: 70 },
    plate: { x: 1150, y: 625, width: 78 },
    lever: { x: 1830, y: 362 },
    gate: { x: 1350, y: 0, width: 50, height: 640 },
  },
  trialChamber9: {
    // Identidad: VERTICALIDAD. Los cinco sellos viven en lo alto de torres
    // dispersas: hay que escalar cada una para romperlos. Meta elevada.
    id: "trialChamber9",
    name: "Las torres del vigia",
    stageNumber: 9,
    nextLevelId: "trialChamber10",
    difficultyRating: 520,
    worldWidth: 6500,
    timeLimitSeconds: 250,
    experienceReward: 900,
    playerStart: { x: 150, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 6500, height: 80 },
      { x: 820, y: 500, width: 120, height: 24 }, // Torre del primer sello, paso 1
      { x: 970, y: 400, width: 170, height: 24 }, // Torre del primer sello, cima
      { x: 1750, y: 520, width: 130, height: 24 }, // Galeria de tiro, paso 1
      { x: 1930, y: 430, width: 130, height: 24 }, // Galeria de tiro, paso 2 (sello en el camino)
      { x: 2110, y: 340, width: 150, height: 24 }, // Percha de tiro
      { x: 2530, y: 340, width: 140, height: 24 }, // Pilar de la palanca a distancia
      { x: 3320, y: 490, width: 120, height: 24 }, // Campanario, paso 1
      { x: 3480, y: 390, width: 120, height: 24 }, // Campanario, paso 2
      { x: 3550, y: 300, width: 150, height: 24 }, // Campanario, cima
      { x: 4130, y: 490, width: 40, height: 150 }, // Muro izquierdo del foso
      { x: 4430, y: 490, width: 40, height: 150 }, // Muro derecho del foso
      { x: 4750, y: 520, width: 140, height: 24 }, // Gran torre, paso 1
      { x: 4950, y: 430, width: 140, height: 24 }, // Gran torre, paso 2 (sello en el camino)
      { x: 5150, y: 340, width: 150, height: 24 }, // Gran torre, paso 3
      { x: 5380, y: 260, width: 170, height: 24 }, // Gran torre, cima (palanca final)
      { x: 5650, y: 380, width: 140, height: 24 }, // Repisa del quinto sello
      { x: 5950, y: 500, width: 220, height: 24 }, // Plataforma del portal elevado
    ],
    coins: [
      { itemId: "bronzeCoin", x: 350, y: 580, value: 6 },
      { itemId: "bronzeCoin", x: 1005, y: 340, value: 6 },
      { itemId: "bronzeCoin", x: 2170, y: 280, value: 6 },
      { itemId: "bronzeCoin", x: 2280, y: 410, value: 7 },
      { itemId: "bronzeCoin", x: 3560, y: 240, value: 7 },
      { itemId: "bronzeCoin", x: 5210, y: 280, value: 7 },
      { itemId: "bronzeCoin", x: 5620, y: 320, value: 7 },
      { itemId: "bronzeCoin", x: 6060, y: 390, value: 7 },
    ],
    crates: [
      { x: 520, y: 560 },
      { x: 3000, y: 560 },
      { x: 4230, y: 560 }, // Caja del foso: nace junto a su placa, imposible perderla
      { x: 2280, y: 560 }, // Par pre-apilado opcional: escalera hacia la moneda alta
      { x: 2280, y: 490 },
    ],
    enemies: [{ type: "m1", x: 1100, y: 600, patrolDistance: 200 }, { type: "m1", x: 2100, y: 600, patrolDistance: 200 }, { type: "m0", x: 2600, y: 500, patrolDistance: 100 }],
    plates: [
      { id: "plate-1", x: 1180, y: 625, width: 78 },
      { id: "plate-2", x: 3600, y: 625, width: 76 },
      {
        id: "plate-3",
        x: 4360,
        y: 625,
        width: 76,
        hint: "Salta dentro del foso y empuja la caja sobre la placa",
      },
    ],
    levers: [
      {
        id: "lever-dist",
        x: 2600,
        y: 340,
        rangedOnly: true,
        hint: "Sube a la percha de tiro y dispara a la palanca del pilar",
      },
      {
        id: "lever-2",
        x: 5450,
        y: 212,
        hint: "Escala la gran torre y golpea la palanca de la cima",
      },
    ],
    gates: [
      { id: "gate-1", x: 1400, y: 0, width: 50, height: 640, requiredActivations: ["plate-1"] },
      { id: "gate-dist", x: 2750, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
      { id: "gate-2", x: 4550, y: 0, width: 54, height: 640, requiredActivations: ["plate-2", "plate-3"] },
    ],
    seals: [
      { x: 1040, y: 260, width: 52, height: 140 }, // En la cima de la primera torre
      { x: 1980, y: 290, width: 52, height: 140 }, // Bloquea el ascenso a la percha
      { x: 3600, y: 160, width: 52, height: 140 }, // En la cima del campanario
      { x: 5010, y: 290, width: 52, height: 140 }, // Bloquea el ascenso de la gran torre
      { x: 5700, y: 240, width: 52, height: 140 }, // En la repisa del descenso
    ],
    hazards: [
      { x: 700, y: 610, width: 100, height: 30, damage: 1 },
      { x: 1650, y: 610, width: 90, height: 30, damage: 1 },
      { x: 2450, y: 610, width: 120, height: 30, damage: 1 },
      { x: 3750, y: 610, width: 110, height: 30, damage: 1 },
      { x: 4620, y: 610, width: 90, height: 30, damage: 1 },
      { x: 5570, y: 610, width: 110, height: 30, damage: 1 },
      { x: 5830, y: 610, width: 80, height: 30, damage: 1 },
    ],
    inventoryReward: {
      claimId: "trialChamber9:watcher-keystone",
      itemId: "watcherKeystone",
      x: 5750,
      y: 575,
    },
    goal: { x: 6060, y: 450 },
    requiredActivations: ["plate-1", "lever-dist", "plate-2", "plate-3", "lever-2"],
    supportsCooperative: true,
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-7",
      shadeAlpha: 0.45,
      accentColor: 0xffe9a0,
    },

    // Compatibilidad singular
    crate: { x: 520, y: 560 },
    plate: { x: 1180, y: 625, width: 78 },
    lever: { x: 5450, y: 212 },
    gate: { x: 1400, y: 0, width: 50, height: 640 },
  },
  trialChamber10: {
    // Identidad: IDA Y VUELTA. Las cajas quedan detras de las puertas que
    // abres, un sello espera sobre el punto de partida y un puente en el
    // cielo concentra tres sellos que ademas sirven de carril de disparo.
    id: "trialChamber10",
    name: "El pendulo del relojero",
    stageNumber: 10,
    nextLevelId: "trialChamber11",
    difficultyRating: 630,
    worldWidth: 6800,
    timeLimitSeconds: 260,
    experienceReward: 1100,
    playerStart: { x: 150, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 6800, height: 80 },
      { x: 250, y: 380, width: 180, height: 24 }, // Cornisa del sello del regreso (sobre el inicio)
      { x: 480, y: 490, width: 120, height: 24 }, // Peldano de acceso a la cornisa
      { x: 860, y: 500, width: 130, height: 24 }, // Torre del vigia, paso 1
      { x: 1030, y: 410, width: 130, height: 24 }, // Torre del vigia, paso 2
      { x: 1200, y: 320, width: 150, height: 24 }, // Torre del vigia, cima (palanca)
      { x: 2500, y: 520, width: 130, height: 24 }, // Escalera al puente, paso 1
      { x: 2680, y: 430, width: 130, height: 24 }, // Escalera al puente, paso 2
      { x: 2860, y: 330, width: 700, height: 24 }, // Puente de los tres sellos
      { x: 3700, y: 330, width: 120, height: 24 }, // Pilar de la palanca a distancia
      { x: 4700, y: 500, width: 140, height: 24 }, // Pendulo, subida 1
      { x: 4880, y: 410, width: 140, height: 24 }, // Pendulo, subida 2
      { x: 5060, y: 320, width: 160, height: 24 }, // Pendulo, cuspide (sello)
      { x: 5290, y: 410, width: 140, height: 24 }, // Pendulo, bajada 1
      { x: 5470, y: 500, width: 140, height: 24 }, // Pendulo, bajada 2 (sello)
    ],
    coins: [
      { itemId: "bronzeCoin", x: 420, y: 320, value: 6 },
      { itemId: "bronzeCoin", x: 900, y: 440, value: 6 },
      { itemId: "bronzeCoin", x: 1260, y: 260, value: 7 },
      { itemId: "bronzeCoin", x: 2990, y: 270, value: 7 },
      { itemId: "bronzeCoin", x: 3080, y: 580, value: 7 },
      { itemId: "bronzeCoin", x: 3330, y: 580, value: 7 },
      { itemId: "bronzeCoin", x: 5000, y: 260, value: 7 },
      { itemId: "bronzeCoin", x: 5560, y: 300, value: 7 },
      { itemId: "bronzeCoin", x: 6300, y: 580, value: 7 },
    ],
    crates: [
      { x: 700, y: 560 }, // Queda detras de la primera puerta: hay que volver por ella
      { x: 3650, y: 560 }, // Bajo el final del puente: se recupera tras abrir la tercera puerta
    ],
    enemies: [{ type: "m1", x: 1300, y: 600, patrolDistance: 250 }, { type: "m1", x: 1900, y: 500, patrolDistance: 200 }, { type: "m1", x: 2900, y: 400, patrolDistance: 150 }],
    plates: [
      {
        id: "plate-1",
        x: 2050,
        y: 625,
        width: 78,
        hint: "La caja quedo atras: cruza la puerta abierta y traela hasta la placa",
      },
      {
        id: "plate-2",
        x: 4300,
        y: 625,
        width: 76,
        hint: "Vuelve por la caja bajo el puente y empujala hasta la placa",
      },
    ],
    levers: [
      {
        id: "lever-1",
        x: 1290,
        y: 272,
        hint: "Escala la torre del vigia y golpea la palanca de la cima",
      },
      {
        id: "lever-dist",
        x: 3760,
        y: 330,
        rangedOnly: true,
        hint: "Cruza el puente rompiendo sellos y dispara a la palanca desde el borde",
      },
    ],
    gates: [
      { id: "gate-1", x: 1550, y: 0, width: 50, height: 640, requiredActivations: ["lever-1"] },
      { id: "gate-2", x: 2350, y: 0, width: 50, height: 640, requiredActivations: ["plate-1"] },
      { id: "gate-3", x: 3900, y: 0, width: 50, height: 640, requiredActivations: ["lever-dist"] },
      { id: "gate-4", x: 4550, y: 0, width: 50, height: 640, requiredActivations: ["plate-2"] },
    ],
    seals: [
      { x: 300, y: 240, width: 52, height: 140 }, // Sobre el punto de partida: mirar atras
      { x: 2950, y: 190, width: 52, height: 140 }, // Puente, primer guardian
      { x: 3200, y: 190, width: 52, height: 140 }, // Puente, segundo guardian
      { x: 3450, y: 190, width: 52, height: 140 }, // Puente, tercer guardian
      { x: 5110, y: 180, width: 52, height: 140 }, // Cuspide del pendulo
      { x: 5520, y: 360, width: 52, height: 140 }, // Bajada del pendulo
    ],
    hazards: [
      { x: 600, y: 610, width: 90, height: 30, damage: 1 },
      { x: 1400, y: 610, width: 100, height: 30, damage: 1 },
      { x: 2880, y: 610, width: 120, height: 30, damage: 1 },
      { x: 3130, y: 610, width: 120, height: 30, damage: 1 },
      { x: 3380, y: 610, width: 120, height: 30, damage: 1 },
      { x: 4750, y: 610, width: 110, height: 30, damage: 1 },
      { x: 5250, y: 610, width: 110, height: 30, damage: 1 },
      { x: 6100, y: 610, width: 100, height: 30, damage: 1 },
    ],
    inventoryReward: {
      claimId: "trialChamber10:pendulum-relic",
      itemId: "pendulumRelic",
      x: 5800,
      y: 575,
    },
    goal: { x: 6650, y: 560 },
    requiredActivations: ["lever-1", "plate-1", "lever-dist", "plate-2"],
    supportsCooperative: true,
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-7",
      shadeAlpha: 0.45,
      accentColor: 0xfff3c2,
    },

    // Compatibilidad singular
    crate: { x: 700, y: 560 },
    plate: { x: 2050, y: 625, width: 78 },
    lever: { x: 1290, y: 272 },
    gate: { x: 1550, y: 0, width: 50, height: 640 },
  },
  trialChamber11: {
    // Identidad: PATIO DE JUEGOS. Tres agujas con retos paralelos (escalar,
    // francotirar, foso), una travesia por un arco en el vacio y un santuario
    // final con sellos a todas las alturas alrededor del portal elevado.
    id: "trialChamber11",
    name: "El corazon del crisol",
    stageNumber: 11,
    nextLevelId: "trialChamber12",
    difficultyRating: 760,
    worldWidth: 6900,
    timeLimitSeconds: 280,
    experienceReward: 1350,
    playerStart: { x: 150, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 6900, height: 80 },
      { x: 600, y: 510, width: 120, height: 24 }, // Aguja 1, paso 1
      { x: 760, y: 420, width: 120, height: 24 }, // Aguja 1, paso 2
      { x: 920, y: 330, width: 140, height: 24 }, // Aguja 1, cima (palanca y punto de tiro)
      { x: 1450, y: 330, width: 120, height: 24 }, // Aguja 2: pilar aislado del sello francotirador
      { x: 1800, y: 490, width: 40, height: 150 }, // Muro izquierdo del foso (aguja 3)
      { x: 2080, y: 490, width: 40, height: 150 }, // Muro derecho del foso
      { x: 2550, y: 500, width: 130, height: 24 }, // Arco del vacio, ascenso 1
      { x: 2730, y: 410, width: 130, height: 24 }, // Arco del vacio, ascenso 2
      { x: 2910, y: 330, width: 150, height: 24 }, // Arco, tramo alto 1 (sello)
      { x: 3120, y: 330, width: 150, height: 24 }, // Arco, tramo alto 2
      { x: 3330, y: 330, width: 150, height: 24 }, // Arco, tramo alto 3 (sello)
      { x: 3540, y: 410, width: 150, height: 24 }, // Arco, descenso 1 (punto de tiro)
      { x: 3750, y: 500, width: 150, height: 24 }, // Arco, descenso 2
      { x: 4000, y: 380, width: 120, height: 24 }, // Pilar de la palanca a distancia
      { x: 5150, y: 520, width: 140, height: 24 }, // Santuario, subida 1 (sello)
      { x: 5340, y: 430, width: 140, height: 24 }, // Santuario, subida 2
      { x: 5530, y: 340, width: 160, height: 24 }, // Santuario, cuspide (sello)
      { x: 5800, y: 430, width: 150, height: 24 }, // Repisa derecha del santuario (sello)
      { x: 6470, y: 500, width: 220, height: 24 }, // Plataforma del portal elevado
    ],
    coins: [
      { itemId: "bronzeCoin", x: 250, y: 580, value: 7 },
      { itemId: "bronzeCoin", x: 980, y: 270, value: 7 },
      { itemId: "bronzeCoin", x: 2990, y: 270, value: 8 },
      { itemId: "bronzeCoin", x: 3180, y: 580, value: 8 },
      { itemId: "bronzeCoin", x: 3480, y: 580, value: 8 },
      { itemId: "bronzeCoin", x: 5450, y: 370, value: 8 },
      { itemId: "bronzeCoin", x: 5870, y: 230, value: 8 },
      { itemId: "bronzeCoin", x: 6560, y: 440, value: 8 },
    ],
    crates: [
      { x: 350, y: 560 },
      { x: 1900, y: 560 }, // Caja del foso: nace junto a su placa
      { x: 4450, y: 560 },
    ],
    enemies: [{ type: "m1", x: 900, y: 600, patrolDistance: 250 }, { type: "m1", x: 1600, y: 400, patrolDistance: 250 }, { type: "m1", x: 2300, y: 500, patrolDistance: 200 }, { type: "m1", x: 3100, y: 600, patrolDistance: 250 }],
    plates: [
      {
        id: "plate-1",
        x: 2010,
        y: 625,
        width: 76,
        hint: "Salta al foso de la tercera aguja y asienta la caja en la placa",
      },
      {
        id: "plate-2",
        x: 1700,
        y: 625,
        width: 78,
        hint: "Empuja la caja del inicio hasta la placa frente al foso",
      },
      { id: "plate-3", x: 4680, y: 625, width: 76 },
    ],
    levers: [
      {
        id: "lever-1",
        x: 990,
        y: 282,
        hint: "Escala la primera aguja y golpea su palanca",
      },
      {
        id: "lever-dist",
        x: 4060,
        y: 380,
        rangedOnly: true,
        hint: "Desde el tramo final del arco, dispara a la palanca del pilar",
      },
    ],
    gates: [
      // Puerta triple: exige las tres agujas resueltas
      { id: "gate-1", x: 2300, y: 0, width: 54, height: 640, requiredActivations: ["lever-1", "plate-1", "plate-2"] },
      { id: "gate-dist", x: 4250, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
      { id: "gate-2", x: 4830, y: 0, width: 50, height: 640, requiredActivations: ["plate-3"] },
    ],
    seals: [
      { x: 1490, y: 190, width: 52, height: 140 }, // Aguja 2: solo se rompe disparando desde la aguja 1
      { x: 2960, y: 190, width: 52, height: 140 }, // Arco del vacio, guardian 1
      { x: 3380, y: 190, width: 52, height: 140 }, // Arco del vacio, guardian 2
      { x: 5200, y: 380, width: 52, height: 140 }, // Santuario, subida
      { x: 5580, y: 200, width: 52, height: 140 }, // Santuario, cuspide
      { x: 5850, y: 290, width: 52, height: 140 }, // Santuario, repisa derecha
      { x: 6220, y: 500, width: 52, height: 140 }, // Guardian terrestre ante el portal
    ],
    hazards: [
      { x: 500, y: 610, width: 90, height: 30, damage: 1 },
      { x: 2180, y: 610, width: 90, height: 30, damage: 1 },
      { x: 2950, y: 610, width: 140, height: 30, damage: 1 },
      { x: 3250, y: 610, width: 140, height: 30, damage: 1 },
      { x: 3550, y: 610, width: 140, height: 30, damage: 1 },
      { x: 5720, y: 610, width: 90, height: 30, damage: 1 },
      { x: 6040, y: 610, width: 90, height: 30, damage: 1 },
    ],
    inventoryReward: {
      claimId: "trialChamber11:crucible-heart",
      itemId: "crucibleHeart",
      x: 6370,
      y: 575,
    },
    goal: { x: 6590, y: 450 },
    requiredActivations: ["lever-1", "plate-1", "plate-2", "lever-dist", "plate-3"],
    supportsCooperative: true,
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-8",
      shadeAlpha: 0.45,
      accentColor: 0xfff8dc,
    },

    // Compatibilidad singular
    crate: { x: 350, y: 560 },
    plate: { x: 2010, y: 625, width: 76 },
    lever: { x: 990, y: 282 },
    gate: { x: 2300, y: 0, width: 54, height: 640 },
  },
  trialChamber12: {
    // Identidad: POZOS GEMELOS. Dos fosos contiguos, cada uno con su caja y su
    // placa, alimentan una unica puerta DOBLE que exige ambas placas presionadas
    // a la vez: por primera vez hay que resolver dos fosos en paralelo. Cierra
    // con un relevo a distancia y un santuario de sellos escalonado.
    id: "trialChamber12",
    name: "Los pozos gemelos",
    stageNumber: 12,
    nextLevelId: "trialChamber13",
    difficultyRating: 930,
    worldWidth: 7200,
    timeLimitSeconds: 300,
    experienceReward: 1650,
    playerStart: { x: 150, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 7200, height: 80 },
      { x: 650, y: 510, width: 130, height: 24 }, // Torre inicial, paso 1
      { x: 850, y: 410, width: 130, height: 24 }, // Torre inicial, paso 2
      { x: 1050, y: 320, width: 170, height: 24 }, // Torre inicial, cima (palanca)
      { x: 1750, y: 490, width: 40, height: 150 }, // Foso 1, muro izquierdo
      { x: 2050, y: 490, width: 40, height: 150 }, // Foso 1, muro derecho
      { x: 2450, y: 490, width: 40, height: 150 }, // Foso 2, muro izquierdo
      { x: 2750, y: 490, width: 40, height: 150 }, // Foso 2, muro derecho
      { x: 3250, y: 520, width: 130, height: 24 }, // Percha de tiro, escalon
      { x: 3450, y: 410, width: 170, height: 24 }, // Percha de tiro
      { x: 3950, y: 410, width: 120, height: 24 }, // Pilar de la palanca a distancia
      { x: 4500, y: 490, width: 160, height: 24 }, // Santuario, cornisa baja (sello)
      { x: 4850, y: 510, width: 130, height: 24 }, // Santuario, escalon
      { x: 5050, y: 400, width: 160, height: 24 }, // Santuario, cornisa media (sello)
      { x: 5550, y: 400, width: 110, height: 24 }, // Pilar francotirador (sello aislado)
      { x: 5950, y: 490, width: 160, height: 24 }, // Santuario, cornisa baja 2 (sello)
      { x: 6300, y: 510, width: 130, height: 24 }, // Santuario, escalon 2
      { x: 6500, y: 410, width: 170, height: 24 }, // Santuario, cornisa media 2 (sello)
    ],
    coins: [
      { itemId: "bronzeCoin", x: 300, y: 580, value: 6 },
      { itemId: "bronzeCoin", x: 1120, y: 270, value: 7 },
      { itemId: "bronzeCoin", x: 1900, y: 560, value: 7 },
      { itemId: "bronzeCoin", x: 2620, y: 560, value: 7 },
      { itemId: "bronzeCoin", x: 3520, y: 360, value: 7 },
      { itemId: "bronzeCoin", x: 5120, y: 250, value: 8 },
      { itemId: "bronzeCoin", x: 5600, y: 250, value: 8 },
      { itemId: "bronzeCoin", x: 6570, y: 260, value: 8 },
    ],
    crates: [
      { x: 1880, y: 560 }, // Foso 1: nace junto a su placa
      { x: 2580, y: 560 }, // Foso 2: nace junto a su placa
    ],
    plates: [
      {
        id: "plate-1",
        x: 1980,
        y: 625,
        width: 78,
        hint: "Pozo izquierdo: salta dentro y empuja la caja sobre la placa",
      },
      {
        id: "plate-2",
        x: 2680,
        y: 625,
        width: 78,
        hint: "Pozo derecho: la puerta doble exige ambas placas a la vez",
      },
    ],
    levers: [
      {
        id: "lever-1",
        x: 1120,
        y: 272,
        hint: "Escala la torre inicial y golpea su palanca",
      },
      {
        id: "lever-dist",
        x: 4010,
        y: 410,
        rangedOnly: true,
        hint: "Sube a la percha y dispara a la palanca del pilar lejano",
      },
    ],
    gates: [
      { id: "gate-1", x: 1400, y: 0, width: 50, height: 640, requiredActivations: ["lever-1"] },
      // Puerta doble: exige los dos pozos resueltos simultaneamente
      { id: "gate-2", x: 3000, y: 0, width: 54, height: 640, requiredActivations: ["plate-1", "plate-2"] },
      { id: "gate-3", x: 4200, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
    ],
    seals: [
      { x: 4570, y: 350, width: 52, height: 140 }, // Cornisa baja del santuario
      { x: 5120, y: 260, width: 52, height: 140 }, // Cornisa media del santuario
      { x: 5600, y: 260, width: 52, height: 140 }, // Pilar francotirador (solo a tiro)
      { x: 6020, y: 350, width: 52, height: 140 }, // Cornisa baja 2
      { x: 6570, y: 270, width: 52, height: 140 }, // Cornisa media 2
      { x: 6800, y: 500, width: 52, height: 140 }, // Guardian terrestre ante el portal
    ],
    hazards: [
      { x: 1450, y: 610, width: 90, height: 30, damage: 1 },
      { x: 3300, y: 610, width: 100, height: 30, damage: 1 },
      { x: 4400, y: 610, width: 110, height: 30, damage: 1 },
      { x: 5300, y: 610, width: 110, height: 30, damage: 1 },
      { x: 6650, y: 610, width: 90, height: 30, damage: 1 },
    ],
    inventoryReward: {
      claimId: "trialChamber12:mirror",
      itemId: "twinWellsSigil",
      x: 3150,
      y: 575,
    },
    goal: { x: 7000, y: 560 },
    requiredActivations: ["lever-1", "plate-1", "plate-2", "lever-dist"],
    supportsCooperative: true,
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-8",
      shadeAlpha: 0.45,
      accentColor: 0xffe8b0,
    },

    // Compatibilidad singular
    crate: { x: 1880, y: 560 },
    plate: { x: 1980, y: 625, width: 78 },
    lever: { x: 1120, y: 272 },
    gate: { x: 1400, y: 0, width: 50, height: 640 },
  },
  trialChamber13: {
    // Identidad: DESFILADERO DEL FRANCOTIRADOR. Una galeria de tiro: perchas
    // alcanzables desde las que se rompen sellos plantados en pilares aislados,
    // intercaladas con una torre de palanca, un foso y un relevo a distancia.
    // Premia la punteria mas que la escalada.
    id: "trialChamber13",
    name: "El desfiladero del francotirador",
    stageNumber: 13,
    nextLevelId: "trialChamber14",
    difficultyRating: 1140,
    worldWidth: 7700,
    timeLimitSeconds: 320,
    experienceReward: 2000,
    playerStart: { x: 150, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 7700, height: 80 },
      { x: 650, y: 500, width: 130, height: 24 }, // Torre 1, paso 1
      { x: 850, y: 400, width: 130, height: 24 }, // Torre 1, paso 2
      { x: 1050, y: 310, width: 160, height: 24 }, // Torre 1, cima (palanca)
      { x: 1650, y: 490, width: 40, height: 150 }, // Foso, muro izquierdo
      { x: 1950, y: 490, width: 40, height: 150 }, // Foso, muro derecho
      { x: 2400, y: 520, width: 130, height: 24 }, // Relevo a distancia, escalon
      { x: 2600, y: 410, width: 170, height: 24 }, // Relevo a distancia, percha
      { x: 3100, y: 410, width: 120, height: 24 }, // Pilar de la palanca a distancia
      { x: 3600, y: 500, width: 120, height: 24 }, // Galeria: escalon percha B
      { x: 3720, y: 400, width: 160, height: 24 }, // Galeria: percha B
      { x: 4150, y: 400, width: 110, height: 24 }, // Galeria: pilar del sello 1
      { x: 4450, y: 510, width: 120, height: 24 }, // Galeria: escalon percha C
      { x: 4570, y: 410, width: 160, height: 24 }, // Galeria: percha C
      { x: 5000, y: 410, width: 110, height: 24 }, // Galeria: pilar del sello 2
      { x: 5350, y: 490, width: 160, height: 24 }, // Galeria: cornisa con sello escalable
      { x: 5650, y: 500, width: 130, height: 24 }, // Torre 2, paso 1
      { x: 5850, y: 400, width: 140, height: 24 }, // Torre 2, paso 2
      { x: 6050, y: 310, width: 160, height: 24 }, // Torre 2, cima (palanca)
      { x: 6600, y: 490, width: 160, height: 24 }, // Santuario, cornisa baja (sello)
      { x: 6900, y: 510, width: 120, height: 24 }, // Santuario, escalon
      { x: 7020, y: 410, width: 160, height: 24 }, // Santuario, cornisa media (sello)
    ],
    coins: [
      { itemId: "bronzeCoin", x: 300, y: 580, value: 6 },
      { itemId: "bronzeCoin", x: 1120, y: 260, value: 7 },
      { itemId: "bronzeCoin", x: 1740, y: 560, value: 7 },
      { itemId: "bronzeCoin", x: 2680, y: 360, value: 7 },
      { itemId: "bronzeCoin", x: 4200, y: 220, value: 8 },
      { itemId: "bronzeCoin", x: 5050, y: 230, value: 8 },
      { itemId: "bronzeCoin", x: 6120, y: 260, value: 8 },
      { itemId: "bronzeCoin", x: 7090, y: 270, value: 8 },
    ],
    crates: [
      { x: 1780, y: 560 }, // Foso: nace junto a su placa
    ],
    plates: [
      {
        id: "plate-1",
        x: 1890,
        y: 625,
        width: 76,
        hint: "Salta al foso y empuja la caja sobre la placa",
      },
    ],
    levers: [
      {
        id: "lever-1",
        x: 1120,
        y: 262,
        hint: "Escala la primera torre y golpea su palanca",
      },
      {
        id: "lever-dist",
        x: 3160,
        y: 410,
        rangedOnly: true,
        hint: "Sube a la percha y dispara a la palanca del pilar",
      },
      {
        id: "lever-2",
        x: 6120,
        y: 262,
        hint: "Escala la segunda torre y golpea su palanca",
      },
    ],
    gates: [
      { id: "gate-1", x: 1350, y: 0, width: 50, height: 640, requiredActivations: ["lever-1"] },
      { id: "gate-2", x: 2150, y: 0, width: 50, height: 640, requiredActivations: ["plate-1"] },
      { id: "gate-3", x: 3350, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
      { id: "gate-4", x: 6350, y: 0, width: 50, height: 640, requiredActivations: ["lever-2"] },
    ],
    seals: [
      { x: 4200, y: 260, width: 52, height: 140 }, // Sello 1: solo a tiro desde la percha B
      { x: 5050, y: 270, width: 52, height: 140 }, // Sello 2: solo a tiro desde la percha C
      { x: 5420, y: 350, width: 52, height: 140 }, // Sello escalable de la galeria
      { x: 6670, y: 350, width: 52, height: 140 }, // Santuario, cornisa baja
      { x: 7090, y: 270, width: 52, height: 140 }, // Santuario, cornisa media
      { x: 7300, y: 500, width: 52, height: 140 }, // Guardian terrestre ante el portal
    ],
    hazards: [
      { x: 1400, y: 610, width: 90, height: 30, damage: 1 },
      { x: 2800, y: 610, width: 100, height: 30, damage: 1 },
      { x: 3900, y: 610, width: 110, height: 30, damage: 1 },
      { x: 4800, y: 610, width: 110, height: 30, damage: 1 },
      { x: 5900, y: 610, width: 100, height: 30, damage: 1 },
      { x: 7150, y: 610, width: 90, height: 30, damage: 1 },
    ],
    inventoryReward: {
      claimId: "trialChamber13:gorge",
      itemId: "sniperGorgeTalisman",
      x: 5300,
      y: 575,
    },
    goal: { x: 7500, y: 560 },
    requiredActivations: ["lever-1", "plate-1", "lever-dist", "lever-2"],
    supportsCooperative: true,
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-8",
      shadeAlpha: 0.45,
      accentColor: 0xffedc0,
    },

    // Compatibilidad singular
    crate: { x: 1780, y: 560 },
    plate: { x: 1890, y: 625, width: 76 },
    lever: { x: 1120, y: 262 },
    gate: { x: 1350, y: 0, width: 50, height: 640 },
  },
  trialChamber14: {
    // Identidad: CIUDADELA DEL CRISOL. Gran final que combina todo: torre de
    // palanca, pozos gemelos con puerta doble, relevo a distancia, un PUENTE de
    // sellos que se cruza rompiendolos, una aguja alta y un santuario con la
    // meta ELEVADA rodeada de sellos a todas las alturas.
    id: "trialChamber14",
    name: "La ciudadela del crisol",
    stageNumber: 14,
    difficultyRating: 1400,
    worldWidth: 8200,
    timeLimitSeconds: 345,
    experienceReward: 2450,
    playerStart: { x: 150, y: 560 },
    platforms: [
      { x: 0, y: 640, width: 8200, height: 80 },
      { x: 650, y: 500, width: 130, height: 24 }, // Torre 1, paso 1
      { x: 850, y: 400, width: 130, height: 24 }, // Torre 1, paso 2
      { x: 1050, y: 310, width: 160, height: 24 }, // Torre 1, cima (palanca)
      { x: 1700, y: 490, width: 40, height: 150 }, // Foso 1, muro izquierdo
      { x: 2000, y: 490, width: 40, height: 150 }, // Foso 1, muro derecho
      { x: 2350, y: 490, width: 40, height: 150 }, // Foso 2, muro izquierdo
      { x: 2650, y: 490, width: 40, height: 150 }, // Foso 2, muro derecho
      { x: 3150, y: 520, width: 130, height: 24 }, // Relevo a distancia, escalon
      { x: 3350, y: 410, width: 170, height: 24 }, // Relevo a distancia, percha
      { x: 3850, y: 410, width: 120, height: 24 }, // Pilar de la palanca a distancia
      { x: 4350, y: 510, width: 120, height: 24 }, // Puente, ascenso 1
      { x: 4500, y: 410, width: 120, height: 24 }, // Puente, ascenso 2
      { x: 4450, y: 330, width: 760, height: 24 }, // Puente de los tres sellos
      { x: 5400, y: 510, width: 130, height: 24 }, // Aguja, paso 1
      { x: 5600, y: 410, width: 140, height: 24 }, // Aguja, paso 2
      { x: 5800, y: 310, width: 150, height: 24 }, // Aguja, paso 3
      { x: 6000, y: 220, width: 160, height: 24 }, // Aguja, cima (palanca)
      { x: 6500, y: 510, width: 110, height: 24 }, // Santuario, escalon percha
      { x: 6610, y: 400, width: 140, height: 24 }, // Santuario, percha de tiro
      { x: 7000, y: 400, width: 120, height: 24 }, // Pilar francotirador (sello aislado)
      { x: 7300, y: 490, width: 150, height: 24 }, // Santuario, cornisa (sello)
      { x: 7750, y: 500, width: 240, height: 24 }, // Plataforma del portal elevado
    ],
    coins: [
      { itemId: "bronzeCoin", x: 300, y: 580, value: 7 },
      { itemId: "bronzeCoin", x: 1120, y: 260, value: 7 },
      { itemId: "bronzeCoin", x: 2020, y: 560, value: 7 },
      { itemId: "bronzeCoin", x: 4700, y: 280, value: 8 },
      { itemId: "bronzeCoin", x: 4950, y: 280, value: 8 },
      { itemId: "bronzeCoin", x: 6070, y: 180, value: 8 },
      { itemId: "bronzeCoin", x: 7370, y: 300, value: 9 },
      { itemId: "bronzeCoin", x: 7870, y: 410, value: 9 },
    ],
    crates: [
      { x: 1830, y: 560 }, // Foso 1: nace junto a su placa
      { x: 2480, y: 560 }, // Foso 2: nace junto a su placa
    ],
    plates: [
      {
        id: "plate-1",
        x: 1930,
        y: 625,
        width: 76,
        hint: "Pozo izquierdo: empuja su caja sobre la placa",
      },
      {
        id: "plate-2",
        x: 2580,
        y: 625,
        width: 76,
        hint: "Pozo derecho: la puerta doble exige ambas placas a la vez",
      },
    ],
    levers: [
      {
        id: "lever-1",
        x: 1120,
        y: 262,
        hint: "Escala la torre inicial y golpea su palanca",
      },
      {
        id: "lever-dist",
        x: 3910,
        y: 410,
        rangedOnly: true,
        hint: "Desde la percha, dispara a la palanca del pilar lejano",
      },
      {
        id: "lever-2",
        x: 6070,
        y: 172,
        hint: "Escala la gran aguja y golpea la palanca de la cima",
      },
    ],
    gates: [
      { id: "gate-1", x: 1350, y: 0, width: 50, height: 640, requiredActivations: ["lever-1"] },
      // Puerta doble: los dos pozos gemelos a la vez
      { id: "gate-2", x: 2900, y: 0, width: 54, height: 640, requiredActivations: ["plate-1", "plate-2"] },
      { id: "gate-3", x: 4100, y: 0, width: 40, height: 640, requiredActivations: ["lever-dist"] },
      { id: "gate-4", x: 6300, y: 0, width: 50, height: 640, requiredActivations: ["lever-2"] },
    ],
    seals: [
      { x: 4600, y: 190, width: 52, height: 140 }, // Puente, guardian 1
      { x: 4850, y: 190, width: 52, height: 140 }, // Puente, guardian 2
      { x: 5100, y: 190, width: 52, height: 140 }, // Puente, guardian 3
      { x: 7050, y: 260, width: 52, height: 140 }, // Pilar francotirador (solo a tiro)
      { x: 7370, y: 350, width: 52, height: 140 }, // Santuario, cornisa escalable
      { x: 7600, y: 500, width: 52, height: 140 }, // Guardian terrestre ante el portal
    ],
    hazards: [
      { x: 1450, y: 610, width: 90, height: 30, damage: 1 },
      { x: 3000, y: 610, width: 100, height: 30, damage: 1 },
      { x: 4200, y: 610, width: 110, height: 30, damage: 1 },
      { x: 5250, y: 610, width: 110, height: 30, damage: 1 },
      { x: 6350, y: 610, width: 100, height: 30, damage: 1 },
      { x: 7150, y: 610, width: 90, height: 30, damage: 1 },
    ],
    inventoryReward: {
      claimId: "trialChamber14:citadel",
      itemId: "crucibleCitadelCrown",
      x: 6450,
      y: 575,
    },
    goal: { x: 7900, y: 450 },
    requiredActivations: ["lever-1", "plate-1", "plate-2", "lever-dist", "lever-2"],
    supportsCooperative: true,
    visualTheme: {
      backgroundTextureKey: "ancient-trials-chamber-8",
      shadeAlpha: 0.45,
      accentColor: 0xfff4d0,
    },

    // Compatibilidad singular
    crate: { x: 1830, y: 560 },
    plate: { x: 1930, y: 625, width: 76 },
    lever: { x: 1120, y: 262 },
    gate: { x: 1350, y: 0, width: 50, height: 640 },
  },
};

export const puzzleLevelIds = [...puzzleLevelOrder];
export const puzzleRewardClaimIds = puzzleLevelOrder
  .map((levelId) => puzzleLevelDefinitions[levelId].inventoryReward.claimId);
