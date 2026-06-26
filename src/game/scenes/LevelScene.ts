import Phaser from "phaser";
import { gameAudio } from "../../shared/audio/GameAudio";
import { EVENTS } from "../../shared/constants/events";
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_DEFAULTS } from "../../shared/constants/game";
import type { LevelDefinition, LevelHazardDefinition, SaveData } from "../../shared/types/game";
import { BasicEnemy } from "../entities/enemies/BasicEnemy";
import type { BaseEnemy } from "../entities/enemies/BaseEnemy";
import { M1Enemy } from "../entities/enemies/M1Enemy";
import { M2Enemy } from "../entities/enemies/M2Enemy";
import { MovingHazard } from "../entities/hazards/MovingHazard";
import { Coin } from "../entities/items/Coin";
import { Player } from "../entities/player/Player";
import type { Projectile } from "../entities/projectiles/Projectile";
import { getCharacterDefinition } from "../data/characters";
import { levelDefinitions } from "../data/levels";
import { gameEvents } from "../events/EventBus";
import { CameraSystem } from "../systems/camera/CameraSystem";
import { CombatSystem } from "../systems/combat/CombatSystem";
import { GameplayInputSystem } from "../systems/input/GameplayInputSystem";
import { touchInputStore } from "../systems/input/TouchInputStore";
import { InventorySystem } from "../systems/inventory/InventorySystem";
import { MovementSystem } from "../systems/movement/MovementSystem";
import { ProgressionSystem } from "../systems/progression/ProgressionSystem";
import { LocalSaveAdapter } from "../systems/save/LocalSaveAdapter";

