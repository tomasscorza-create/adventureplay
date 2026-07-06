import Phaser from "phaser";
import { EVENTS } from "../../shared/constants/events";
import { GAME_HEIGHT } from "../../shared/constants/game";
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
import { PuzzleActivationSystem } from "../systems/puzzles/PuzzleActivationSystem";
import { gameSaveStore } from "../systems/save/GameSaveStore";
import { LevelRunTracker, type RunResult } from "./level/LevelRunTracker";

export class PuzzleScene extends Phaser.Scene {
  private level!: PuzzleLevelDefinition;
  private save!: SaveData;
  private player!: Player;
  private crate!: Phaser.GameObjects.Rectangle;
  private plate!: Phaser.GameObjects.Rectangle;
  private boxJumpMarker!: Phaser.GameObjects.Rectangle;
  private lever!: Phaser.GameObjects.Rectangle;
  private gate!: Phaser.GameObjects.Rectangle;
  private seals: Phaser.GameObjects.Rectangle[] = [];
  private goal!: Phaser.GameObjects.Arc;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private inventoryPickup?: Coin;
  private inputSystem!: GameplayInputSystem;
  private remainingTimeMs = 0;
  private levelFinished = false;
  private gateOpened = false;
  private goldCollected = 0;
  private lastHudSecond = -1;
  private lastSpinHudStep = -1;
  private unlockedAchievements: AchievementId[] = [];
  private damageCooldownUntil = 0;
  private objectiveText?: Phaser.GameObjects.Text;
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
    this.gateOpened = false;
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
    this.updatePlateState();
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
    this.add.rectangle(this.level.worldWidth / 2, 360, this.level.worldWidth, 720, 0x111828);
    for (let x = 100; x < this.level.worldWidth; x += 220) {
      this.add.circle(x, 135 + (x % 3) * 35, 34, 0x5aa7a1, 0.08).setDepth(1);
      this.add.rectangle(x, 360, 8, 560, 0x9b7b49, 0.16).setDepth(1);
    }

    this.platforms = this.physics.add.staticGroup();
    for (const platform of this.level.platforms) {
      const block = this.add
        .rectangle(platform.x, platform.y, platform.width, platform.height, 0x394752)
        .setOrigin(0, 0)
        .setStrokeStyle(3, 0xb89a62, 0.7)
        .setDepth(6);
      this.physics.add.existing(block, true);
      this.platforms.add(block);
    }

    this.cameras.main.setBounds(0, 0, this.level.worldWidth, GAME_HEIGHT);
    this.unbindCameraZoom = this.cameraSystem.bindResponsiveZoom(this, this.level.worldWidth);
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
    this.crate = this.add
      .rectangle(this.level.crate.x, this.level.crate.y, 70, 70, 0x8b643f)
      .setStrokeStyle(5, 0xd5b477)
      .setDepth(10);
    this.physics.add.existing(this.crate);
    const crateBody = this.crate.body as Phaser.Physics.Arcade.Body;
    crateBody.setCollideWorldBounds(true).setDragX(520).setMaxVelocity(180, 700);

    this.plate = this.add
      .rectangle(this.level.plate.x, this.level.plate.y, this.level.plate.width, 15, 0x8f6f46)
      .setOrigin(0.5, 1)
      .setStrokeStyle(2, 0xf2c45f)
      .setDepth(8);

    this.boxJumpMarker = this.add
      .rectangle(
        this.level.boxJumpZone.x,
        this.level.boxJumpZone.y,
        this.level.boxJumpZone.width,
        12,
        0x66dbc0,
        0.16,
      )
      .setOrigin(0.5, 1)
      .setStrokeStyle(2, 0x66dbc0, 0.72)
      .setDepth(7);

    this.lever = this.add
      .rectangle(this.level.lever.x, this.level.lever.y, 18, 66, 0x80633d)
      .setOrigin(0.5, 1)
      .setStrokeStyle(3, 0xd8bd7c)
      .setDepth(9);
    this.add.circle(this.level.lever.x, this.level.lever.y - 63, 12, 0xc85d4d).setDepth(10);

