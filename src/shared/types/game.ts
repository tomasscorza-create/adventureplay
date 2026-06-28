export type GameScreen = "main-menu" | "playing" | "level-transition" | "paused" | "game-over" | "victory";

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

export type CharacterId = "ruder" | "amy" | "dunel" | "sarix";

export type InventoryCategoryId = "plansKeys" | "toolsWeapons" | "potions";
export type AchievementId = "first-level" | "flawless-level" | "monster-hunter";

export interface AchievementProgress {
  unlockedIds: AchievementId[];
  monstersDefeated: number;
}

export interface PlayerBaseState {
  health: number;
  maxHealth: number;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  coins: number;
}

export interface PowerChargeState {
  healingCharges: number;
  powerCharges: number;
}

export type CharacterPowerCharges = Record<CharacterId, PowerChargeState>;

export interface PlayerHudState extends PlayerBaseState, PowerChargeState {}

export interface HudState extends PlayerHudState {
  stageNumber: number;
  timeRemaining: number;
  timeLimit: number;
  progressPercent: number;
}

export interface PlayerStats extends PlayerBaseState {
  speed: number;
  jumpPower: number;
  meleeDamage: number;
  rangedDamage: number;
  unlockedSkills: SkillId[];
  inventory: string[];
}

export interface SaveData {
  player: PlayerStats;
  selectedCharacterId: CharacterId;
  primaryCharacterId?: CharacterId;
  unlockedCharacterIds: CharacterId[];
  characterPowerCharges: CharacterPowerCharges;
  unlockedLevels: string[];
  completedLevels: string[];
  claimedRewardBoxes: string[];
  achievements: AchievementProgress;
  checkpointId?: string;
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  textureKey: string;
  animationPrefix: string;
  portraitUrl: string;
  description: string;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  health: number;
  damage: number;
  speed: number;
  experienceReward: number;
  coinReward?: { min: number; max: number };
  chaseRange?: number;
}

export interface ItemDefinition {
  id: string;
  name: string;
  type: "coin" | "resource" | "consumable";
  value: number;
  inventoryCategory?: InventoryCategoryId;
  description?: string;
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
  movement?: {
    axis: "x" | "y";
    distance: number;
    speed: number;
  };
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
  aggression?: number;
}

export interface LevelCoinSpawn {
  itemId: string;
  x: number;
  y: number;
  value?: number;
}

export interface LevelHealthPickup {
  x: number;
  y: number;
}

export interface LevelRewardBox {
  id: string;
  x: number;
  y: number;
}

export interface LevelDefinition {
  id: string;
  name: string;
  stageNumber: number;
  nextLevelId?: string;
  worldWidth: number;
  timeLimitSeconds: number;
  autoScrollSpeed: number;
  m3Intelligence?: number;
  playerStart: { x: number; y: number };
  platforms: PlatformDefinition[];
  hazards: LevelHazardDefinition[];
  enemies: LevelEnemySpawn[];
  coins: LevelCoinSpawn[];
  healthPickups: LevelHealthPickup[];
  rewardBox: LevelRewardBox;
  checkpoint: { id: string; x: number; y: number };
  goal: { x: number; y: number };
}
