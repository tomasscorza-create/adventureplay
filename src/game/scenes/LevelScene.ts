import Phaser from "phaser";
import { gameAudio } from "../../shared/audio/GameAudio";
import { EVENTS } from "../../shared/constants/events";
import { GAME_HEIGHT, GAME_WIDTH } from "../../shared/constants/game";
import type {
  AchievementId,
  LevelDefinition,
  LevelHazardDefinition,
  PowerChargeState,
  SaveData,
} from "../../shared/types/game";
import { BasicEnemy } from "../entities/enemies/BasicEnemy";
import type { BaseEnemy } from "../entities/enemies/BaseEnemy";
import { M1Enemy } from "../entities/enemies/M1Enemy";
import { M2Enemy } from "../entities/enemies/M2Enemy";
import { M3Enemy } from "../entities/enemies/M3Enemy";
import { MovingHazard } from "../entities/hazards/MovingHazard";
import { Coin } from "../entities/items/Coin";
import { MovingPlatform } from "../entities/platforms/MovingPlatform";
import { Player } from "../entities/player/Player";
import type { Projectile } from "../entities/projectiles/Projectile";
import { PowerProjectile } from "../entities/projectiles/PowerProjectile";
import { getCharacterDefinition } from "../data/characters";
import { getAchievementDefinition } from "../data/achievements";
import { itemDefinitions, randomInventoryRewardItemIds } from "../data/items";
import { levelDefinitions } from "../data/levels";
import { gameEvents } from "../events/EventBus";
import { CameraSystem } from "../systems/camera/CameraSystem";
import { CombatSystem } from "../systems/combat/CombatSystem";
import { GameplayInputSystem } from "../systems/input/GameplayInputSystem";
import { touchInputStore } from "../systems/input/TouchInputStore";
import { InventorySystem } from "../systems/inventory/InventorySystem";
import { MovementSystem } from "../systems/movement/MovementSystem";
import { AchievementSystem } from "../systems/achievements/AchievementSystem";
import { ProgressionSystem } from "../systems/progression/ProgressionSystem";
import { gameSaveStore } from "../systems/save/GameSaveStore";

