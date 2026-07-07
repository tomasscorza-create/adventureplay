import Phaser from "phaser";
import { EVENTS } from "../../shared/constants/events";
import { GAME_HEIGHT, GAME_WIDTH } from "../../shared/constants/game";
import type { AchievementId, HudState, SaveData } from "../../shared/types/game";
import { getAchievementDefinition } from "../data/achievements";
import { getCharacterDefinition } from "../data/characters";
import type { SfxCue } from "../data/sfx";
import {
  puzzleLevelDefinitions,
  type PuzzleLevelDefinition,
} from "../data/puzzleLevels";
import { Coin } from "../entities/items/Coin";
import { Player } from "../entities/player/Player";
import { PowerProjectile } from "../entities/projectiles/PowerProjectile";
import { gameEvents } from "../events/EventBus";
import { AchievementSystem } from "../systems/achievements/AchievementSystem";
import { CameraSystem } from "../systems/camera/CameraSystem";
import { GameplayInputSystem } from "../systems/input/GameplayInputSystem";
import { touchInputStore } from "../systems/input/TouchInputStore";
import { InventorySystem } from "../systems/inventory/InventorySystem";
import { MovementSystem } from "../systems/movement/MovementSystem";
import { ProgressionSystem } from "../systems/progression/ProgressionSystem";
import { resolveProjectileImpact } from "../systems/projectiles/ProjectileImpactResolver";
import { PuzzleActivationSystem } from "../systems/puzzles/PuzzleActivationSystem";
import {
  getSourceBodyDimension,
  PUZZLE_CRATE_COLLISION_SIZE,
  PUZZLE_CRATE_DISPLAY_SIZE,
  shouldCrateStaySolid,
} from "../systems/puzzles/PuzzleGeometry";
import {
  averageOpaqueColor,
  derivePuzzleVisualPalette,
  type PuzzleVisualPalette,
} from "../systems/puzzles/PuzzleVisualPalette";
import { gameSaveStore } from "../systems/save/GameSaveStore";
import { LevelRunTracker, type RunResult } from "./level/LevelRunTracker";

export class PuzzleScene extends Phaser.Scene {
  private level!: PuzzleLevelDefinition;
  private save!: SaveData;
  private player!: Player;
  private crates: Phaser.GameObjects.Image[] = [];
  private plates: Array<{
    id: string;
    rect: Phaser.GameObjects.Rectangle;
    visual: Phaser.GameObjects.Image;
    definition: { id: string; x: number; y: number; width: number; hint?: string };
  }> = [];
  private boxJumpMarkers: Phaser.GameObjects.Rectangle[] = [];
  private levers: Array<{
    id: string;
    rect: Phaser.GameObjects.Rectangle;
    knob: Phaser.GameObjects.Arc;
    visual: Phaser.GameObjects.Image;
    definition: { id: string; x: number; y: number; rangedOnly?: boolean; hint?: string };
  }> = [];
  private gates: Array<{
    id: string;
    rect: Phaser.GameObjects.Rectangle;
    visual: Phaser.GameObjects.Image;
    definition: { id: string; x: number; y: number; width: number; height: number; requiredActivations?: string[] };
    opened: boolean;
  }> = [];
  private goal!: Phaser.GameObjects.Arc;
  private goalGate!: {
    rect: Phaser.GameObjects.Rectangle;
    visual: Phaser.GameObjects.Image;
    opened: boolean;
  };
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private visualPalette!: PuzzleVisualPalette;
  private coins!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private inventoryPickup?: Coin;
  private inputSystem!: GameplayInputSystem;
  private remainingTimeMs = 0;
  private levelFinished = false;
  private goldCollected = 0;
  private lastHudSecond = -1;
  private lastSpinHudStep = -1;
  private unlockedAchievements: AchievementId[] = [];
  private damageCooldownUntil = 0;
  private objectiveText?: Phaser.GameObjects.Text;
  private plateKeyPanel?: Phaser.GameObjects.Container;
  private plateKeyIndicators: Array<{
    plateId: string;
    icon: Phaser.GameObjects.Graphics;
    glow: Phaser.GameObjects.Arc;
    active: boolean;
  }> = [];
  private unbindResume?: () => void;
  private unbindPowerShop?: () => void;
  private unbindRestart?: () => void;
  private unbindContinue?: () => void;
  private unbindMenu?: () => void;
  private unbindCameraZoom?: () => void;
  private readonly movement = new MovementSystem();
  private readonly inventory = new InventorySystem();
  private readonly progression = new ProgressionSystem();
  private readonly achievements = new AchievementSystem();
  private readonly cameraSystem = new CameraSystem();
  private readonly runTracker = new LevelRunTracker();
  private readonly activations = new PuzzleActivationSystem();
  private seals: Array<{
    hitbox: Phaser.GameObjects.Rectangle;
    visual: Phaser.GameObjects.Image;
  }> = [];

  constructor() {
    super("PuzzleScene");
  }

  create(data: { levelId?: string }): void {
    this.level = puzzleLevelDefinitions[data.levelId ?? "trialChamber1"]
      ?? puzzleLevelDefinitions.trialChamber1;
    this.save = gameSaveStore.load();
    this.save.player.health = this.save.player.maxHealth;
    this.remainingTimeMs = this.level.timeLimitSeconds * 1000;
    this.levelFinished = false;
    this.goldCollected = 0;
    this.lastHudSecond = -1;
    this.lastSpinHudStep = -1;
    this.unlockedAchievements = [];
    this.runTracker.reset();
    this.activations.reset(this.level.requiredActivations);
    this.movement.reset();
    touchInputStore.reset();
    gameSaveStore.save(this.save);

    gameEvents.emit(EVENTS.ACTIVE_LEVEL_CHANGED, { levelId: this.level.id });
    this.inputSystem = new GameplayInputSystem(this);
    this.createWorld();
    this.createPlayer();
    this.createPuzzleObjects();
    this.createCollectibles();
    this.createCollisions();
    this.bindSceneEvents();
    this.scene.launch("UIScene");
    gameEvents.emit(EVENTS.SCREEN_CHANGED, "playing");
    this.emitHud();
  }

