export type GameScreen = "main-menu" | "playing" | "level-transition" | "power-shop" | "paused" | "coop-exit-confirm" | "game-over" | "victory";

export type PlayerState =
  | "idle"
  | "run"
  | "jump"
  | "fall"
  | "attack"
  | "spin"
  | "hurt"
  | "dead";

export type SkillId = "stronger-strike" | "quick-steps";

export type CharacterId = "ruder" | "amy" | "dunel" | "sarix" | "faust";
export type WeaponId = "sword-1";
export type ProfileIconId = "icon-1" | "icon-2" | "icon-3" | "icon-4" | "icon-5" | "icon-6" | "icon-7" | "icon-8" | "icon-9";

export type InventoryCategoryId = "plansKeys" | "toolsWeapons" | "potions";
export type AchievementId =
  | "first-level"
  | "flawless-level"
  | "monster-hunter"
  | "first-monster"
  | "first-gold"
  | "first-checkpoint"
  | "first-treasure"
  | "three-levels"
  | "five-levels"
  | "three-flawless-levels"
  | "three-day-advance-streak"
  | "dual-region-explorer"
  | "monster-hunter-25"
  | "monster-hunter-50"
  | "ten-in-one-level"
  | "enemy-variety"
  | "gold-collector-250"
  | "five-checkpoints"
  | "five-treasures"
  | "three-day-treasure-streak"
  | "first-puzzle";

export interface DailyStreakProgress {
  count: number;
  lastDay?: string;
}

export interface AchievementProgress {
  unlockedIds: AchievementId[];
  monstersDefeated: number;
  flawlessLevelIds: string[];
  defeatedEnemyIds: string[];
  mostEnemiesDefeatedInLevel: number;
  goldCollected: number;
  activatedCheckpointIds: string[];
  levelAdvanceStreak: DailyStreakProgress;
  treasureStreak: DailyStreakProgress;
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
  spinCooldownRemainingMs: number;
}

export interface LevelCompletionSummary {
  levelId: string;
  levelName: string;
  stageNumber: number;
  theme: LevelTheme;
  monstersDefeated: number;
  gameplayDurationSeconds: number;
  goldCollected: number;
  actionsPerMinute: number;
  achievementIds: AchievementId[];
  nextLevelId?: string;
  nextLevelName?: string;
  nextStageNumber?: number;
}

export interface PlayerStats extends PlayerBaseState {
  displayName: string;
  profileIconId: ProfileIconId;
  speed: number;
  jumpPower: number;
  meleeDamage: number;
  rangedDamage: number;
  unlockedSkills: SkillId[];
  inventory: string[];
}

export interface PlayerStatistics {
  runsPlayed: number;
  completedRuns: number;
  defeats: number;
  gameplaySeconds: number;
  actions: number;
}

export interface SaveData {
  player: PlayerStats;
  statistics: PlayerStatistics;
  selectedCharacterId: CharacterId;
  primaryCharacterId?: CharacterId;
  unlockedCharacterIds: CharacterId[];
  characterPowerCharges: CharacterPowerCharges;
  unlockedLevels: string[];
  completedLevels: string[];
  claimedLevelRewards: number[];
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
  weaponId?: WeaponId;
  weaponAttachmentFrames?: WeaponAttachmentFrame[];
}

export interface WeaponDefinition {
  id: WeaponId;
  textureKey: string;
  scale: number;
  origin: { x: number; y: number };
}

export interface WeaponAttachmentFrame {
  x: number;
  y: number;
  angle: number;
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
  sinking?: {
    dropDistance: number;
    fallSpeed: number;
    returnSpeed: number;
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

export type LevelTheme = "verdant-frontier" | "enchanted-forest" | "active-volcano" | "ancient-trials";

export interface LevelDefinition {
  id: string;
  name: string;
  stageNumber: number;
  theme: LevelTheme;
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