export class LevelScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private save!: SaveData;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private lifePickups!: Phaser.Physics.Arcade.StaticGroup;
  private staticHazards!: Phaser.Physics.Arcade.StaticGroup;
  private movingHazards!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private checkpoint!: Phaser.Physics.Arcade.Sprite;
  private goal!: Phaser.Physics.Arcade.Sprite;
  private inputSystem!: GameplayInputSystem;
  private activeCheckpoint?: { x: number; y: number; id: string };
  private readonly saveAdapter = new LocalSaveAdapter();
  private readonly movement = new MovementSystem();
  private readonly combat = new CombatSystem();
  private readonly progression = new ProgressionSystem();
  private readonly inventory = new InventorySystem();
  private readonly cameraSystem = new CameraSystem();
  private unbindResume?: () => void;
  private unbindRestart?: () => void;
  private unbindMenu?: () => void;
  private remainingTimeMs = 0;
  private lastHudSecond = -1;
  private levelFinished = false;
  private pressureScrollX = 0;
  private pressureDamageCooldownMs = 0;
  private pressureLine!: Phaser.GameObjects.Rectangle;

  constructor() {
    super("LevelScene");
  }

  create(data: { levelId?: string }): void {
    this.level = levelDefinitions[data.levelId ?? "meadowOutpost"];
    this.save = this.saveAdapter.load();
    this.save.player.maxHealth = PLAYER_DEFAULTS.maxHealth;
    this.save.player.health = this.save.player.maxHealth;
    this.save.checkpointId = undefined;
    this.activeCheckpoint = undefined;
    this.remainingTimeMs = this.level.timeLimitSeconds * 1000;
    this.lastHudSecond = -1;
    this.levelFinished = false;
    this.pressureScrollX = 0;
    this.pressureDamageCooldownMs = 0;

    touchInputStore.reset();
    this.inputSystem = new GameplayInputSystem(this);
    this.createWorld();
    this.createPlayer();
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

    this.updateLevelTimer(delta);
    if (this.levelFinished) {
      return;
    }

    const input = this.inputSystem.readFrame();
    this.handleMovementAudio(input);
    this.movement.update(this.player, input);
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
    this.cameras.main.setBackgroundColor("#071323");
    this.physics.world.setBounds(0, 0, this.level.worldWidth, GAME_HEIGHT);
    this.createForestBackdrop();
    this.createGroundLayer();
    this.createScenarioDressings();
    this.pressureLine = this.add
      .rectangle(3, GAME_HEIGHT / 2, 6, GAME_HEIGHT, 0xff2638, 0.96)
      .setScrollFactor(0)
      .setDepth(30);

    this.platforms = this.physics.add.staticGroup();
    for (const platform of this.level.platforms) {
      this.createPlatform(platform);
    }

    this.staticHazards = this.physics.add.staticGroup();
    for (const hazard of this.level.hazards.filter((item) => item.type !== "moving")) {
      this.createStaticHazard(hazard);
    }
  }

  private createPlayer(): void {
    const start = this.activeCheckpoint ?? this.level.playerStart;
    const character = getCharacterDefinition(this.save.selectedCharacterId);
    this.player = new Player(this, start.x, start.y, this.save.player, character);
    this.cameraSystem.setBounds(this, this.level.worldWidth);
  }

  private createEntities(): void {
    this.enemies = this.physics.add.group();
    this.coins = this.physics.add.group();
    this.lifePickups = this.physics.add.staticGroup();
    this.movingHazards = this.physics.add.group({ runChildUpdate: true });
    this.projectiles = this.physics.add.group({ runChildUpdate: true });

    for (const enemy of this.level.enemies) {
      this.enemies.add(this.createEnemy(enemy));
    }

    for (const coin of this.level.coins) {
      this.coins.add(new Coin(this, coin.x, coin.y, coin.itemId));
    }

    for (const pickup of this.level.lifePickups) {
      const life = this.lifePickups.create(pickup.x, pickup.y, "life");
      life.setDepth(9);
      life.setData("pickupId", pickup.id);
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
    this.goal = this.physics.add.staticSprite(this.level.goal.x, this.level.goal.y, "goal");
    this.goal.setDepth(9);
  }

  private createEnemy(enemy: LevelDefinition["enemies"][number]): BaseEnemy {
    if (enemy.enemyId === "m1") {
      return new M1Enemy(this, enemy.x, enemy.y, enemy.patrolDistance);
    }

    if (enemy.enemyId === "m2") {
      return new M2Enemy(this, enemy.x, enemy.y, enemy.patrolDistance, enemy.aggression);
    }

    return new BasicEnemy(this, enemy.x, enemy.y, enemy.enemyId, enemy.patrolDistance);
  }

  private createCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.projectiles, this.platforms, (projectile) => {
      projectile.destroy();
    });

    this.physics.add.overlap(this.player, this.coins, (_player, coin) => {
      this.collectCoin(coin as Coin);
    });

    this.physics.add.overlap(this.player, this.lifePickups, (_player, pickup) => {
      this.collectLifePickup(pickup as Phaser.Physics.Arcade.Sprite);
    });

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

    this.physics.add.overlap(this.player, this.checkpoint, () => this.activateCheckpoint());
    this.physics.add.overlap(this.player, this.goal, () => this.completeLevel());
  }

  private bindSceneEvents(): void {
    this.unbindResume = gameEvents.on(EVENTS.RESUME_GAME, () => {
      if (this.scene.isPaused()) {
        this.scene.resume();
        gameEvents.emit(EVENTS.SCREEN_CHANGED, "playing");
      }
    });

    this.unbindRestart = gameEvents.on(EVENTS.RESTART_GAME, () => {
      this.scene.start("LevelScene", { levelId: this.level.id });
    });

    this.unbindMenu = gameEvents.on(EVENTS.GO_TO_MENU, () => {
      this.scene.start("MainMenuScene");
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unbindResume?.();
      this.unbindRestart?.();
      this.unbindMenu?.();
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
  }

  private handleMovementAudio(input: ReturnType<GameplayInputSystem["readFrame"]>): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (input.jumpJustPressed && body.blocked.down) {
      gameAudio.playJump();
    }
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

  private createGroundLayer(): void {
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

    this.createTerrainRun(platform);

    const collisionBody = this.add
      .rectangle(platform.x, platform.y, platform.width, platform.height, 0x000000, 0)
      .setOrigin(0, 0);

    this.physics.add.existing(collisionBody, true);
    this.platforms.add(collisionBody);
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
    this.inventory.collect(this.save.player, coin.itemId);
    gameAudio.playCollect();
    coin.disableBody(true, true);
    this.saveAdapter.save(this.save);
    this.emitHud();
  }

  private collectLifePickup(pickup: Phaser.Physics.Arcade.Sprite): void {
    this.save.player.maxHealth += 1;
    this.save.player.health = this.save.player.maxHealth;
    gameAudio.playCollect();
    pickup.disableBody(true, true);
    this.saveAdapter.save(this.save);
    this.emitHud();
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

  private handlePlayerEnemyOverlap(enemy: BaseEnemy): void {
    if (this.tryStompEnemy(enemy)) {
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
    gameAudio.playEnemyDefeat();
    this.createEnemyDefeatEffect(enemy);
    this.progression.addExperience(this.save.player, enemy.experienceReward);
    this.saveAdapter.save(this.save);
    this.emitHud();
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
    }

    this.saveAdapter.save(this.save);
    this.emitHud();
    if (defeated) {
      this.levelFinished = true;
      this.scene.start("GameOverScene", { result: "defeat", restartLevelId: this.level.id });
    }
  }

  private handleHazardOverlap(hazard: Phaser.GameObjects.GameObject): void {
    const damage = hazard.getData("damage") as number | undefined;
    const hazardType = hazard.getData("hazardType") as LevelHazardDefinition["type"] | undefined;
    const wasDefeated = this.player.stats.health <= (damage ?? 1);
    this.damagePlayer(damage ?? 1);

    if (hazardType === "pit" && !wasDefeated && !this.levelFinished) {
      this.respawnPlayerAtSafePoint();
    }
  }

  private updateCameraPressure(delta: number): void {
    const camera = this.cameras.main;
    const maxScrollX = Math.max(0, this.level.worldWidth - GAME_WIDTH);
    this.pressureScrollX = Math.max(this.pressureScrollX, camera.scrollX);
    this.pressureScrollX = Math.min(
      maxScrollX,
      this.pressureScrollX + this.level.autoScrollSpeed * (delta / 1000),
    );

    const playerTargetX = Phaser.Math.Clamp(
      this.player.x - GAME_WIDTH * 0.38,
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
    this.activeCheckpoint = { ...this.level.checkpoint };
    this.save.checkpointId = this.level.checkpoint.id;
    this.saveAdapter.save(this.save);
    this.checkpoint.setTint(0xffffff);
  }

  private handlePlayerFall(): void {
    if (this.levelFinished) {
      return;
    }

    if (this.save.player.health > 1) {
      this.save.player.health -= 1;
      gameAudio.playPlayerHit();
      this.respawnPlayerAtSafePoint();
      this.emitHud();
      return;
    }

    this.save.player.health = 0;
    gameAudio.playPlayerHit();
    this.emitHud();
    this.levelFinished = true;
    this.scene.start("GameOverScene", { result: "defeat", restartLevelId: this.level.id });
  }

  private respawnPlayerAtSafePoint(): void {
    const safePoint = this.activeCheckpoint ?? this.level.playerStart;
    this.player.setPosition(safePoint.x, safePoint.y - 60);
    this.player.setVelocity(0, 0);
  }

  private completeLevel(): void {
    if (this.levelFinished) {
      return;
    }

    this.levelFinished = true;
    if (!this.save.completedLevels.includes(this.level.id)) {
      this.save.completedLevels.push(this.level.id);
    }

    if (this.level.nextLevelId && !this.save.unlockedLevels.includes(this.level.nextLevelId)) {
      this.save.unlockedLevels.push(this.level.nextLevelId);
    }

    this.saveAdapter.save(this.save);
    gameEvents.emit(EVENTS.LEVEL_COMPLETED, { levelId: this.level.id });
    gameAudio.playLevelComplete();
    this.emitHud();

    if (this.level.nextLevelId) {
      this.playLevelTransition(this.level.nextLevelId);
      return;
    }

    this.scene.start("GameOverScene", { result: "victory" });
  }

  private playLevelTransition(nextLevelId: string): void {
    const nextLevel = levelDefinitions[nextLevelId];
    const nextLabel = nextLevel?.name ?? "Next Level";
    const durationMs = 4000;
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.physics.pause();
    gameEvents.emit(EVENTS.SCREEN_CHANGED, "level-transition");
    this.cameras.main.stopFollow();
    this.cameras.main.fadeOut(520, 8, 16, 24);
    this.time.delayedCall(520, () => {
      this.cameras.main.fadeIn(640, 8, 16, 24);
    });

    const shade = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050a10, 0.9)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(220);

    const horizon = this.add
      .rectangle(centerX, centerY + 60, 0, 3, 0x9be7dc, 0.9)
      .setScrollFactor(0)
      .setDepth(221);

    const title = this.add
      .text(centerX, centerY - 86, "Nivel completado", {
        color: "#fff4cf",
        fontFamily: "Arial, sans-serif",
        fontSize: "34px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(222)
      .setAlpha(0);

    const subtitle = this.add
      .text(centerX, centerY - 36, `Avanzando a ${nextLabel}`, {
        color: "#9be7dc",
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(222)
      .setAlpha(0);

    const progressBack = this.add
      .rectangle(centerX - 210, centerY + 30, 420, 10, 0x132331, 0.95)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(222)
      .setAlpha(0);

    const progressFill = this.add
      .rectangle(centerX - 210, centerY + 30, 1, 10, 0xf2c45f, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(223)
      .setAlpha(0);

    const footer = this.add
      .text(centerX, centerY + 88, "Preparando el siguiente tramo", {
        color: "#d9ccb0",
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(222)
      .setAlpha(0);

    this.tweens.add({
      targets: [title, subtitle, progressBack, progressFill, footer],
      alpha: 1,
      duration: 520,
      ease: "Sine.easeOut",
    });

    this.tweens.add({
      targets: horizon,
      width: 620,
      alpha: 0.25,
      duration: durationMs,
      ease: "Cubic.easeInOut",
    });

    this.tweens.add({
      targets: progressFill,
      displayWidth: 420,
      duration: durationMs - 520,
      ease: "Sine.easeInOut",
    });

    this.tweens.add({
      targets: shade,
      alpha: 0.78,
      duration: 1200,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
    });

    this.time.delayedCall(durationMs - 520, () => {
      this.cameras.main.fadeOut(520, 8, 16, 24);
    });

    this.time.delayedCall(durationMs, () => {
      this.scene.start("LevelScene", { levelId: nextLevelId });
    });
  }

  private updateLevelTimer(delta: number): void {
    this.remainingTimeMs = Math.max(0, this.remainingTimeMs - delta);
    const remainingSeconds = Math.ceil(this.remainingTimeMs / 1000);

    if (remainingSeconds !== this.lastHudSecond) {
      this.lastHudSecond = remainingSeconds;
      this.emitHud();
    }

    if (this.remainingTimeMs <= 0) {
      this.levelFinished = true;
      this.save.player.health = 0;
      gameAudio.playPlayerHit();
      this.emitHud();
      this.scene.start("GameOverScene", { result: "defeat", restartLevelId: this.level.id });
    }
  }

  private emitHud(): void {
    gameEvents.emit(EVENTS.HUD_UPDATED, {
      health: this.save.player.health,
      maxHealth: this.save.player.maxHealth,
      level: this.save.player.level,
      experience: this.save.player.experience,
      experienceToNextLevel: this.save.player.experienceToNextLevel,
      coins: this.save.player.coins,
      timeRemaining: Math.ceil(this.remainingTimeMs / 1000),
      timeLimit: this.level.timeLimitSeconds,
      progressPercent: this.getProgressPercent(),
    });
  }

  private getProgressPercent(): number {
    const startX = this.level.playerStart.x;
    const goalDistance = Math.max(1, this.level.goal.x - startX);
    const playerDistance = Phaser.Math.Clamp(this.player.x - startX, 0, goalDistance);
    return Math.round((playerDistance / goalDistance) * 100);
  }
}
