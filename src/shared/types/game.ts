export type GameScreen = "main-menu" | "playing" | "paused" | "game-over" | "victory";

export type PlayerState =
  | "idle"
  | "run"
  | "jump"
  | "fall"
  | "attack"
  | "shoot"
  | "hurt"
  | "dead";

export type SkillId = "stronger-strike" | "quick-steps";

export interface PlayerHudState {
  health: number;
  maxHealth: number;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  coins: number;
}

export interface HudState extends PlayerHudState {
  timeRemaining: number;
  timeLimit: number;
  progressPercent: number;
}

export interface PlayerStats extends PlayerHudState {
  speed: number;
  jumpPower: number;
  meleeDamage: number;
  rangedDamage: number;
  unlockedSkills: SkillId[];
  inventory: string[];
}

export interface SaveData {
  player: PlayerStats;
  unlockedLevels: string[];
  completedLevels: string[];
  checkpointId?: string;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  health: number;
  damage: number;
  speed: number;
  experienceReward: number;
  chaseRange?: number;
}

export interface ItemDefinition {
  id: string;
  name: string;
  type: "coin" | "resource" | "consumable";
  value: number;
}

export interface SkillDefinition {
  id: SkillId;
  name: string;
  requiredLevel: number;
  description: string;
}

export interface PlatformDefinition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LevelHazardDefinition {
  id: string;
  type: "pit" | "spike" | "moving";
  x: number;
  y: number;
  width: number;
  height: number;
  damage: number;
  axis?: "x" | "y";
  distance?: number;
  speed?: number;
}

export interface LevelEnemySpawn {
  enemyId: string;
  x: number;
  y: number;
  patrolDistance: number;
}

export interface LevelCoinSpawn {
  itemId: string;
  x: number;
  y: number;
}

export interface LevelLifePickup {
  id: string;
  x: number;
  y: number;
}

export interface LevelDefinition {
  id: string;
  name: string;
  worldWidth: number;
  timeLimitSeconds: number;
  autoScrollSpeed: number;
  playerStart: { x: number; y: number };
  platforms: PlatformDefinition[];
  hazards: LevelHazardDefinition[];
  enemies: LevelEnemySpawn[];
  coins: LevelCoinSpawn[];
  lifePickups: LevelLifePickup[];
  checkpoint: { id: string; x: number; y: number };
  goal: { x: number; y: number };
}