  update(_time: number, delta: number): void {
    if (this.levelFinished) return;

    this.runTracker.advance(delta);
    this.remainingTimeMs = Math.max(0, this.remainingTimeMs - delta);
    if (this.remainingTimeMs <= 0) {
      this.finishWithDefeat();
      return;
    }

    const input = this.inputSystem.readFrame();
    this.runTracker.trackInput(input);
    const jumped = this.movement.update(this.player, input, delta);
    if (jumped) this.playSfx("jump");
    this.handleActions(input);
    this.updateCrateSolidity();
    this.handleStackedCratesPhysics();
    this.updatePlateStates();
    this.updateObjectiveText();

    const hudSecond = Math.ceil(this.remainingTimeMs / 1000);
    const spinStep = Math.ceil(this.player.getSpinCooldownRemaining(this.time.now) / 100);
    if (hudSecond !== this.lastHudSecond || spinStep !== this.lastSpinHudStep) {
      this.emitHud();
    }
  }

  private createWorld(): void {
    this.cameras.main.setBackgroundColor("#111828");
    this.physics.world.setBounds(0, 0, this.level.worldWidth, GAME_HEIGHT);
    const backdrop = this.add
      .image(0, 0, this.level.visualTheme.backgroundTextureKey)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-40);
    const backdropScale = Math.max(GAME_WIDTH / backdrop.width, GAME_HEIGHT / backdrop.height);
    backdrop
      .setScale(backdropScale)
      .setPosition(
        (GAME_WIDTH - backdrop.displayWidth) / 2,
        (GAME_HEIGHT - backdrop.displayHeight) / 2,
      );
    this.visualPalette = derivePuzzleVisualPalette(
      this.sampleBackdropColor(this.level.visualTheme.backgroundTextureKey),
    );
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07101c, this.level.visualTheme.shadeAlpha)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-39);

    this.platforms = this.physics.add.staticGroup();
    for (const platform of this.level.platforms) {
      const isGround = platform.y >= 630;
      if (!isGround) {
        this.add
          .rectangle(
            platform.x + 7,
            platform.y + 9,
            platform.width,
            platform.height + 8,
            this.visualPalette.shadow,
            0.58,
          )
          .setOrigin(0, 0)
          .setDepth(5.4);
        this.add
          .rectangle(
            platform.x + 2,
            platform.y + platform.height - 1,
            platform.width - 4,
            10,
            this.visualPalette.lowerFace,
            0.98,
          )
          .setOrigin(0, 0)
          .setDepth(5.8);
      }
      const block = this.add
        .rectangle(
          platform.x,
          platform.y,
          platform.width,
          platform.height,
          this.visualPalette.body,
          1,
        )
        .setOrigin(0, 0)
        .setStrokeStyle(isGround ? 2 : 3, this.visualPalette.outline, isGround ? 0.7 : 0.96)
        .setDepth(6);
      this.physics.add.existing(block, true);
      this.platforms.add(block);
      this.add
        .tileSprite(
          platform.x,
          platform.y,
          platform.width,
          platform.height,
          "ancient-trials-platform",
        )
        .setOrigin(0, 0)
        .setTint(this.visualPalette.textureTint)
        .setAlpha(isGround ? 0.58 : 0.9)
        .setDepth(6.2);
      const masonry = this.add.graphics().setDepth(6.6);
      masonry.lineStyle(2, this.visualPalette.shadow, isGround ? 0.46 : 0.68);
      for (let seamX = platform.x + 58; seamX < platform.x + platform.width; seamX += 64) {
        masonry.lineBetween(
          seamX,
          platform.y + 5,
          seamX,
          platform.y + Math.min(platform.height, 30),
        );
      }
      if (platform.height > 34) {
        masonry.lineBetween(
          platform.x,
          platform.y + 32,
          platform.x + platform.width,
          platform.y + 32,
        );
      }
      this.add
        .rectangle(
          platform.x,
          platform.y,
          platform.width,
          Math.min(4, platform.height),
          this.visualPalette.topEdge,
          isGround ? 0.76 : 1,
        )
        .setOrigin(0, 0)
        .setDepth(7);
    }

    this.cameras.main.setBounds(0, 0, this.level.worldWidth, GAME_HEIGHT);
    this.unbindCameraZoom = this.cameraSystem.bindResponsiveZoom(this, this.level.worldWidth);
  }

  private sampleBackdropColor(textureKey: string): number {
    try {
      const source = this.textures.get(textureKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 18;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return 0x182635;
      context.drawImage(source, 0, 0, source.width, source.height, 0, 0, canvas.width, canvas.height);
      return averageOpaqueColor(context.getImageData(0, 0, canvas.width, canvas.height).data);
    } catch {
      return 0x182635;
    }
  }

  private createPlayer(): void {
    this.player = new Player(
      this,
      this.level.playerStart.x,
      this.level.playerStart.y,
      this.save.player,
      getCharacterDefinition(this.save.selectedCharacterId),
    );
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08, -180, 40);
  }

  private createPuzzleObjects(): void {
    // 1. Cajas (Crates)
    this.crates = [];
    for (const crateDef of this.level.crates) {
      const crate = this.add
        .image(crateDef.x, crateDef.y, "ancient-trials-crate")
        .setDisplaySize(PUZZLE_CRATE_DISPLAY_SIZE, PUZZLE_CRATE_DISPLAY_SIZE)
        .setTint(this.visualPalette.objectTint)
        .setDepth(10);
      this.physics.add.existing(crate);
      const crateBody = crate.body as Phaser.Physics.Arcade.Body;
      // Arcade multiplica setSize por la escala visual. Convertimos 70 px de
      // mundo a dimensiones fuente para conservar exactamente el cuerpo original.
      crateBody.setSize(
        getSourceBodyDimension(
          crate.width,
          crate.displayWidth,
          PUZZLE_CRATE_COLLISION_SIZE,
        ),
        getSourceBodyDimension(
          crate.height,
          crate.displayHeight,
          PUZZLE_CRATE_COLLISION_SIZE,
        ),
        true,
      )
        .setCollideWorldBounds(true)
        .setDragX(520)
        .setMaxVelocity(180, 700)
        .setBounce(0, 0);
      this.crates.push(crate);
    }

    // 2. Placas (Plates)
    this.plates = [];
    for (const plateDef of this.level.plates) {
      const rect = this.add
        .rectangle(plateDef.x, plateDef.y + 15, plateDef.width, 15, this.visualPalette.lowerFace)
        .setOrigin(0.5, 1)
        .setStrokeStyle(2, this.visualPalette.topEdge, 0.96)
        .setAlpha(0.94)
        .setDepth(8);
      const visual = this.add
        .image(plateDef.x, plateDef.y + 15, "ancient-trials-plate")
        .setOrigin(0.5, 1)
        .setDisplaySize(plateDef.width + 18, 34)
        .setTint(this.visualPalette.objectTint)
        .setDepth(8);
      this.plates.push({
        id: plateDef.id,
        rect,
        visual,
        definition: plateDef,
      });
    }

    // 3. Marcadores de salto (Box Jump Zones)
    this.boxJumpMarkers = [];
    const zones = this.level.boxJumpZones ?? (this.level.boxJumpZone ? [this.level.boxJumpZone] : []);
    for (const zone of zones) {
      const marker = this.add
        .rectangle(
          zone.x,
          zone.y,
          zone.width,
          12,
          this.visualPalette.body,
          0.34,
        )
        .setOrigin(0.5, 1)
        .setStrokeStyle(2, this.visualPalette.outline, 0.9)
        .setDepth(7);
      this.boxJumpMarkers.push(marker);
      const rune = this.add.graphics().setDepth(7.2);
      rune.lineStyle(2, this.visualPalette.topEdge, 0.82);
      rune.lineBetween(zone.x - 14, zone.y - 5, zone.x, zone.y - 11);
      rune.lineBetween(zone.x, zone.y - 11, zone.x + 14, zone.y - 5);
    }

    // 4. Palancas (Levers)
    this.levers = [];
    for (const leverDef of this.level.levers) {
      const rect = this.add
        .rectangle(leverDef.x, leverDef.y, 18, 66, this.visualPalette.lowerFace)
        .setOrigin(0.5, 1)
        .setStrokeStyle(3, this.visualPalette.outline, 0.94)
        .setAlpha(0.72)
        .setDepth(9);
      this.physics.add.existing(rect, true);
      const knob = this.add
        .circle(leverDef.x, leverDef.y - 63, 12, 0xc85d4d)
        .setAlpha(0.001)
        .setDepth(10);
      const visual = this.add
        .image(leverDef.x, leverDef.y + 7, "ancient-trials-lever")
        .setOrigin(0.5, 1)
        .setDisplaySize(64, 118)
        .setTint(this.visualPalette.objectTint)
        .setDepth(10);
      this.levers.push({
        id: leverDef.id,
        rect,
        knob,
        visual,
        definition: leverDef,
      });
    }

    // 5. Puertas (Gates)
    this.gates = [];
    for (const gateDef of this.level.gates) {
      const rect = this.add
        .rectangle(
          gateDef.x,
          gateDef.y,
          gateDef.width,
          gateDef.height,
        )
        .setOrigin(0, 0)
        .setVisible(false);
      this.physics.add.existing(rect, true);
      const visual = this.add
        .image(
          gateDef.x + gateDef.width / 2,
          gateDef.y + gateDef.height / 2,
          "ancient-trials-barrier",
        )
        .setDisplaySize(gateDef.width + 22, gateDef.height)
        .setTint(this.visualPalette.objectTint)
        .setAlpha(0.9)
        .setDepth(11);
      this.gates.push({
        id: gateDef.id,
        rect,
        visual,
        definition: gateDef,
        opened: false,
      });
    }

    // 6. Sellos mágicos (Seals)
    this.seals = this.level.seals.map((sealDefinition) => {
      const hitbox = this.add
        .rectangle(
          sealDefinition.x,
          sealDefinition.y,
          sealDefinition.width,
          sealDefinition.height,
        )
        .setOrigin(0, 0)
        .setVisible(false);
      this.physics.add.existing(hitbox, true);
      const visual = this.add
        .image(
          sealDefinition.x + sealDefinition.width / 2,
          sealDefinition.y + sealDefinition.height / 2,
          "ancient-trials-door",
        )
        .setDisplaySize(sealDefinition.width + 28, sealDefinition.height + 8)
        .setTint(0xbda2df)
        .setDepth(11);
      return { hitbox, visual };
    });

    // 7. Portal Meta (Goal)
    this.add
      .image(this.level.goal.x, this.level.goal.y + 12, "ancient-trials-door")
      .setDisplaySize(118, 162)
      .setTint(this.level.stageNumber >= 5 ? 0xffd778 : 0xa6ffe7)
      .setAlpha(0.84)
      .setDepth(8);
    this.goal = this.add
      .circle(this.level.goal.x, this.level.goal.y, 42, 0x66dbc0, 0.2)
      .setStrokeStyle(6, 0xa6ffe7, 0.9)
      .setDepth(8);
    this.physics.add.existing(this.goal, true);

    // Jaula metálica final que encierra y bloquea el acceso al portal
    const goalGateRect = this.add
      .rectangle(
        this.level.goal.x - 45,
        0,
        18,
        640,
      )
      .setOrigin(0, 0)
      .setVisible(false);
    this.physics.add.existing(goalGateRect, true);
    const goalGateVisual = this.add
      .image(this.level.goal.x - 36, 320, "ancient-trials-barrier")
      .setDisplaySize(38, 640)
      .setTint(this.visualPalette.objectTint)
      .setAlpha(0.94)
      .setDepth(12);
    this.goalGate = {
      rect: goalGateRect,
      visual: goalGateVisual,
      opened: false,
    };

    // 8. Texto de objetivo en pantalla
    this.objectiveText = this.add
      .text(640, 90, "Empuja la caja sobre la placa", {
        color: "#fff2c4",
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        stroke: "#111828",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);
    this.add
      .rectangle(640, 90, 610, 42, 0x08131d, 0.82)
      .setStrokeStyle(2, this.visualPalette.topEdge, 0.78)
      .setScrollFactor(0)
      .setDepth(39);

    this.createPlateKeyInterface();
  }

  private createPlateKeyInterface(): void {
    this.plateKeyPanel?.destroy(true);
    this.plateKeyIndicators = [];
    if (this.plates.length === 0) return;

    const spacing = 32;
    const panelWidth = 20 + (this.plates.length - 1) * spacing + 28;
    const panel = this.add
      .container(24, 138)
      .setScrollFactor(0)
      .setDepth(42);
    const background = this.add
      .rectangle(0, 0, panelWidth, 38, 0x07111d, 0.74)
      .setOrigin(0, 0)
      .setStrokeStyle(2, this.visualPalette.outline, 0.62);
    panel.add(background);

    this.plates.forEach((plate, index) => {
      const x = 20 + index * spacing;
      const glow = this.add
        .circle(x, 19, 15, 0x67e8ff, 0.16)
        .setBlendMode(Phaser.BlendModes.ADD);
      const icon = this.add.graphics({ x, y: 19 });
      panel.add([glow, icon]);
      this.plateKeyIndicators.push({
        plateId: plate.id,
        icon,
        glow,
        active: false,
      });
    });

    this.plateKeyPanel = panel;
    this.updatePlateKeyInterface(true);
  }

  private updatePlateKeyInterface(force = false): void {
    for (const indicator of this.plateKeyIndicators) {
      const active = this.activations.isActive(indicator.plateId);
      if (!force && active === indicator.active) continue;

      indicator.active = active;
      indicator.glow
        .setFillStyle(active ? 0x67e8ff : 0x4f5866, active ? 0.24 : 0.08)
        .setScale(active ? 1.1 : 0.92);
      this.drawPlateKeyIcon(indicator.icon, active);
    }
  }

  private drawPlateKeyIcon(graphics: Phaser.GameObjects.Graphics, active: boolean): void {
    const fill = active ? 0x6ee7ff : 0x6b7280;
    const stroke = active ? 0xd7fbff : 0x252b35;
    const alpha = active ? 1 : 0.68;

    graphics.clear();
    graphics.lineStyle(2, stroke, active ? 0.96 : 0.76);
    graphics.fillStyle(fill, alpha);
    graphics.fillCircle(-7, -1, 6);
    graphics.strokeCircle(-7, -1, 6);
    graphics.fillStyle(0x07111d, active ? 0.78 : 0.62);
    graphics.fillCircle(-7, -1, 2.3);
    graphics.fillStyle(fill, alpha);
    graphics.fillRect(-1, -3, 18, 6);
    graphics.strokeRect(-1, -3, 18, 6);
    graphics.fillRect(10, 2, 5, 7);
    graphics.fillRect(16, 2, 4, 5);
    graphics.lineStyle(1, active ? 0xffffff : 0x9ca3af, active ? 0.62 : 0.24);
    graphics.lineBetween(1, -1, 16, -1);
  }

  private createCollectibles(): void {
    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const spawn of this.level.coins) {
      this.coins.add(new Coin(this, spawn.x, spawn.y, spawn.itemId, spawn.value));
    }
    this.projectiles = this.physics.add.group({ allowGravity: false });

    const reward = this.level.inventoryReward;
    if (!this.save.claimedRewardBoxes.includes(reward.claimId)) {
      this.inventoryPickup = new Coin(this, reward.x, reward.y, reward.itemId);
    }
  }

  private createCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.crates, this.platforms);
    this.physics.add.collider(this.player, this.crates);
    this.physics.add.collider(this.crates, this.crates); // Apilamiento de cajas!

    // El proyectil desaparece al primer contacto. Los overlaps evitan que Arcade
    // separe los cuerpos, detenga el disparo o transfiera velocidad a las cajas.
    this.physics.add.overlap(this.projectiles, this.platforms, (first, second) => {
      this.handleProjectileImpact(first, second);
    });
    this.physics.add.overlap(this.projectiles, this.crates, (first, second) => {
      this.handleProjectileImpact(first, second);
    });

    for (const gateObj of this.gates) {
      this.physics.add.collider(this.player, gateObj.rect);
      this.physics.add.collider(this.crates, gateObj.rect);
      this.physics.add.overlap(this.projectiles, gateObj.rect, (first, second) => {
        this.handleProjectileImpact(first, second);
      });
    }

    this.physics.add.collider(this.player, this.goalGate.rect);
    this.physics.add.collider(this.crates, this.goalGate.rect);
    this.physics.add.overlap(this.projectiles, this.goalGate.rect, (first, second) => {
      this.handleProjectileImpact(first, second);
    });
    this.physics.add.overlap(this.projectiles, this.goal, (first, second) => {
      this.handleProjectileImpact(first, second);
    });

    for (const leverObj of this.levers) {
      this.physics.add.overlap(this.projectiles, leverObj.rect, (first, second) => {
        this.handleProjectileImpact(first, second, () => {
          if (!this.activations.isActive(leverObj.id)) this.activateLever(leverObj);
        });
      });
    }

    for (const seal of this.seals) {
      this.physics.add.collider(this.player, seal.hitbox);
      this.physics.add.overlap(this.projectiles, seal.hitbox, (first, second) => {
        this.handleProjectileImpact(first, second, () => this.breakSeal(seal));
      });
    }

    this.physics.add.overlap(this.player, this.coins, (_player, rawCoin) => {
      const coin = rawCoin as Coin;
      const previousGold = this.save.player.coins;
      this.inventory.collect(this.save.player, coin.itemId, coin.value);
      const amount = this.save.player.coins - previousGold;
      this.goldCollected += amount;
      this.announceAchievements(this.achievements.recordGoldCollected(this.save, amount));
      if (amount > 0) {
        this.createCoinGainEffect(coin.x, coin.y, amount);
      }
      coin.disableBody(true, true);
      this.playSfx("coin");
      gameSaveStore.save(this.save);
      this.emitHud();
    });

    if (this.inventoryPickup) {
      this.physics.add.overlap(this.player, this.inventoryPickup, () => this.collectInventoryReward());
    }

    for (const hazardDefinition of this.level.hazards) {
      const hazard = this.add
        .rectangle(
          hazardDefinition.x,
          hazardDefinition.y,
          hazardDefinition.width,
          hazardDefinition.height,
          0xa43a45,
        )
        .setOrigin(0, 0)
        .setDepth(9);
      this.physics.add.existing(hazard, true);
      hazard.setFillStyle(0x481522, 0.96).setStrokeStyle(2, 0xff6b61, 0.9);
      const hazardDetails = this.add.graphics().setDepth(9.2);
      hazardDetails.fillStyle(0xff7358, 0.88);
      const spikeWidth = 18;
      for (
        let spikeX = hazardDefinition.x + 2;
        spikeX < hazardDefinition.x + hazardDefinition.width - 4;
        spikeX += spikeWidth
      ) {
        hazardDetails.fillTriangle(
          spikeX,
          hazardDefinition.y + 4,
          spikeX + spikeWidth / 2,
          hazardDefinition.y - 12,
          spikeX + spikeWidth,
          hazardDefinition.y + 4,
        );
      }
      hazardDetails.fillStyle(0xffb36b, 0.48);
      hazardDetails.fillRect(
        hazardDefinition.x + 3,
        hazardDefinition.y + 8,
        Math.max(0, hazardDefinition.width - 6),
        4,
      );
      this.physics.add.overlap(this.player, hazard, () => this.damagePlayer(hazardDefinition.damage));
      this.physics.add.overlap(this.projectiles, hazard, (first, second) => {
        this.handleProjectileImpact(first, second);
      });
    }

    this.physics.add.overlap(this.player, this.goal, () => this.completeLevel());
  }

  private handleProjectileImpact(
    rawFirst: Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0],
    rawSecond: Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[1],
    applyImpact?: () => void,
  ): void {
    const first = this.getCollisionGameObject(rawFirst);
    const second = this.getCollisionGameObject(rawSecond);
    if (!first || !second) return;

    const impact = resolveProjectileImpact(
      first,
      second,
      (candidate): candidate is PowerProjectile => candidate instanceof PowerProjectile,
    );
    if (!impact?.projectile.consume()) return;

    applyImpact?.();
  }

  private getCollisionGameObject(
    candidate: Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0],
  ): Phaser.GameObjects.GameObject | undefined {
    if (candidate instanceof Phaser.Physics.Arcade.Body
      || candidate instanceof Phaser.Physics.Arcade.StaticBody) {
      return candidate.gameObject;
    }
    return candidate instanceof Phaser.GameObjects.GameObject ? candidate : undefined;
  }

  private handleActions(input: ReturnType<GameplayInputSystem["readFrame"]>): void {
    if (input.pauseJustPressed) {
      this.playSfx("ui-click");
      gameEvents.emit(EVENTS.SCREEN_CHANGED, "paused");
      this.scene.pause();
      return;
    }
    if (input.meleeJustPressed && this.player.canMelee(this.time.now)) {
      this.player.markAttacking(this.time.now);
      this.playSfx("sword-swing");
      this.tryActivateLever();
      this.tryBreakSealWithMelee();
    }
    if (input.spinJustPressed && this.player.canSpin(this.time.now)) {
      this.player.markSpinning(this.time.now);
      this.playSfx("sword-swing");
      for (const seal of [...this.seals]) {
        if (Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          seal.visual.x,
          seal.visual.y,
        ) < 145) {
          this.breakSeal(seal);
        }
      }
    }
    if (input.healJustPressed) this.useHealingPower();
    if (input.powerJustPressed) this.useLethalPower();
  }

  private activateLever(leverObj: {
    id: string;
    rect: Phaser.GameObjects.Rectangle;
    knob: Phaser.GameObjects.Arc;
    visual: Phaser.GameObjects.Image;
    definition: { id: string; x: number; y: number; rangedOnly?: boolean };
  }): void {
    if (this.activations.isActive(leverObj.id)) return;
    this.activations.setParticipantActive(leverObj.id, "player-1", true);
    leverObj.rect.setAngle(18).setFillStyle(0x3d765d);
    leverObj.visual.setAngle(18).setTint(0x9ff0c5);
    this.tweens.add({
      targets: leverObj.visual,
      scaleX: leverObj.visual.scaleX * 1.08,
      scaleY: leverObj.visual.scaleY * 1.08,
      yoyo: true,
      duration: 140,
    });
    this.playSfx("checkpoint");
    this.updateGates();
  }

  private tryActivateLever(): void {
    for (const leverObj of this.levers) {
      if (this.activations.isActive(leverObj.id)) continue;
      if (leverObj.definition.rangedOnly) continue;

      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        leverObj.rect.x,
        leverObj.rect.y - 30
      );

      if (dist <= 105) {
        this.activateLever(leverObj);
      }
    }
  }

  private tryBreakSealWithMelee(): void {
    const seal = this.seals.find((candidate) => Phaser.Geom.Intersects.RectangleToRectangle(
      this.player.getMeleeHitbox(),
      candidate.hitbox.getBounds(),
    ));
    if (seal) this.breakSeal(seal);
  }

  private breakSeal(seal: (typeof this.seals)[number]): void {
    if (!this.seals.includes(seal)) return;
    this.seals = this.seals.filter((candidate) => candidate !== seal);
    (seal.hitbox.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.tweens.add({
      targets: [seal.visual, seal.hitbox],
      alpha: 0,
      scale: 1.5,
      duration: 260,
      onComplete: () => {
        seal.visual.destroy();
        seal.hitbox.destroy();
      },
    });
    this.playSfx("enemy-defeat");
    if (this.seals.length === 0 && this.activations.isComplete()) {
      this.goal.setFillStyle(0x66dbc0, 0.34);
      // Trigger gate opening check after last seal is removed
      this.updateGates();
    }
  }

  private updatePlateStates(): void {
    let stateChanged = false;
    for (const plateObj of this.plates) {
      const plateBounds = new Phaser.Geom.Rectangle(
        plateObj.definition.x - plateObj.definition.width / 2,
        plateObj.definition.y - 22,
        plateObj.definition.width,
        30,
      );

      let active = false;
      for (const crate of this.crates) {
        if (Phaser.Geom.Intersects.RectangleToRectangle(crate.getBounds(), plateBounds)) {
          active = true;
          break;
        }
      }

      const changed = this.activations.setParticipantActive(plateObj.id, "crate-system", active);
      if (changed) {
        stateChanged = true;
        plateObj.rect.setFillStyle(active ? 0x3f8d6e : this.visualPalette.lowerFace);
        plateObj.visual.setTint(active ? 0x9ff0c5 : this.visualPalette.objectTint);
        plateObj.visual.setScale(
          plateObj.visual.scaleX,
          active ? plateObj.visual.scaleY * 0.78 : plateObj.visual.scaleY / 0.78,
        );
        if (active) this.playSfx("checkpoint");
      }
    }

    if (stateChanged) {
      this.updatePlateKeyInterface();
      this.updateGates();
    }
  }

  private updateGates(): void {
    for (const gateObj of this.gates) {
      if (gateObj.opened) continue;

      const reqs = gateObj.definition.requiredActivations ?? [];
      if (reqs.length === 0) continue;

      const allMet = reqs.every((actId: string) => this.activations.isActive(actId));
      if (allMet) {
        gateObj.opened = true;
        (gateObj.rect.body as Phaser.Physics.Arcade.StaticBody).enable = false;
        this.tweens.add({
          targets: gateObj.visual,
          y: gateObj.visual.y - gateObj.definition.height,
          alpha: 0.12,
          duration: 720,
        });
        this.tweens.add({
          targets: gateObj.rect,
          y: gateObj.rect.y - gateObj.definition.height,
          alpha: 0.06,
          duration: 720,
        });
        this.playSfx("progress");
      }
    }

    const portalReady = this.activations.isComplete() && this.seals.length === 0;
    this.goal.setFillStyle(0x66dbc0, portalReady ? 0.34 : 0.12);

    if (portalReady && !this.goalGate.opened) {
      this.goalGate.opened = true;
      (this.goalGate.rect.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      this.tweens.add({
        targets: this.goalGate.visual,
        y: this.goalGate.visual.y - 640,
        alpha: 0.12,
        duration: 850,
      });
      this.tweens.add({
        targets: this.goalGate.rect,
        y: this.goalGate.rect.y - 640,
        alpha: 0.06,
        duration: 850,
      });
      this.playSfx("progress");
    }
  }

  private updateObjectiveText(): void {
    if (!this.objectiveText) return;

    // Verificar si alguna de las cajas está en alguna zona de salto (para los marcadores visuales)
    let boxInAnyJumpZone = false;
    const zones = this.level.boxJumpZones ?? (this.level.boxJumpZone ? [this.level.boxJumpZone] : []);
    for (const zone of zones) {
      for (const crate of this.crates) {
        if (Math.abs(crate.x - zone.x) <= zone.width / 2) {
          boxInAnyJumpZone = true;
          break;
        }
      }
    }

    // Configurar la opacidad de los marcadores de salto
    this.boxJumpMarkers.forEach((marker) => {
      marker.setAlpha(this.activations.isComplete() ? 0.04 : boxInAnyJumpZone ? 0.42 : 0.18);
    });

    // Texto dinámico inteligente basado en activaciones pendientes
    const pendingActivations = this.level.requiredActivations.filter(
      (actId) => !this.activations.isActive(actId)
    );

    let nextText: string;
    if (pendingActivations.length > 0) {
      const nextAct = pendingActivations[0];
      if (nextAct.includes("lever")) {
        const pendingLever = this.levers.find((lever) => lever.id === nextAct);
        nextText = pendingLever?.definition.hint
          ?? (pendingLever?.definition.rangedOnly
            ? "Sube los escalones, dejate caer y dispara a la palanca"
            : (
              boxInAnyJumpZone
                ? "Sube a la caja, salta y golpea la palanca"
                : "Mueve la caja cerca de la cornisa para alcanzar la palanca"
            ));
      } else if (nextAct.includes("plate")) {
        const pendingPlate = this.plates.find((plate) => plate.id === nextAct);
        nextText = pendingPlate?.definition.hint
          ?? "Empuja una caja sobre la placa de presion para abrir la puerta";
      } else {
        nextText = `Resuelve el siguiente paso: activa ${nextAct}`;
      }
    } else if (this.seals.length > 0) {
      nextText = `Rompe ${this.seals.length === 1 ? "el ultimo sello" : `los ${this.seals.length} sellos`} con tus poderes`;
    } else {
      nextText = "Alcanza el portal antes de que acabe el tiempo";
    }

    this.objectiveText.setText(nextText);
  }

  private useHealingPower(): void {
    const charges = this.save.characterPowerCharges[this.save.selectedCharacterId];
    if (charges.healingCharges <= 0 || this.save.player.health >= this.save.player.maxHealth) return;
    charges.healingCharges -= 1;
    this.save.player.health = this.save.player.maxHealth;
    this.playSfx("heal");
    gameSaveStore.save(this.save);
    this.emitHud();
  }

  private useLethalPower(): void {
    const charges = this.save.characterPowerCharges[this.save.selectedCharacterId];
    if (charges.powerCharges <= 0 || !this.player.canUsePower(this.time.now)) return;
    charges.powerCharges -= 1;
    this.player.markUsingPower(this.time.now);
    // El proyectil emerge por delante del jugador (no en su centro) para que su
    // cuerpo de 34px no se solape con una pared pegada a la espalda y se consuma
    // al instante: disparar junto a un muro debe lanzar el tiro igualmente.
    const direction = this.player.facing;
    const projectile = new PowerProjectile(
      this,
      this.player.x + 34 * direction,
      this.player.y - 12,
      direction,
    );
    this.projectiles.add(projectile);
    projectile.launch();
    this.playSfx("lethal-power");
    gameSaveStore.save(this.save);
    this.emitHud();
  }

  private collectInventoryReward(): void {
    const reward = this.level.inventoryReward;
    if (!this.inventoryPickup || this.save.claimedRewardBoxes.includes(reward.claimId)) return;
    this.inventory.collect(this.save.player, reward.itemId);
    this.save.claimedRewardBoxes.push(reward.claimId);
    this.announceAchievements(this.achievements.recordRewardBoxOpened(this.save));
    this.inventoryPickup.disableBody(true, true);
    this.playSfx("pickup");
    gameSaveStore.save(this.save);
  }

  private damagePlayer(amount: number): void {
    if (this.time.now < this.damageCooldownUntil) return;
    const previousHealth = this.save.player.health;
    const defeated = this.player.takeDamage(amount);
    if (this.save.player.health === previousHealth) return;
    this.damageCooldownUntil = this.time.now + 900;
    this.playSfx("player-hit");
    gameEvents.emit(EVENTS.PLAYER_DAMAGED, { amount: previousHealth - this.save.player.health });
    gameSaveStore.save(this.save);
    this.emitHud();
    if (defeated) this.finishWithDefeat();
  }

  private completeLevel(): void {
    if (
      this.levelFinished
      || !this.activations.isComplete()
      || this.seals.length > 0
    ) return;
    this.levelFinished = true;
    const isNewCompletion = !this.save.completedLevels.includes(this.level.id);
    if (isNewCompletion) this.save.completedLevels.push(this.level.id);
    if (this.level.nextLevelId && !this.save.unlockedLevels.includes(this.level.nextLevelId)) {
      this.save.unlockedLevels.push(this.level.nextLevelId);
    }
    this.progression.addExperience(this.save, this.level.experienceReward);
    this.announceAchievements(this.achievements.recordPuzzleCompleted(this.save));
    this.recordRunStatistics("completed");
    gameSaveStore.save(this.save);
    this.playSfx("level-complete");
    gameEvents.emit(EVENTS.LEVEL_COMPLETED, {
      levelId: this.level.id,
      levelName: this.level.name,
      stageNumber: this.level.stageNumber,
      theme: "ancient-trials",
      monstersDefeated: 0,
      gameplayDurationSeconds: this.runTracker.durationSeconds,
      goldCollected: this.goldCollected,
      actionsPerMinute: this.runTracker.actionsPerMinute,
      achievementIds: [...this.unlockedAchievements],
      nextLevelId: this.level.nextLevelId,
      nextLevelName: this.level.nextLevelId
        ? puzzleLevelDefinitions[this.level.nextLevelId]?.name
        : undefined,
      nextStageNumber: this.level.nextLevelId
        ? puzzleLevelDefinitions[this.level.nextLevelId]?.stageNumber
        : undefined,
    });
    this.physics.pause();
    this.emitHud();
    gameEvents.emit(EVENTS.SCREEN_CHANGED, "level-transition");
  }

  private finishWithDefeat(): void {
    if (this.levelFinished) return;
    this.levelFinished = true;
    this.recordRunStatistics("defeat");
    this.player.markDefeated();
    gameSaveStore.save(this.save);
    this.physics.pause();
    this.playSfx("game-over");
    gameEvents.emit(EVENTS.SCREEN_CHANGED, "game-over");
  }

  private recordRunStatistics(result: RunResult): void {
    this.runTracker.record(this.save.statistics, result);
  }

  private announceAchievements(ids: AchievementId[]): void {
    for (const id of ids) {
      if (!this.unlockedAchievements.includes(id)) this.unlockedAchievements.push(id);
      const achievement = getAchievementDefinition(id);
      if (!achievement) continue;
      gameEvents.emit(EVENTS.ACHIEVEMENT_UNLOCKED, {
        id,
        title: achievement.title,
        icon: achievement.icon,
        reward: achievement.reward,
      });
    }
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

  private emitHud(): void {
    const charges = this.save.characterPowerCharges[this.save.selectedCharacterId];
    this.lastHudSecond = Math.ceil(this.remainingTimeMs / 1000);
    this.lastSpinHudStep = Math.ceil(this.player.getSpinCooldownRemaining(this.time.now) / 100);
    const hud: HudState = {
      ...this.save.player,
      ...charges,
      stageNumber: this.level.stageNumber,
      timeRemaining: this.lastHudSecond,
      timeLimit: this.level.timeLimitSeconds,
      progressPercent: Phaser.Math.Clamp((this.player.x / this.level.worldWidth) * 100, 0, 100),
      spinCooldownRemainingMs: this.player.getSpinCooldownRemaining(this.time.now),
    };
    gameEvents.emit(EVENTS.HUD_UPDATED, hud);
  }

  private bindSceneEvents(): void {
    this.unbindResume = gameEvents.on(EVENTS.RESUME_GAME, () => {
      if (!this.scene.isPaused()) return;
      this.save = gameSaveStore.load();
      this.scene.resume();
      gameEvents.emit(EVENTS.SCREEN_CHANGED, "playing");
      this.emitHud();
    });
    this.unbindPowerShop = gameEvents.on(EVENTS.PAUSE_FOR_POWER_SHOP, () => {
      if (this.levelFinished || this.scene.isPaused()) return;
      gameEvents.emit(EVENTS.SCREEN_CHANGED, "power-shop");
      this.scene.pause();
    });
    this.unbindRestart = gameEvents.on(EVENTS.RESTART_GAME, ({ levelId }) => {
      if (!this.levelFinished) {
        this.recordRunStatistics("abandoned");
        gameSaveStore.save(this.save);
      }
      const nextId = puzzleLevelDefinitions[levelId] ? levelId : this.level.id;
      this.scene.start("PuzzleScene", { levelId: nextId });
    });
    this.unbindContinue = gameEvents.on(EVENTS.CONTINUE_LEVEL, ({ completedLevelId, nextLevelId }) => {
      if (!this.levelFinished || completedLevelId !== this.level.id) return;
      if (nextLevelId && puzzleLevelDefinitions[nextLevelId]) {
        this.scene.start("PuzzleScene", { levelId: nextLevelId });
        return;
      }
      this.scene.start("MainMenuScene");
    });
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

  private playSfx(cue: SfxCue): void {
    gameEvents.emit(EVENTS.SFX_REQUESTED, { cue });
  }

  private updateCrateSolidity(): void {
    // Causa del bug de "atravesar la caja de arriba": las cajas son cuerpos
    // empujables (necesario para los puzzles). Cuando el jugador —tambien
    // empujable— cae sobre una caja, Arcade reparte la velocidad entre ambos y
    // el jugador conserva parte de su caida, hundiendose a traves de la caja de
    // arriba hasta la de abajo (que si tiene el piso rigido como tope). Sobre
    // una sola caja no se nota porque el piso inmovil la frena en seco.
    //
    // Solucion: mientras el jugador esta encima de una caja, esa caja deja de
    // ser empujable y actua como solida, asi el jugador aterriza sobre ella.
    // Al costado sigue siendo empujable para poder resolver los puzzles.
    const player = this.player.body as Phaser.Physics.Arcade.Body;
    for (const crate of this.crates) {
      const body = crate.body as Phaser.Physics.Arcade.Body;
      body.pushable = !shouldCrateStaySolid(
        {
          left: player.left,
          right: player.right,
          centerY: player.center.y,
          velocityY: player.velocity.y,
        },
        { left: body.left, right: body.right, top: body.top },
      );
    }
  }

  private handleStackedCratesPhysics(): void {
    for (let i = 0; i < this.crates.length; i++) {
      const crateA = this.crates[i];
      const bodyA = crateA.body as Phaser.Physics.Arcade.Body;

      for (let j = 0; j < this.crates.length; j++) {
        if (i === j) continue;
        const crateB = this.crates[j];
        const bodyB = crateB.body as Phaser.Physics.Arcade.Body;

        // Verificar si crateA está directamente encima de crateB
        const yDiff = bodyB.y - bodyA.y;
        const xDiff = Math.abs(crateA.x - crateB.x);

        // Si están apiladas (diferencia de y cercana al alto de la caja: 70px)
        // y se solapan horizontalmente
        if (yDiff >= 68 && yDiff <= 72 && xDiff < 35) {
          // Si la de abajo se está moviendo horizontalmente
          if (Math.abs(bodyB.velocity.x) > 0) {
            const speed = Math.abs(bodyB.velocity.x);
            if (speed < 110) {
              // Empuje suave: la de arriba se mueve solidaria sin resbalar
              bodyA.velocity.x = bodyB.velocity.x;
            } else {
              // Empuje brusco o carrera: la de arriba desliza por inercia y se cae
              bodyA.velocity.x = bodyB.velocity.x * 0.65;
            }
          }
        }
      }
    }
  }
}