export class LevelScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private save!: SaveData;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private movingPlatforms!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private healthPickups!: Phaser.Physics.Arcade.StaticGroup;
  private rewardBox?: Phaser.Physics.Arcade.Sprite;
  private staticHazards!: Phaser.Physics.Arcade.StaticGroup;
  private movingHazards!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private powerProjectiles!: Phaser.Physics.Arcade.Group;
  private checkpoint!: Phaser.Physics.Arcade.Sprite;
  private goal!: Phaser.Physics.Arcade.Sprite;
  private inputSystem!: GameplayInputSystem;
  private activeCheckpoint?: { x: number; y: number; id: string };
  private readonly movement = new MovementSystem();
  private readonly combat = new CombatSystem();
  private readonly progression = new ProgressionSystem();
  private readonly inventory = new InventorySystem();
  private readonly cameraSystem = new CameraSystem();
  private unbindResume?: () => void;
  private unbindPowerShop?: () => void;
  private unbindRestart?: () => void;
  private unbindContinue?: () => void;
  private unbindMenu?: () => void;
  private unbindCameraZoom?: () => void;
  private remainingTimeMs = 0;
  private lastHudSecond = -1;
  private levelFinished = false;
  private pressureScrollX = 0;
  private pressureDamageCooldownMs = 0;
  private pressureLine!: Phaser.GameObjects.Rectangle;
  private readonly achievements = new AchievementSystem();
  private damageTakenThisLevel = false;
  private recoveringFromPit = false;
  private monstersDefeatedThisLevel = 0;
  private goldCollectedThisLevel = 0;
  private unlockedAchievementsThisLevel: AchievementId[] = [];
  private gameplayElapsedMs = 0;
  private playerActionCount = 0;
  private previousMovementDirection: -1 | 0 | 1 = 0;
  private runStatisticsRecorded = false;

  constructor() {
    super("LevelScene");
  }

  create(data: { levelId?: string }): void {
    const requestedLevelId = data.levelId ?? "meadowOutpost";
    this.level = levelDefinitions[requestedLevelId] ?? levelDefinitions.meadowOutpost;
    this.levelFinished = false;
    this.damageTakenThisLevel = false;
    this.recoveringFromPit = false;
    this.monstersDefeatedThisLevel = 0;
    this.goldCollectedThisLevel = 0;
    this.unlockedAchievementsThisLevel = [];
    this.gameplayElapsedMs = 0;
    this.playerActionCount = 0;
    this.previousMovementDirection = 0;
    this.runStatisticsRecorded = false;
    gameEvents.emit(EVENTS.ACTIVE_LEVEL_CHANGED, { levelId: this.level.id });
    this.save = gameSaveStore.load();
    this.save.player.health = this.save.player.maxHealth;
    this.activeCheckpoint = this.save.checkpointId === this.level.checkpoint.id
      ? { ...this.level.checkpoint }
      : undefined;
    if (this.save.checkpointId && !this.activeCheckpoint) {
      this.save.checkpointId = undefined;
    }
    gameSaveStore.save(this.save);
    this.rewardBox = undefined;
    this.remainingTimeMs = this.level.timeLimitSeconds * 1000;
    this.lastHudSecond = -1;
    this.levelFinished = false;
    this.recoveringFromPit = false;
    this.damageTakenThisLevel = false;
    this.pressureScrollX = 0;
    this.pressureDamageCooldownMs = 0;

    touchInputStore.reset();
    this.movement.reset();
    this.inputSystem = new GameplayInputSystem(this);
    this.createWorld();
    this.createPlayer();
    this.unbindCameraZoom = this.cameraSystem.bindResponsiveZoom(this);
    if (this.activeCheckpoint) {
      this.resetPressureForSafePoint(this.activeCheckpoint.x);
    }
    this.createEntities();
    this.createCollisions();
    this.bindSceneEvents();

    this.scene.launch("UIScene");
    gameEvents.emit(EVENTS.SCREEN_CHANGED, "playing");
    this.emitHud();
  }

  update(_time: number, delta: number): void {
    if (this.levelFinished) {
      return;
    }

    this.gameplayElapsedMs += delta;
    this.updateLevelTimer(delta);
    if (this.levelFinished) {
      return;
    }

    const input = this.inputSystem.readFrame();
    this.trackPlayerActions(input);
    const didJump = this.movement.update(this.player, input, delta);
    if (didJump) {
      gameAudio.playJump();
    }
    this.handleActions(input);
    this.updateCameraPressure(delta);
    this.handlePressureLineDamage(delta);
    if (this.levelFinished) {
      return;
    }

    this.enemies.children.each((enemy) => {
      (enemy as BaseEnemy).update(this.player);
      return true;
    });

    if (this.player.y > GAME_HEIGHT + 80) {
      this.handlePlayerFall();
    }
  }

  private createWorld(): void {
    const isEnchantedForest = this.level.theme === "enchanted-forest";
    this.cameras.main.setBackgroundColor(isEnchantedForest ? "#153f3b" : "#071323");
    this.physics.world.setBounds(0, 0, this.level.worldWidth, GAME_HEIGHT);
    this.physics.world.setBoundsCollision(true, true, true, false);
    if (isEnchantedForest) {
      this.createEnchantedForestBackdrop();
    } else {
      this.createForestBackdrop();
    }
    this.createGroundLayer();
    this.createScenarioDressings();
    this.pressureLine = this.add
      .rectangle(3, GAME_HEIGHT / 2, 6, GAME_HEIGHT, 0xff2638, 0.96)
      .setScrollFactor(0)
      .setDepth(30);

    this.platforms = this.physics.add.staticGroup();
    this.movingPlatforms = this.physics.add.group({ runChildUpdate: true });
    for (const platform of this.level.platforms) {
      if (platform.movement) {
        this.movingPlatforms.add(new MovingPlatform(this, platform, this.level.theme));
      } else {
        this.createPlatform(platform);
      }
    }

    this.staticHazards = this.physics.add.staticGroup();
    for (const hazard of this.level.hazards.filter((item) => item.type !== "moving")) {
      this.createStaticHazard(hazard);
    }
  }

  private createPlayer(): void {
    const start = this.activeCheckpoint ?? this.level.playerStart;
    const character = getCharacterDefinition(this.save.selectedCharacterId);
    const startY = this.activeCheckpoint ? start.y - 60 : start.y;
    this.player = new Player(this, start.x, startY, this.save.player, character);
    this.cameraSystem.setBounds(this, this.level.worldWidth);
  }

  private createEntities(): void {
    this.enemies = this.physics.add.group();
    this.coins = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.healthPickups = this.physics.add.staticGroup();
    this.movingHazards = this.physics.add.group({ runChildUpdate: true });
    this.projectiles = this.physics.add.group({ runChildUpdate: true });
    this.powerProjectiles = this.physics.add.group({
      allowGravity: false,
      runChildUpdate: true,
    });

    for (const enemy of this.level.enemies) {
      this.enemies.add(this.createEnemy(enemy));
    }

    for (const coin of this.level.coins) {
      this.coins.add(new Coin(this, coin.x, coin.y, coin.itemId, coin.value));
    }

    for (const pickup of this.level.healthPickups) {
      const heart = this.healthPickups.create(pickup.x, pickup.y, "health-heart");
      heart.setDepth(9);
    }

    if (!this.save.claimedRewardBoxes.includes(this.level.rewardBox.id)) {
      this.rewardBox = this.physics.add.staticSprite(
        this.level.rewardBox.x,
        this.level.rewardBox.y,
        "reward-box",
      );
      this.rewardBox.setDepth(10);
      this.rewardBox.setData("rewardBoxId", this.level.rewardBox.id);
    }

    for (const hazard of this.level.hazards.filter((item) => item.type === "moving")) {
      this.movingHazards.add(new MovingHazard(this, hazard));
    }

    this.checkpoint = this.physics.add.staticSprite(
      this.level.checkpoint.x,
      this.level.checkpoint.y,
      "checkpoint",
    );
    this.checkpoint.setDepth(9);
    if (this.activeCheckpoint) {
      this.checkpoint.setTint(0xffffff);
    }
    this.goal = this.physics.add.staticSprite(this.level.goal.x, this.level.goal.y, "goal");
    this.goal.setDepth(9);
  }

  private createEnemy(enemy: LevelDefinition["enemies"][number]): BaseEnemy {
    const isEnchantedForest = this.level.theme === "enchanted-forest";
    if (enemy.enemyId === "m1") {
      return new M1Enemy(
        this,
        enemy.x,
        enemy.y,
        enemy.patrolDistance,
        [
          ...this.platforms.getChildren(),
          ...this.movingPlatforms.getChildren(),
        ] as Phaser.GameObjects.Rectangle[],
        isEnchantedForest ? "enchanted-enemy-m1" : "enemy-m1",
      );
    }

    if (enemy.enemyId === "m2") {
      return new M2Enemy(
        this,
        enemy.x,
        enemy.y,
        enemy.patrolDistance,
        enemy.aggression,
        isEnchantedForest ? "enchanted" : "default",
      );
    }

    if (enemy.enemyId === "m3" || enemy.enemyId === "e2m3") {
      return new M3Enemy(
        this,
        enemy.x,
        enemy.y,
        [
          ...this.platforms.getChildren(),
          ...this.movingPlatforms.getChildren(),
        ] as Phaser.GameObjects.Rectangle[],
        this.level.m3Intelligence,
        enemy.enemyId === "e2m3" ? "enchanted" : "default",
      );
    }

    return new BasicEnemy(
      this,
      enemy.x,
      enemy.y,
      enemy.enemyId,
      enemy.patrolDistance,
      isEnchantedForest && enemy.enemyId === "m0"
        ? "enchanted-enemy-m0"
        : "enemy-emberling",
    );
  }

  private createCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.movingPlatforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.enemies, this.movingPlatforms);
    this.physics.add.collider(
      this.enemies,
      this.enemies,
      undefined,
      (enemyA, enemyB) => enemyA instanceof M3Enemy && enemyB instanceof M3Enemy,
    );
    this.physics.add.collider(this.projectiles, this.platforms, (projectile) => {
      projectile.destroy();
    });
    this.physics.add.collider(this.projectiles, this.movingPlatforms, (projectile) => {
      projectile.destroy();
    });

    this.physics.add.overlap(this.player, this.coins, (_player, coin) => {
      this.collectCoin(coin as Coin);
    });

    this.physics.add.overlap(this.player, this.healthPickups, (_player, pickup) => {
      this.collectHealthPickup(pickup as Phaser.Physics.Arcade.Sprite);
    });

    if (this.rewardBox) {
      this.physics.add.overlap(this.player, this.rewardBox, (_player, rewardBox) => {
        this.collectRewardBox(rewardBox as Phaser.Physics.Arcade.Sprite);
      });
    }

    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      this.handlePlayerEnemyOverlap(enemy as BaseEnemy);
    });

    this.physics.add.overlap(this.player, this.staticHazards, (_player, hazard) => {
      this.handleHazardOverlap(hazard as Phaser.GameObjects.GameObject);
    });

    this.physics.add.overlap(this.player, this.movingHazards, (_player, hazard) => {
      this.handleHazardOverlap(hazard as Phaser.GameObjects.GameObject);
    });

    this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => {
      this.hitEnemyWithProjectile(projectile as Projectile, enemy as BaseEnemy);
    });
    this.physics.add.overlap(this.powerProjectiles, this.enemies, (projectile, enemy) => {
      this.hitEnemyWithPower(projectile as PowerProjectile, enemy as BaseEnemy);
    });

    this.physics.add.overlap(this.player, this.checkpoint, () => this.activateCheckpoint());
    this.physics.add.overlap(this.player, this.goal, () => this.completeLevel());
  }

  private bindSceneEvents(): void {
    this.unbindResume = gameEvents.on(EVENTS.RESUME_GAME, () => {
      if (this.scene.isPaused()) {
        this.save = gameSaveStore.load();
        this.scene.resume();
        gameEvents.emit(EVENTS.SCREEN_CHANGED, "playing");
        this.emitHud();
      }
    });

    this.unbindPowerShop = gameEvents.on(EVENTS.PAUSE_FOR_POWER_SHOP, () => {
      if (this.levelFinished || this.scene.isPaused()) {
        return;
      }

      gameEvents.emit(EVENTS.SCREEN_CHANGED, "power-shop");
      this.scene.pause();
    });

    this.unbindRestart = gameEvents.on(EVENTS.RESTART_GAME, ({ levelId }) => {
      const restartLevelId = levelDefinitions[levelId] ? levelId : this.level.id;
      if (!this.levelFinished) {
        this.recordRunStatistics("abandoned");
        gameSaveStore.save(this.save);
      }
      this.scene.start("LevelScene", { levelId: restartLevelId });
    });

    this.unbindContinue = gameEvents.on(
      EVENTS.CONTINUE_LEVEL,
      ({ completedLevelId, nextLevelId }) => {
        if (!this.levelFinished || completedLevelId !== this.level.id) {
          return;
        }

        if (nextLevelId && levelDefinitions[nextLevelId]) {
          this.scene.start("LevelScene", { levelId: nextLevelId });
          return;
        }

        this.scene.start("GameOverScene", {
          result: "victory",
          restartLevelId: this.level.id,
        });
      },
    );

    this.unbindMenu = gameEvents.on(EVENTS.GO_TO_MENU, () => {
      if (!this.levelFinished) {
        this.recordRunStatistics("abandoned");
        gameSaveStore.save(this.save);
      }
      this.scene.start("MainMenuScene");
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unbindResume?.();
      this.unbindPowerShop?.();
      this.unbindRestart?.();
      this.unbindContinue?.();
      this.unbindMenu?.();
      this.unbindCameraZoom?.();
      touchInputStore.reset();
      this.scene.stop("UIScene");
    });
  }

  private handleActions(input: ReturnType<GameplayInputSystem["readFrame"]>): void {
    if (input.pauseJustPressed) {
      gameAudio.playUiSelect();
      this.pauseGame();
      return;
    }

    if (input.meleeJustPressed) {
      if (this.player.canMelee(this.time.now)) {
        gameAudio.playAttack();
      }

      this.combat.meleeAttack(this, this.player, this.enemies, (enemy) => {
        this.handleEnemyDefeated(enemy);
      });
    }

    if (input.shootJustPressed) {
      if (this.player.canShoot(this.time.now)) {
        gameAudio.playShoot();
      }

      this.combat.shoot(this, this.player, this.projectiles);
    }

    if (input.healJustPressed) {
      this.useHealingPower();
    }

    if (input.powerJustPressed) {
      this.useLethalPower();
    }
  }

  private trackPlayerActions(input: ReturnType<GameplayInputSystem["readFrame"]>): void {
    const movementDirection: -1 | 0 | 1 = input.left === input.right
      ? 0
      : input.left
        ? -1
        : 1;
    if (movementDirection !== 0 && movementDirection !== this.previousMovementDirection) {
      this.playerActionCount += 1;
    }
    this.previousMovementDirection = movementDirection;

    this.playerActionCount += [
      input.jumpJustPressed,
      input.meleeJustPressed,
      input.shootJustPressed,
      input.healJustPressed,
      input.powerJustPressed,
    ].filter(Boolean).length;
  }

  private useHealingPower(): void {
    const powerCharges = this.getActivePowerCharges();
    if (
      powerCharges.healingCharges <= 0 ||
      this.save.player.health >= this.save.player.maxHealth
    ) {
      return;
    }

    powerCharges.healingCharges -= 1;
    this.save.player.health = this.save.player.maxHealth;
    gameAudio.playHealingPower();
    this.createHealingEffect();
    gameSaveStore.save(this.save);
    this.emitHud();
  }

  private useLethalPower(): void {
    const powerCharges = this.getActivePowerCharges();
    if (powerCharges.powerCharges <= 0 || !this.player.canShoot(this.time.now)) {
      return;
    }

    powerCharges.powerCharges -= 1;
    this.player.markShooting(this.time.now);
    const direction = this.player.facing;
    const projectile = new PowerProjectile(
      this,
      this.player.x + 34 * direction,
      this.player.y - 7,
      direction,
    );
    this.powerProjectiles.add(projectile);
    projectile.launch();
    gameAudio.playLethalPower();
    gameSaveStore.save(this.save);
    this.emitHud();
  }

  private createHealingEffect(): void {
    const x = this.player.x;
    const y = this.player.y - 10;
    const ring = this.add.circle(x, y, 24, 0x64ff9f, 0.14)
      .setStrokeStyle(5, 0xb7ffd1, 0.94)
      .setDepth(32);
    const cross = this.add.text(x, y, "+", {
      color: "#effff3",
      fontFamily: "Arial, sans-serif",
      fontSize: "34px",
      fontStyle: "bold",
      stroke: "#197344",
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(33);

    this.tweens.add({
      targets: [ring, cross],
      y: y - 52,
      alpha: 0,
      scale: 1.7,
      duration: 720,
      ease: "Cubic.easeOut",
      onComplete: () => {
        ring.destroy();
        cross.destroy();
      },
    });
  }

  private pauseGame(): void {
    gameEvents.emit(EVENTS.SCREEN_CHANGED, "paused");
    this.scene.pause();
  }

  private createStaticHazard(hazard: LevelHazardDefinition): void {
    if (hazard.type === "pit") {
      this.createPitVisual(hazard);
    } else if (hazard.type === "spike") {
      this.createSpikeVisual(hazard);
    }

    const rectangle = this.add
      .rectangle(hazard.x, hazard.y, hazard.width, hazard.height, 0xff2638, 0)
      .setOrigin(0, 0)
      .setDepth(5);
    rectangle.setData("hazardType", hazard.type);
    rectangle.setData("damage", hazard.damage);
    this.physics.add.existing(rectangle, true);
    this.staticHazards.add(rectangle);
  }

  private createForestBackdrop(): void {
    this.add
      .rectangle(this.level.worldWidth / 2, GAME_HEIGHT / 2, this.level.worldWidth, GAME_HEIGHT, 0x071323, 1)
      .setDepth(-32);

    for (let x = -260; x < this.level.worldWidth + 260; x += 620) {
      this.add
        .image(x + 270, 500, "terrain-depth-fog")
        .setScale(1.15)
        .setAlpha(0.42)
        .setScrollFactor(0.24)
        .setDepth(-22);
      this.add
        .ellipse(x, 360, 620, 310, 0x0d3042, 0.18)
        .setScrollFactor(0.08)
        .setDepth(-31);
      this.add
        .ellipse(x + 310, 505, 780, 360, 0x071514, 0.28)
        .setScrollFactor(0.16)
        .setDepth(-26);
      this.add
        .ellipse(x + 110, 615, 700, 250, 0x030b0c, 0.35)
        .setScrollFactor(0.32)
        .setDepth(-18);
    }

    this.add
      .image(430, 132, "scenery-moon")
      .setScrollFactor(0.04)
      .setScale(0.47)
      .setAlpha(0.78)
      .setDepth(-29);

    for (let x = 260; x < this.level.worldWidth; x += 860) {
      this.add
        .image(x, 120 + ((x / 860) % 2) * 52, "scenery-clouds")
        .setAlpha(0.34)
        .setTint(0x8ca7bf)
        .setScale(0.82 + ((x / 860) % 3) * 0.08)
        .setScrollFactor(0.06)
        .setDepth(-28);
    }

    for (let x = 120; x < this.level.worldWidth; x += 1150) {
      this.add.circle(x, 230 + (x % 5) * 36, 2.5, 0xf7d16a, 0.55).setDepth(-27);
      this.add.circle(x + 420, 370, 3, 0xf7d16a, 0.45).setDepth(-27);
      this.add.circle(x + 780, 275, 2, 0xf7d16a, 0.38).setDepth(-27);
    }

    for (let x = -40; x < this.level.worldWidth; x += 185) {
      this.add
        .image(x, 520, "scenery-pine")
        .setOrigin(0.5, 1)
        .setScale(1.25 + ((x / 185) % 3) * 0.22)
        .setTint(0x102634)
        .setAlpha(0.5)
        .setScrollFactor(0.16)
        .setDepth(-24);
    }

    for (let x = 100; x < this.level.worldWidth; x += 520) {
      this.add
        .image(x, 625, x % 1040 === 100 ? "scenery-tree-medium" : "scenery-tree-small")
        .setOrigin(0.5, 1)
        .setScale(1.25 + ((x / 520) % 2) * 0.2)
        .setTint(0x1e3d34)
        .setAlpha(0.58)
        .setScrollFactor(0.36)
        .setDepth(-15);
      this.add
        .image(x + 260, 620, "scenery-pine")
        .setOrigin(0.5, 1)
        .setScale(1.05)
        .setTint(0x163829)
        .setAlpha(0.56)
        .setScrollFactor(0.44)
        .setDepth(-14);
    }

    for (let x = 260; x < this.level.worldWidth; x += 980) {
      this.add
        .image(x, 650, "scenery-tree-large")
        .setOrigin(0.5, 1)
        .setScale(0.95)
        .setTint(0x496c39)
        .setAlpha(0.82)
        .setScrollFactor(0.72)
        .setDepth(-8);
      this.add
        .image(x + 515, 650, "scenery-tree-medium")
        .setOrigin(0.5, 1)
        .setScale(1.04)
        .setTint(0x3b6234)
        .setAlpha(0.75)
        .setScrollFactor(0.74)
        .setDepth(-9);
    }
  }

  private createEnchantedForestBackdrop(): void {
    this.add
      .image(0, 0, "enchanted-background")
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(-40);

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b4a46, 0.12)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-39);

    for (let x = -180; x < this.level.worldWidth + 500; x += 920) {
      const farTreeKey = Math.floor(x / 920) % 2 === 0 ? "enchanted-tree-2" : "enchanted-tree-3";
      this.add
        .image(x, 682, farTreeKey)
        .setOrigin(0.5, 1)
        .setScale(0.62)
        .setTint(0x6bb89d)
        .setAlpha(0.32)
        .setScrollFactor(0.18)
        .setDepth(-29);
    }

    for (let x = 180; x < this.level.worldWidth + 600; x += 760) {
      const middleTreeKey = Math.floor(x / 760) % 2 === 0 ? "enchanted-tree-1" : "enchanted-tree-3";
      this.add
        .image(x, 690, middleTreeKey)
        .setOrigin(0.5, 1)
        .setScale(0.72)
        .setTint(0xb0d596)
        .setAlpha(0.58)
        .setScrollFactor(0.43)
        .setDepth(-18);
    }

    for (let x = 520; x < this.level.worldWidth + 700; x += 1120) {
      this.add
        .image(x, 695, "enchanted-tree-4")
        .setOrigin(0.5, 1)
        .setScale(0.88)
        .setAlpha(0.86)
        .setScrollFactor(0.69)
        .setDepth(-9);
      this.add
        .image(x + 560, 700, "enchanted-tree-2")
        .setOrigin(0.5, 1)
        .setScale(0.8)
        .setAlpha(0.78)
        .setScrollFactor(0.73)
        .setDepth(-8);
    }

    for (let x = 140; x < this.level.worldWidth; x += 310) {
      const y = 270 + ((x / 310) % 4) * 68;
      this.add.circle(x, y, 2.5, 0xbaffb0, 0.72).setScrollFactor(0.55).setDepth(-6);
      this.add.circle(x + 92, y + 76, 1.8, 0x75f4dd, 0.62).setScrollFactor(0.62).setDepth(-6);
    }
  }

  private createGroundLayer(): void {
    if (this.level.theme === "enchanted-forest") {
      for (let x = -180; x < this.level.worldWidth + 180; x += 360) {
        this.add.ellipse(x, 692, 520, 128, 0x102d29, 0.72).setDepth(-1);
        this.add.ellipse(x + 150, 632, 320, 80, 0x3c7252, 0.22).setDepth(-1);
      }
      return;
    }

    for (let x = -180; x < this.level.worldWidth + 180; x += 420) {
      this.add
        .ellipse(x, 682, 560, 150, 0x020707, 0.58)
        .setDepth(-1);
      this.add
        .ellipse(x + 170, 612, 360, 110, 0x0b2118, 0.28)
        .setDepth(-1);
    }
  }

  private createScenarioDressings(): void {
    if (this.level.theme === "enchanted-forest") {
      this.createEnchantedForestDressings();
      return;
    }

    const groundPlatforms = this.level.platforms.filter((platform) => platform.y >= 640);

    for (const [index, platform] of groundPlatforms.entries()) {
      const surfaceY = platform.y + 2;

      if (index % 3 === 0 && platform.width > 280) {
        this.createMushrooms(platform.x + 115, surfaceY);
      }

      if (index % 4 === 0 && platform.width > 360) {
        this.add
          .image(platform.x + platform.width - 95, surfaceY + 4, "scenery-rocks")
          .setOrigin(0.5, 1)
          .setScale(0.48)
          .setAlpha(0.84)
          .setDepth(7);
      }

      if (index === 0 || index === 6) {
        this.add
          .image(platform.x + 84, surfaceY + 2, "scenery-lantern-post")
          .setOrigin(0.5, 1)
          .setDepth(7);
      }

      if (index % 5 === 2 && platform.width > 380) {
        this.createCrystalCluster(platform.x + platform.width * 0.54, surfaceY);
      }

      if (platform.width > 450) {
        this.add
          .image(platform.x + platform.width * 0.5, surfaceY, "scenery-floor-strip")
          .setOrigin(0.5, 1)
          .setScale(0.46)
          .setTint(0x38502f)
          .setAlpha(0.34)
          .setDepth(6);
      }
    }
  }

  private createEnchantedForestDressings(): void {
    const groundPlatforms = this.level.platforms.filter((platform) => platform.y >= 640);
    for (const [index, platform] of groundPlatforms.entries()) {
      const surfaceY = platform.y + 2;
      if (index % 2 === 0 && platform.width > 420) {
        this.createMushrooms(platform.x + 130, surfaceY);
      }
      if (index % 3 === 1 && platform.width > 440) {
        this.createCrystalCluster(platform.x + platform.width - 110, surfaceY);
      }
      if (index === 0 || index === groundPlatforms.length - 1) {
        this.add
          .image(platform.x + Math.min(platform.width - 80, 230), surfaceY + 4, "scenery-bush")
          .setOrigin(0.5, 1)
          .setScale(0.64)
          .setTint(0x5f9e62)
          .setAlpha(0.76)
          .setDepth(7);
      }
    }
  }

  private createMushrooms(x: number, y: number): void {
    this.add.image(x, y, "scenery-mushrooms").setOrigin(0.5, 1).setScale(0.46).setDepth(8);
  }

  private createRuneStone(x: number, y: number): void {
    this.add.image(x, y, "scenery-bush").setOrigin(0.5, 1).setScale(0.58).setDepth(6);
  }

  private createCrystalCluster(x: number, y: number): void {
    this.add.image(x, y, "scenery-crystals").setOrigin(0.5, 1).setScale(0.52).setDepth(7);
  }

  private createForegroundGrass(x: number, y: number): void {
    this.add.image(x, y, "scenery-grass-clump").setOrigin(0.5, 1).setScale(0.38).setDepth(10);
  }

  private createPlatform(platform: LevelDefinition["platforms"][number]): void {
    const isGround = platform.y >= 640;
    if (!isGround) {
      this.add
        .ellipse(
          platform.x + platform.width / 2,
          platform.y + platform.height + 20,
          platform.width * 0.82,
          34,
          0x020707,
          0.32,
        )
        .setDepth(1);
    }

    if (this.level.theme === "enchanted-forest") {
      this.createEnchantedTerrainRun(platform);
    } else {
      this.createTerrainRun(platform);
    }

    const collisionBody = this.add
      .rectangle(platform.x, platform.y, platform.width, platform.height, 0x000000, 0)
      .setOrigin(0, 0);

    this.physics.add.existing(collisionBody, true);
    this.platforms.add(collisionBody);
  }

  private createEnchantedTerrainRun(platform: LevelDefinition["platforms"][number]): void {
    const isGround = platform.y >= 640;
    const topY = platform.y - 8;
    const visualHeight = isGround ? GAME_HEIGHT - topY + 18 : 58;
    const depth = isGround ? 4 : 5;
    const graphics = this.add.graphics().setDepth(depth);

    graphics.fillStyle(0x102923, 0.46);
    graphics.fillRoundedRect(platform.x + 6, topY + 10, platform.width, visualHeight, 10);
    graphics.fillStyle(isGround ? 0x31534a : 0x3b6257, 1);
    graphics.fillRoundedRect(platform.x, topY, platform.width, visualHeight, isGround ? 8 : 12);
    graphics.fillStyle(0x203e38, 0.88);
    graphics.fillRect(platform.x, topY + 23, platform.width, Math.max(20, visualHeight - 23));
    graphics.fillStyle(0x73a957, 1);
    graphics.fillRoundedRect(platform.x - 2, topY - 2, platform.width + 4, 13, 7);
    graphics.fillStyle(0xa1ca67, 0.72);
    graphics.fillRect(platform.x + 8, topY, Math.max(20, platform.width - 20), 4);

    graphics.lineStyle(2, 0x132e2a, 0.64);
    const stoneWidth = isGround ? 92 : 72;
    for (let x = platform.x + stoneWidth; x < platform.x + platform.width; x += stoneWidth) {
      const offset = Math.floor((x - platform.x) / stoneWidth) % 2 === 0 ? 0 : 9;
      graphics.lineBetween(x, topY + 16 + offset, x - 8, topY + visualHeight - 5);
    }
    for (let y = topY + 40; y < topY + visualHeight; y += 34) {
      graphics.lineBetween(platform.x + 8, y, platform.x + platform.width - 8, y + 4);
    }

    if (!isGround) {
      graphics.lineStyle(3, 0x315c3f, 0.68);
      graphics.lineBetween(platform.x + 26, topY + visualHeight - 2, platform.x + 34, topY + visualHeight + 22);
      graphics.lineBetween(platform.x + platform.width - 34, topY + visualHeight - 2, platform.x + platform.width - 42, topY + visualHeight + 15);
    }
  }

  private createTerrainRun(platform: LevelDefinition["platforms"][number]): void {
    const isGround = platform.y >= 640;
    const pieceWidth = isGround ? 128 : 96;
    const pieceHeight = isGround ? 112 : 78;
    const edgeWidth = Math.min(pieceWidth, Math.max(42, platform.width * 0.22));
    const visualY = platform.y - (isGround ? 30 : 26);
    const depth = isGround ? 4 : 5;
    const leftKey = isGround ? "terrain-ground-left" : "terrain-platform-left";
    const rightKey = isGround ? "terrain-ground-right" : "terrain-platform-right";
    const midKeys = isGround
      ? ["terrain-ground-mid-a", "terrain-ground-mid-b"]
      : ["terrain-platform-mid-a", "terrain-platform-mid-b"];

    const left = this.add.image(platform.x, visualY, leftKey).setOrigin(0, 0).setDepth(depth);
    left.setDisplaySize(edgeWidth, pieceHeight);

    const rightX = platform.x + platform.width - edgeWidth;
    const right = this.add.image(rightX, visualY, rightKey).setOrigin(0, 0).setDepth(depth);
    right.setDisplaySize(edgeWidth, pieceHeight);

    let cursorX = platform.x + edgeWidth;
    const endX = rightX;
    let index = Math.floor(platform.x / pieceWidth);
    while (cursorX < endX - 1) {
      const segmentWidth = Math.min(pieceWidth, endX - cursorX);
      this.add
        .tileSprite(cursorX, visualY, segmentWidth, pieceHeight, midKeys[index % midKeys.length])
        .setOrigin(0, 0)
        .setDepth(depth);
      cursorX += segmentWidth;
      index += 1;
    }

    this.createSurfaceDetails(platform, isGround);
  }

  private createSurfaceDetails(
    platform: LevelDefinition["platforms"][number],
    isGround: boolean,
  ): void {
    if (platform.width < 170) {
      return;
    }

    const detailY = platform.y + 2;
    const seed = Math.floor(platform.x / 90) + Math.floor(platform.width / 70);
    if (isGround || seed % 3 === 0) {
      this.add
        .image(platform.x + Math.min(platform.width - 50, 42 + (seed % 4) * 22), detailY, "terrain-surface-grass-detail")
        .setOrigin(0.5, 1)
        .setScale(isGround ? 0.82 : 0.52)
        .setAlpha(isGround ? 0.78 : 0.54)
        .setDepth(8);
    }

    if (isGround && platform.width > 300 && seed % 2 === 0) {
      this.add
        .image(platform.x + platform.width - 78, platform.y + 7, "terrain-surface-rocks")
        .setOrigin(0.5, 1)
        .setScale(0.48)
        .setAlpha(0.82)
        .setDepth(7);
    }
  }

  private createPitVisual(hazard: LevelHazardDefinition): void {
    if (this.level.theme === "enchanted-forest") {
      this.add
        .rectangle(hazard.x, hazard.y - 22, hazard.width, hazard.height + 44, 0x061b1b, 0.96)
        .setOrigin(0, 0)
        .setDepth(5);
      for (let x = hazard.x + 24; x < hazard.x + hazard.width; x += 48) {
        this.add.circle(x, hazard.y + 8, 2.2, 0x6ce9cf, 0.42).setDepth(6);
      }
      return;
    }

    this.add
      .rectangle(hazard.x, hazard.y - 22, hazard.width, hazard.height + 44, 0x010607, 0.98)
      .setOrigin(0, 0)
      .setDepth(5);
    for (let x = hazard.x + 28; x < hazard.x + hazard.width; x += 62) {
      this.add
        .image(x, hazard.y + 18, "scenery-bush")
        .setOrigin(0.5, 1)
        .setScale(0.32)
        .setTint(0x1f3028)
        .setAlpha(0.48)
        .setDepth(6);
    }
  }

  private createSpikeVisual(hazard: LevelHazardDefinition): void {
    const baseY = hazard.y + hazard.height;
    this.add
      .rectangle(hazard.x, baseY - 8, hazard.width, 8, 0x1b1612, 1)
      .setOrigin(0, 0)
      .setDepth(10);

    for (let x = hazard.x + 8; x < hazard.x + hazard.width; x += 17) {
      this.add
        .triangle(x, baseY - 25, 0, 24, 16, 24, 8, 0, 0xd8d3bb, 1)
        .setDepth(11)
        .setStrokeStyle(1, 0x596167, 1);
      this.add
        .triangle(x + 4, baseY - 28, 0, 13, 8, 13, 4, 0, 0xffffff, 0.48)
        .setDepth(12);
    }
  }

  private collectCoin(coin: Coin): void {
    const previousGold = this.save.player.coins;
    this.inventory.collect(this.save.player, coin.itemId, coin.value);
    if (itemDefinitions[coin.itemId]?.type === "coin") {
      const collectedGold = this.save.player.coins - previousGold;
      this.goldCollectedThisLevel += collectedGold;
      this.announceAchievements(
        this.achievements.recordGoldCollected(this.save, collectedGold),
      );
      this.createCoinGainEffect(coin.x, coin.y, coin.value);
    }
    gameAudio.playCollect();
    coin.disableBody(true, true);
    gameSaveStore.save(this.save);
    this.emitHud();
  }

  private collectHealthPickup(pickup: Phaser.Physics.Arcade.Sprite): void {
    const previousHealth = this.save.player.health;
    this.save.player.health = Math.min(
      this.save.player.maxHealth,
      this.save.player.health + 1,
    );
    gameAudio.playCollect();
    pickup.disableBody(true, true);
    gameSaveStore.save(this.save);
    this.emitHud();
    gameEvents.emit(EVENTS.HEALTH_PICKUP_COLLECTED, {
      restored: this.save.player.health - previousHealth,
    });
  }

  private collectRewardBox(rewardBox: Phaser.Physics.Arcade.Sprite): void {
    const rewardBoxId = rewardBox.getData("rewardBoxId") as string | undefined;
    if (!rewardBoxId || this.save.claimedRewardBoxes.includes(rewardBoxId)) {
      return;
    }

    const rewardItemId = Phaser.Utils.Array.GetRandom(randomInventoryRewardItemIds);
    const rewardItem = itemDefinitions[rewardItemId];
    if (!rewardItem) {
      return;
    }

    this.inventory.collect(this.save.player, rewardItemId);
    this.save.claimedRewardBoxes.push(rewardBoxId);
    this.announceAchievements(
      this.achievements.recordRewardBoxOpened(this.save),
    );
    gameAudio.playCollect();
    this.createRewardBoxEffect(rewardBox.x, rewardBox.y, rewardItem.name);
    rewardBox.disableBody(true, true);
    gameSaveStore.save(this.save);
    this.emitHud();
  }

  private createRewardBoxEffect(x: number, y: number, rewardName: string): void {
    const glow = this.add.circle(x, y, 18, 0xf2c45f, 0.68).setDepth(31);
    const label = this.add
      .text(x, y - 34, `+ ${rewardName}`, {
        color: "#fff1b8",
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        stroke: "#172119",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(32);

    this.tweens.add({
      targets: glow,
      alpha: 0,
      scale: 2.4,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => glow.destroy(),
    });
    this.tweens.add({
      targets: label,
      y: y - 78,
      alpha: 0,
      duration: 1100,
      ease: "Sine.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private hitEnemyWithProjectile(projectile: Projectile, enemy: BaseEnemy): void {
    projectile.destroy();
    const defeated = enemy.takeDamage(projectile.damage);
    if (defeated) {
      this.handleEnemyDefeated(enemy);
    } else {
      gameAudio.playEnemyHit();
    }
  }

  private hitEnemyWithPower(projectile: PowerProjectile, enemy: BaseEnemy): void {
    const impactX = enemy.x;
    const impactY = enemy.y;
    projectile.destroy();
    enemy.takeDamage(Number.MAX_SAFE_INTEGER);
    this.createPowerExplosion(impactX, impactY);
    this.handleEnemyDefeated(enemy);
  }

  private createPowerExplosion(x: number, y: number): void {
    const flash = this.add.circle(x, y, 28, 0xffffff, 0.98).setDepth(36);
    const core = this.add.circle(x, y, 34, 0x58ddff, 0.76).setDepth(35);
    const ring = this.add.circle(x, y, 22, 0x8d6bff, 0)
      .setStrokeStyle(7, 0x9ef5ff, 0.96)
      .setDepth(34);

    this.cameras.main.shake(150, 0.006);
    this.tweens.add({
      targets: [flash, core, ring],
      alpha: 0,
      scale: 3.5,
      duration: 320,
      ease: "Cubic.easeOut",
      onComplete: () => {
        flash.destroy();
        core.destroy();
        ring.destroy();
      },
    });
  }

  private handlePlayerEnemyOverlap(enemy: BaseEnemy): void {
    if (this.tryStompEnemy(enemy)) {
      return;
    }

    if (enemy instanceof M3Enemy) {
      if (!enemy.canDamagePlayer()) {
        return;
      }
      this.damagePlayer(enemy.damage);
      enemy.completeAttack();
      return;
    }

    this.damagePlayer(enemy.damage);

    if (enemy instanceof M2Enemy) {
      enemy.completeStrike();
    }
  }

  private tryStompEnemy(enemy: BaseEnemy): boolean {
    if (enemy.getData("stompable") !== true) {
      return false;
    }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
    const isFallingOntoEnemy = playerBody.velocity.y > 90 && playerBody.bottom <= enemyBody.top + 18;

    if (!isFallingOntoEnemy) {
      return false;
    }

    const defeated = enemy.takeDamage(this.player.stats.meleeDamage);
    this.player.setVelocityY(-310);

    if (defeated) {
      this.handleEnemyDefeated(enemy);
    } else {
      gameAudio.playEnemyHit();
    }

    return true;
  }

  private handleEnemyDefeated(enemy: BaseEnemy): void {
    this.monstersDefeatedThisLevel += 1;
    gameAudio.playEnemyDefeat();
    if (!(enemy instanceof M2Enemy && enemy.hasCustomDefeatAnimation())) {
      this.createEnemyDefeatEffect(enemy);
    }
    this.progression.addExperience(this.save, enemy.experienceReward);
    this.announceAchievements(
      this.achievements.recordEnemyDefeat(
        this.save,
        enemy.definition.id,
        this.monstersDefeatedThisLevel,
      ),
    );
    const coinReward = enemy.definition.coinReward;
    if (coinReward) {
      const amount = Phaser.Math.Between(coinReward.min, coinReward.max);
      const previousGold = this.save.player.coins;
      this.inventory.collect(this.save.player, "bronzeCoin", amount);
      const collectedGold = this.save.player.coins - previousGold;
      this.goldCollectedThisLevel += collectedGold;
      this.announceAchievements(
        this.achievements.recordGoldCollected(this.save, collectedGold),
      );
      this.createCoinGainEffect(enemy.x, enemy.y - 12, amount);
    }
    gameSaveStore.save(this.save);
    this.emitHud();
  }

  private createCoinGainEffect(x: number, y: number, amount: number): void {
    const label = this.add
      .text(x, y - 24, `+${amount} ORO`, {
        color: "#ffe48a",
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        stroke: "#3a2710",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(33);

    this.tweens.add({
      targets: label,
      y: y - 62,
      alpha: 0,
      duration: 850,
      ease: "Sine.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private createEnemyDefeatEffect(enemy: BaseEnemy): void {
    const x = enemy.x;
    const y = enemy.y;
    const palette = this.getEnemyDefeatPalette(enemy.definition.id);
    const flash = this.add.circle(x, y, 18, palette.core, 0.72).setDepth(31);
    const ring = this.add.circle(x, y, 12, palette.ring, 0).setStrokeStyle(4, palette.ring, 0.88).setDepth(30);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.8,
      duration: 150,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });

    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 3.2,
      duration: 280,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12 + Phaser.Math.FloatBetween(-0.18, 0.18);
      const distance = Phaser.Math.Between(24, 58);
      const spark = this.add
        .rectangle(x, y, Phaser.Math.Between(5, 8), Phaser.Math.Between(3, 5), palette.sparks[index % palette.sparks.length], 0.9)
        .setDepth(32)
        .setRotation(angle);

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.25,
        rotation: angle + Phaser.Math.FloatBetween(-1.4, 1.4),
        duration: Phaser.Math.Between(220, 360),
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
  }

  private getEnemyDefeatPalette(enemyId: string): { core: number; ring: number; sparks: number[] } {
    if (enemyId === "e2m3") {
      return { core: 0x8dff78, ring: 0x2f9d62, sparks: [0xd4ff8c, 0x6dff91, 0x25684f] };
    }

    if (enemyId === "m3") {
      return { core: 0xff6a32, ring: 0x9f1f2d, sparks: [0xffd06a, 0xe23a35, 0x5c1820] };
    }

    if (enemyId === "m2") {
      return { core: 0xfff1a1, ring: 0x8cecff, sparks: [0xfff1a1, 0xffffff, 0x8cecff] };
    }

    if (enemyId === "m1") {
      return { core: 0xff8f5f, ring: 0xffd56a, sparks: [0xff8f5f, 0xffd56a, 0x6be092] };
    }

    return { core: 0xff5f68, ring: 0xffd56a, sparks: [0xff5f68, 0xffd56a, 0xffffff] };
  }

  private damagePlayer(amount: number): void {
    if (this.levelFinished) {
      return;
    }

    const previousHealth = this.player.stats.health;
    const defeated = this.player.takeDamage(amount);
    if (this.player.stats.health < previousHealth) {
      gameAudio.playPlayerHit();
      this.showDamageFeedback(previousHealth - this.player.stats.health);
    }

    gameSaveStore.save(this.save);
    this.emitHud();
    if (defeated) {
      this.finishWithDefeat();
    }
  }

  private handleHazardOverlap(hazard: Phaser.GameObjects.GameObject): void {
    const damage = hazard.getData("damage") as number | undefined;
    const hazardType = hazard.getData("hazardType") as LevelHazardDefinition["type"] | undefined;
    if (hazardType === "pit") {
      this.handlePitFall();
      return;
    }

    this.damagePlayer(damage ?? 1);
  }

  private updateCameraPressure(delta: number): void {
    const camera = this.cameras.main;
    const visibleWorldWidth = this.cameraSystem.getVisibleWorldWidth(this);
    const maxScrollX = Math.max(0, this.level.worldWidth - visibleWorldWidth);
    this.pressureScrollX = Math.max(this.pressureScrollX, camera.scrollX);
    this.pressureScrollX = Math.min(
      maxScrollX,
      this.pressureScrollX + this.level.autoScrollSpeed * (delta / 1000),
    );

    const playerTargetX = Phaser.Math.Clamp(
      this.player.x - visibleWorldWidth * 0.38,
      0,
      maxScrollX,
    );
    const targetScrollX = Math.max(this.pressureScrollX, playerTargetX);
    camera.scrollX = Phaser.Math.Linear(camera.scrollX, targetScrollX, 0.09);

    if (camera.scrollX < this.pressureScrollX) {
      camera.scrollX = this.pressureScrollX;
    }
  }

  private handlePressureLineDamage(delta: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const pressureLineX = this.cameras.main.scrollX + this.pressureLine.width + 6;
    const isTouchingPressure = body.left <= pressureLineX;

    if (!isTouchingPressure) {
      this.pressureDamageCooldownMs = 0;
      return;
    }

    this.pressureDamageCooldownMs -= delta;
    if (this.pressureDamageCooldownMs > 0) {
      return;
    }

    this.damagePlayer(1);
    this.pressureDamageCooldownMs = 1000;
  }

  private activateCheckpoint(): void {
    if (this.activeCheckpoint?.id === this.level.checkpoint.id) {
      return;
    }

    this.activeCheckpoint = { ...this.level.checkpoint };
    this.save.checkpointId = this.level.checkpoint.id;
    this.announceAchievements(
      this.achievements.recordCheckpointActivated(this.save, this.level.checkpoint.id),
    );
    gameSaveStore.save(this.save);
    this.checkpoint.setTint(0xffffff);
    this.emitHud();
  }

  private handlePlayerFall(): void {
    this.handlePitFall();
  }

  private handlePitFall(): void {
    if (this.levelFinished || this.recoveringFromPit) {
      return;
    }

    this.recoveringFromPit = true;
    const previousHealth = this.save.player.health;
    this.save.player.health = Math.max(0, this.save.player.health - 1);
    gameAudio.playPlayerHit();
    this.showDamageFeedback(previousHealth - this.save.player.health);
    gameSaveStore.save(this.save);
    this.emitHud();

    if (this.save.player.health <= 0) {
      this.finishWithDefeat();
      return;
    }

    const safePoint = this.findPitRespawnPoint();
    this.player.setPosition(safePoint.x, safePoint.y);
    this.player.setVelocity(0, 0);
    this.pressureDamageCooldownMs = 1500;
    this.time.delayedCall(250, () => {
      this.recoveringFromPit = false;
    });
  }

  private findPitRespawnPoint(): { x: number; y: number } {
    const viewStart = this.cameras.main.scrollX;
    const desiredX = viewStart + 92;
    const searchEnd = Math.min(this.level.worldWidth - 48, viewStart + GAME_WIDTH * 0.45);
    const groundPlatforms = this.level.platforms
      .filter((platform) => platform.y >= 640)
      .sort((a, b) => a.x - b.x);

    for (let x = desiredX; x <= searchEnd; x += 20) {
      const platform = groundPlatforms.find(
        (candidate) => x >= candidate.x + 42 && x <= candidate.x + candidate.width - 42,
      );
      if (!platform) {
        continue;
      }

      const blockedByHazard = this.level.hazards.some(
        (hazard) =>
          hazard.type !== "pit" &&
          x >= hazard.x - 55 &&
          x <= hazard.x + hazard.width + 55,
      );
      const blockedByEnemy = this.enemies.getChildren().some((child) => {
        const enemy = child as BaseEnemy;
        return enemy.active && Math.abs(enemy.x - x) < 105 && Math.abs(enemy.y - platform.y) < 130;
      });
      if (!blockedByHazard && !blockedByEnemy) {
        return { x, y: platform.y - 60 };
      }
    }

    const fallbackPlatform =
      groundPlatforms.find((platform) => platform.x + platform.width - 42 >= desiredX) ??
      groundPlatforms[groundPlatforms.length - 1];
    return {
      x: Phaser.Math.Clamp(
        desiredX,
        fallbackPlatform.x + 42,
        fallbackPlatform.x + fallbackPlatform.width - 42,
      ),
      y: fallbackPlatform.y - 60,
    };
  }

  private resetPressureForSafePoint(safePointX: number): void {
    const maxScrollX = Math.max(0, this.level.worldWidth - GAME_WIDTH);
    const safeScrollX = Phaser.Math.Clamp(safePointX - GAME_WIDTH * 0.32, 0, maxScrollX);
    this.pressureScrollX = safeScrollX;
    this.cameras.main.scrollX = safeScrollX;
    this.pressureDamageCooldownMs = 1500;
  }

  private showDamageFeedback(amount: number): void {
    if (amount <= 0) {
      return;
    }

    this.damageTakenThisLevel = true;
    this.cameras.main.shake(160, 0.009);
    gameEvents.emit(EVENTS.PLAYER_DAMAGED, { amount });
  }

  private finishWithDefeat(): void {
    if (this.levelFinished) {
      return;
    }

    this.levelFinished = true;
    this.activeCheckpoint = undefined;
    this.save.checkpointId = undefined;
    this.recordRunStatistics("defeat");
    gameSaveStore.save(this.save);
    this.player.markDefeated();
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.enable = false;
    this.time.delayedCall(620, () => {
      this.scene.start("GameOverScene", { result: "defeat", restartLevelId: this.level.id });
    });
  }

  private completeLevel(): void {
    if (this.levelFinished) {
      return;
    }

    this.levelFinished = true;
    this.activeCheckpoint = undefined;
    this.save.checkpointId = undefined;
    const isNewCompletion = !this.save.completedLevels.includes(this.level.id);
    if (isNewCompletion) {
      this.save.completedLevels.push(this.level.id);
    }

    if (this.level.nextLevelId && !this.save.unlockedLevels.includes(this.level.nextLevelId)) {
      this.save.unlockedLevels.push(this.level.nextLevelId);
    }

    this.announceAchievements(
      this.achievements.recordLevelCompleted(
        this.save,
        this.level.id,
        !this.damageTakenThisLevel,
        this.save.completedLevels.length,
        isNewCompletion,
      ),
    );

    this.recordRunStatistics("completed");
    gameSaveStore.save(this.save);
    const nextLevel = this.level.nextLevelId
      ? levelDefinitions[this.level.nextLevelId]
      : undefined;
    gameEvents.emit(EVENTS.LEVEL_COMPLETED, {
      levelId: this.level.id,
      levelName: this.level.name,
      stageNumber: this.level.stageNumber,
      theme: this.level.theme,
      monstersDefeated: this.monstersDefeatedThisLevel,
      gameplayDurationSeconds: Math.max(1, Math.round(this.gameplayElapsedMs / 1000)),
      goldCollected: this.goldCollectedThisLevel,
      actionsPerMinute: Math.round(
        this.playerActionCount / Math.max(this.gameplayElapsedMs / 60_000, 1 / 60),
      ),
      achievementIds: [...this.unlockedAchievementsThisLevel],
      nextLevelId: nextLevel?.id,
      nextLevelName: nextLevel?.name,
      nextStageNumber: nextLevel?.stageNumber,
    });
    gameAudio.playLevelComplete();
    this.emitHud();
    this.showLevelSummary();
  }

  private showLevelSummary(): void {
    this.physics.pause();
    gameEvents.emit(EVENTS.SCREEN_CHANGED, "level-transition");
    this.cameras.main.stopFollow();
  }

  private recordRunStatistics(result: "completed" | "defeat" | "abandoned"): void {
    if (this.runStatisticsRecorded) {
      return;
    }

    this.runStatisticsRecorded = true;
    this.save.statistics.runsPlayed += 1;
    this.save.statistics.gameplaySeconds += Math.max(1, Math.round(this.gameplayElapsedMs / 1000));
    this.save.statistics.actions += this.playerActionCount;

    if (result === "completed") {
      this.save.statistics.completedRuns += 1;
    } else if (result === "defeat") {
      this.save.statistics.defeats += 1;
    }
  }

  private announceAchievements(achievementIds: AchievementId[]): void {
    for (const achievementId of achievementIds) {
      if (!this.unlockedAchievementsThisLevel.includes(achievementId)) {
        this.unlockedAchievementsThisLevel.push(achievementId);
      }
      const achievement = getAchievementDefinition(achievementId);
      if (!achievement) {
        continue;
      }

      gameEvents.emit(EVENTS.ACHIEVEMENT_UNLOCKED, {
        id: achievement.id,
        title: achievement.title,
        icon: achievement.icon,
        reward: achievement.reward,
      });
    }
  }

  private updateLevelTimer(delta: number): void {
    this.remainingTimeMs = Math.max(0, this.remainingTimeMs - delta);
    const remainingSeconds = Math.ceil(this.remainingTimeMs / 1000);

    if (remainingSeconds !== this.lastHudSecond) {
      this.lastHudSecond = remainingSeconds;
      this.emitHud();
    }

    if (this.remainingTimeMs <= 0) {
      const previousHealth = this.save.player.health;
      this.save.player.health = 0;
      gameAudio.playPlayerHit();
      this.showDamageFeedback(previousHealth);
      this.emitHud();
      this.finishWithDefeat();
    }
  }

  private emitHud(): void {
    const powerCharges = this.getActivePowerCharges();
    gameEvents.emit(EVENTS.HUD_UPDATED, {
      stageNumber: this.level.stageNumber,
      health: this.save.player.health,
      maxHealth: this.save.player.maxHealth,
      level: this.save.player.level,
      experience: this.save.player.experience,
      experienceToNextLevel: this.save.player.experienceToNextLevel,
      coins: this.save.player.coins,
      healingCharges: powerCharges.healingCharges,
      powerCharges: powerCharges.powerCharges,
      timeRemaining: Math.ceil(this.remainingTimeMs / 1000),
      timeLimit: this.level.timeLimitSeconds,
      progressPercent: this.getProgressPercent(),
    });
  }

  private getActivePowerCharges(): PowerChargeState {
    return this.save.characterPowerCharges[this.save.selectedCharacterId];
  }

  private getProgressPercent(): number {
    const startX = this.level.playerStart.x;
    const goalDistance = Math.max(1, this.level.goal.x - startX);
    const playerDistance = Phaser.Math.Clamp(this.player.x - startX, 0, goalDistance);
    return Math.round((playerDistance / goalDistance) * 100);
  }
}