    this.gate = this.add
      .rectangle(
        this.level.gate.x,
        this.level.gate.y,
        this.level.gate.width,
        this.level.gate.height,
        0x283840,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(4, 0x71c7b8)
      .setDepth(11);
    this.physics.add.existing(this.gate, true);

    this.seals = this.level.seals.map((sealDefinition) => {
      const seal = this.add
        .rectangle(
          sealDefinition.x,
          sealDefinition.y,
          sealDefinition.width,
          sealDefinition.height,
          0x4a3158,
        )
        .setOrigin(0, 0)
        .setStrokeStyle(4, 0xd78ce8)
        .setDepth(11);
      this.physics.add.existing(seal, true);
      return seal;
    });

    this.goal = this.add
      .circle(this.level.goal.x, this.level.goal.y, 42, 0x66dbc0, 0.2)
      .setStrokeStyle(6, 0xa6ffe7, 0.9)
      .setDepth(8);
    this.physics.add.existing(this.goal, true);

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
    this.physics.add.collider(this.crate, this.platforms);
    this.physics.add.collider(this.player, this.crate);
    this.physics.add.collider(this.player, this.gate);
    this.physics.add.collider(this.crate, this.gate);
    this.physics.add.collider(this.projectiles, this.gate, (projectile) => {
      (projectile as Phaser.GameObjects.GameObject).destroy();
    });
    for (const seal of this.seals) this.physics.add.collider(this.player, seal);

    this.physics.add.overlap(this.player, this.coins, (_player, rawCoin) => {
      const coin = rawCoin as Coin;
      const previousGold = this.save.player.coins;
      this.inventory.collect(this.save.player, coin.itemId, coin.value);
      const amount = this.save.player.coins - previousGold;
      this.goldCollected += amount;
      this.announceAchievements(this.achievements.recordGoldCollected(this.save, amount));
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
      this.physics.add.overlap(this.player, hazard, () => this.damagePlayer(hazardDefinition.damage));
    }
    this.physics.add.overlap(this.player, this.goal, () => this.completeLevel());
    for (const seal of this.seals) {
      this.physics.add.overlap(this.projectiles, seal, (projectile) => {
        (projectile as Phaser.GameObjects.GameObject).destroy();
        this.breakSeal(seal);
      });
    }
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
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, seal.x, seal.y) < 145) {
          this.breakSeal(seal);
        }
      }
    }
    if (input.healJustPressed) this.useHealingPower();
    if (input.powerJustPressed) this.useLethalPower();
  }

  private tryActivateLever(): void {
    if (this.activations.isActive("upper-lever") || Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.lever.x,
      this.lever.y,
    ) > 105) return;

    this.activations.setParticipantActive("upper-lever", "player-1", true);
    this.lever.setAngle(42).setFillStyle(0x4f8f67);
    this.playSfx("checkpoint");
    this.tryOpenGate();
  }

  private tryBreakSealWithMelee(): void {
    const seal = this.seals.find((candidate) => Phaser.Geom.Intersects.RectangleToRectangle(
      this.player.getMeleeHitbox(),
      candidate.getBounds(),
    ));
    if (seal) this.breakSeal(seal);
  }

  private breakSeal(seal: Phaser.GameObjects.Rectangle): void {
    if (!this.seals.includes(seal)) return;
    this.seals = this.seals.filter((candidate) => candidate !== seal);
    (seal.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.tweens.add({
      targets: seal,
      alpha: 0,
      scale: 1.5,
      duration: 260,
      onComplete: () => seal.destroy(),
    });
    this.playSfx("enemy-defeat");
    if (this.seals.length === 0 && this.activations.isActive("crate-plate")) {
      this.goal.setFillStyle(0x66dbc0, 0.34);
    }
  }

  private updatePlateState(): void {
    const plateBounds = new Phaser.Geom.Rectangle(
      this.level.plate.x - this.level.plate.width / 2,
      this.level.plate.y - 22,
      this.level.plate.width,
      30,
    );
    const active = Phaser.Geom.Intersects.RectangleToRectangle(this.crate.getBounds(), plateBounds);
    if (!this.activations.setParticipantActive("crate-plate", "crate", active)) return;
    this.plate.setFillStyle(active ? 0x56b890 : 0x8f6f46);
    this.goal.setFillStyle(0x66dbc0, active && this.seals.length === 0 ? 0.34 : 0.12);
    if (active) this.playSfx("checkpoint");
    this.tryOpenGate();
  }

  private tryOpenGate(): void {
    if (this.gateOpened || !this.activations.isActive("upper-lever")) return;
    this.gateOpened = true;
    (this.gate.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.tweens.add({
      targets: this.gate,
      y: this.gate.y - this.level.gate.height,
      alpha: 0.12,
      duration: 720,
    });
    this.playSfx("progress");
  }

  private updateObjectiveText(): void {
    if (!this.objectiveText) return;
    const boxIsAtJumpZone = Math.abs(this.crate.x - this.level.boxJumpZone.x)
      <= this.level.boxJumpZone.width / 2;
    const nextText = !this.activations.isActive("upper-lever")
      ? boxIsAtJumpZone
        ? "Sube a la caja, salta a la cornisa y golpea la palanca"
        : "Mueve la caja hasta el marcador bajo la cornisa"
      : !this.activations.isActive("crate-plate")
        ? "Puerta abierta: empuja la caja hasta la placa del otro lado"
        : this.seals.length > 0
          ? `Rompe ${this.seals.length === 1 ? "el ultimo sello" : `los ${this.seals.length} sellos`} con tus poderes`
          : "Alcanza el portal antes de que acabe el tiempo";
    this.objectiveText.setText(nextText);
    this.boxJumpMarker.setAlpha(this.activations.isActive("upper-lever") ? 0.04 : boxIsAtJumpZone ? 0.42 : 0.18);
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
    this.projectiles.add(new PowerProjectile(this, this.player.x, this.player.y - 12, this.player.facing));
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
      || !this.gateOpened
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
}
