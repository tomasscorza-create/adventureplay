import Phaser from "phaser";
import { EVENTS } from "../../shared/constants/events";
import { GAME_HEIGHT, GAME_WIDTH } from "../../shared/constants/game";
import type {
  AchievementId,
  CharacterId,
  HudState,
  PlayerStats,
  SaveData,
} from "../../shared/types/game";
import type { GameplayInputFrame } from "../../shared/types/input";
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
import { BaseEnemy } from "../entities/enemies/BaseEnemy";
import { BasicEnemy } from "../entities/enemies/BasicEnemy";
import { M1Enemy } from "../entities/enemies/M1Enemy";
import { CombatSystem } from "../systems/combat/CombatSystem";
import { getEnemyDefeatPalette } from "./level/enemyDefeatPalette";
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
import { coopSession } from "../systems/net/CoopSession";
import type { CoopSessionInfo } from "../events/EventBus";
import { CoopSceneLink } from "../systems/net/CoopSceneLink";
import { CoopProjectilePuppets } from "../systems/net/CoopProjectilePuppets";
import { applyNetPlayer, toNetPlayer } from "../systems/net/coopPlayerNet";
import type { CoopStartPlayer, NetProjectile, WorldSnapshot } from "../systems/net/coopMessages";
import {
  interpolateIndexedPositions,
  interpolatePlayer,
  interpolatePositionTuples,
  interpolateProjectiles,
  type SnapshotRenderFrame,
} from "../systems/net/CoopSnapshotInterpolator";
import { GuestCoopController } from "../systems/net/GuestCoopController";
import { getCoopSpawnX } from "../systems/net/coopSpawnLayout";

export class PuzzleScene extends Phaser.Scene {
  private readonly _id = "PuzzleScene";
  private readonly combat = new CombatSystem();
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
    sparkles?: Phaser.GameObjects.Image[];
    definition: { id: string; x: number; y: number; width: number; height: number; requiredActivations?: string[] };
    opened: boolean;
  }> = [];
  private goal!: Phaser.GameObjects.Arc;
  private goalGate!: {
    rect: Phaser.GameObjects.Rectangle;
    visual: Phaser.GameObjects.Image;
    sparkles?: Phaser.GameObjects.Image[];
    opened: boolean;
  };
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.GameObjects.Group;
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
  private readonly guestPredictionMovement = new MovementSystem();
  private guestCoopController?: GuestCoopController<WorldSnapshot>;
  private guestInterpolatedSnapshot?: WorldSnapshot;
  private readonly guestInterpolatedPlayers: WorldSnapshot["players"] = [];
  private readonly guestInterpolatedCrates: NonNullable<WorldSnapshot["crates"]> = [];
  private readonly guestInterpolatedEnemies: NonNullable<WorldSnapshot["enemies"]> = [];
  private readonly guestInterpolatedProjectiles: WorldSnapshot["projectiles"] = [];
  private readonly inventory = new InventorySystem();
  private readonly progression = new ProgressionSystem();
  private readonly achievements = new AchievementSystem();
  private readonly cameraSystem = new CameraSystem();
  private readonly runTracker = new LevelRunTracker();
  private readonly activations = new PuzzleActivationSystem();
  private seals: Array<{
    hitbox: Phaser.GameObjects.Rectangle;
    visual: Phaser.GameObjects.Image;
    index: number;
  }> = [];
  // --- Estado de co-op online (activo solo cuando llega `coop` en create) ---
  // El plumbing de red (seq, throttling, flancos, fin de sesion) vive en
  // CoopSceneLink; la escena solo conserva el estado jugable del slot B.
  private coop?: CoopSessionInfo;
  private coopLink?: CoopSceneLink<WorldSnapshot>;
  private isHost = false;
  private isGuest = false;
  // Slot del jugador local en el modelo de red (0 = host, 1..N = guests).
  private coopSelfSlot = 0;
  // Jugadores co-op en los slots 1..N-1 (el slot 0 es siempre `this.player`).
  // Los arreglos hermanos estan alineados por indice = slot - 1.
  private remotePlayers: Player[] = [];
  private remoteMovement: MovementSystem[] = [];
  // Host: cargas vivas de cada guest (sembradas desde el save del host).
  private remoteCharges: Array<{ healingCharges: number; powerCharges: number }> = [];
  private remoteDamageCooldownUntil: number[] = [];
  private guestPrevSelfHealth = Number.POSITIVE_INFINITY;
  private projectilePuppets?: CoopProjectilePuppets;
  private nextProjectileNetId = 1;
  // Al encadenar el siguiente nivel co-op, el SHUTDOWN no debe cerrar la sala.
  private keepCoopSessionOnShutdown = false;
  // Firma del ultimo HUD emitido por el guest (evita emitir a 60 Hz).
  private lastGuestHudKey = "";

  constructor() {
    super("PuzzleScene");
  }

  create(data: { levelId?: string; coop?: CoopSessionInfo }): void {
    this.guestPredictionMovement.reset();
    this.guestInterpolatedSnapshot = undefined;
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

    // Modo co-op: solo se activa cuando la sesion sigue viva. Si perdimos la
    // conexion (por ejemplo el peer cerro), degradamos a un jugador.
    this.coop = data.coop && coopSession.isActive ? data.coop : undefined;
    this.coopLink = this.coop ? new CoopSceneLink<WorldSnapshot>(this.coop) : undefined;
    this.isHost = this.coop?.role === "host";
    this.isGuest = this.coop?.role === "guest";
    this.coopSelfSlot = this.coop?.localSlot ?? 0;
    this.guestCoopController = this.isGuest && this.coopLink
      ? new GuestCoopController(this.coopLink)
      : undefined;
    this.remotePlayers = [];
    this.remoteMovement = [];
    this.remoteCharges = [];
    this.remoteDamageCooldownUntil = [];
    this.guestPrevSelfHealth = Number.POSITIVE_INFINITY;
    this.projectilePuppets = this.isGuest
      ? new CoopProjectilePuppets(this, () => this.playSfx("lethal-power"))
      : undefined;
    this.nextProjectileNetId = 1;
    this.keepCoopSessionOnShutdown = false;
    this.lastGuestHudKey = "";

    gameEvents.emit(EVENTS.ACTIVE_LEVEL_CHANGED, { levelId: this.level.id });
    this.inputSystem = new GameplayInputSystem(this);
    this.createWorld();
    this.createPlayer();
    this.createPuzzleObjects();
    this.createCollectibles();
    this.createCollisions();
    this.bindSceneEvents();
    if (this.coop) this.bindCoopNet();
    this.scene.launch("UIScene");
    gameEvents.emit(EVENTS.SCREEN_CHANGED, "playing");
    this.emitHud();
  }

  update(time: number, delta: number): void {
    if (this.levelFinished) return;

    // El guest no simula: envia su input y renderiza los snapshots del host.
    if (this.isGuest) {
      this.updateGuest(time, delta);
      return;
    }

    this.runTracker.advance(delta);
    this.remainingTimeMs = Math.max(0, this.remainingTimeMs - delta);
    if (this.remainingTimeMs <= 0) {
      this.finishWithDefeat();
      return;
    }

    const input = this.inputSystem.readFrame();
    this.runTracker.trackInput(input);
    if (input.pauseJustPressed) {
      this.handlePausePressed();
      return;
    }
    const jumped = this.movement.update(this.player, input, delta);
    if (jumped) this.playSfx("jump");
    this.handleActionsFor(this.player, input, 0);

    if (this.isHost && this.coopLink) {
      // El host simula cada guest (slots 1..N) desde su input remoto por slot.
      // Los que abandonaron quedan inactivos: no se simulan ni actuan.
      this.remotePlayers.forEach((player, index) => {
        if (!player.active) return;
        const slot = index + 1;
        const remoteFrame = this.coopLink!.consumeRemoteInputFrame(slot);
        const jumpedRemote = this.remoteMovement[index].update(player, remoteFrame, delta);
        if (jumpedRemote) this.playSfx("jump");
        this.handleActionsFor(player, remoteFrame, slot);
      });
    }

    this.updateCrateSolidity();
    this.handleStackedCratesPhysics();
    this.updatePlateStates();
    this.updateObjectiveText();

    if (this.enemies) {
      this.enemies.children.each((enemy) => {
        (enemy as BaseEnemy).update(this.nearestPlayerTo(enemy as BaseEnemy));
        return true;
      });
    }


    if (this.isHost && this.remotePlayers.length > 0) {
      this.coopLink?.maybeSendSnapshot(time, (seq) => this.buildSnapshot(seq));
    }

    const hudSecond = Math.ceil(this.remainingTimeMs / 1000);
    const spinStep = Math.ceil(this.player.getSpinCooldownRemaining(this.time.now) / 100);
    if (hudSecond !== this.lastHudSecond || spinStep !== this.lastSpinHudStep) {
      this.emitHud();
    }
  }

  private handlePausePressed(): void {
    this.playSfx("ui-click");
    if (this.coop) {
      // Pausar desincronizaria la sesion: en co-op la partida sigue corriendo
      // detras de una confirmacion React para salir ("coop-exit-confirm").
      gameEvents.emit(EVENTS.SCREEN_CHANGED, "coop-exit-confirm");
      return;
    }
    gameEvents.emit(EVENTS.SCREEN_CHANGED, "paused");
    this.scene.pause();
  }

  private nearestPlayerTo(target: BaseEnemy): Player {
    let nearest = this.player;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const player of this.allPlayers()) {
      const dist = Phaser.Math.Distance.Between(target.x, target.y, player.x, player.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = player;
      }
    }
    return nearest;
  }

  private createWorld(): void {
    this.cameras.main.setBackgroundColor("#111828");
    this.physics.world.setBounds(0, 0, this.level.worldWidth, GAME_HEIGHT);
    const backdrop = this.add
      .image(0, 0, this.level.visualTheme.backgroundTextureKey)
      .setOrigin(0)
      .setDepth(-40);
      
    let backdropScale = Math.max(GAME_WIDTH / backdrop.width, GAME_HEIGHT / backdrop.height);
    let scrollFactorX = 0;
    let posX = (GAME_WIDTH - (backdrop.width * backdropScale)) / 2;
    const posY = (GAME_HEIGHT - (backdrop.height * backdropScale)) / 2;

    if (this.level.id === "trialChamber13") {
      backdropScale *= 1.2; // Forza un 20% extra de ancho respecto a la pantalla
      const maxCameraScrollX = this.level.worldWidth - GAME_WIDTH;
      const extraBackgroundWidth = (backdrop.width * backdropScale) - GAME_WIDTH;
      
      if (maxCameraScrollX > 0 && extraBackgroundWidth > 0) {
        scrollFactorX = extraBackgroundWidth / maxCameraScrollX;
      }
      posX = 0; // Alineado al margen izquierdo
    }

    backdrop
      .setScale(backdropScale)
      .setPosition(posX, posY)
      .setScrollFactor(scrollFactorX, 0);
    this.visualPalette = derivePuzzleVisualPalette(
      this.sampleBackdropColor(this.level.visualTheme.backgroundTextureKey),
    );
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07101c, this.level.visualTheme.shadeAlpha)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-39);

    this.createAmbientParticles();

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

  private createAmbientParticles(): void {
    if (!this.textures.exists("ambient-sparkle")) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(3, 3, 3);
      g.generateTexture("ambient-sparkle", 6, 6);
      g.clear();
      g.fillStyle(0xa5d29a, 1);
      g.fillPoints([{x: 0, y: 2}, {x: 3, y: 0}, {x: 6, y: 2}, {x: 3, y: 6}], true, true);
      g.generateTexture("ambient-leaf", 6, 6);
      g.destroy();
    }

    const widthRatio = Math.max(1, this.level.worldWidth / 1280);

    const sparkles = this.add.particles(0, 0, "ambient-sparkle", {
      x: { min: 0, max: this.level.worldWidth },
      y: { min: 0, max: GAME_HEIGHT },
      lifespan: { min: 3000, max: 6000 },
      scale: { start: 0.1, end: 0.7 },
      alpha: { start: 0.4, end: 0 },
      speedY: { min: -5, max: -20 },
      speedX: { min: -5, max: 5 },
      quantity: 1,
      frequency: Math.max(10, 150 / widthRatio),
      blendMode: "ADD",
    });
    sparkles.setDepth(-38);

    const leaves = this.add.particles(0, 0, "ambient-leaf", {
      x: { min: -100, max: this.level.worldWidth },
      y: { min: -100, max: GAME_HEIGHT },
      lifespan: { min: 5000, max: 9000 },
      scale: { start: 0.4, end: 1.0 },
      alpha: { start: 0.35, end: 0 },
      speedX: { min: 30, max: 80 },
      speedY: { min: 15, max: 40 },
      rotate: { start: 0, end: 360 },
      gravityY: 10,
      quantity: 1,
      frequency: Math.max(20, 250 / widthRatio),
    });
    leaves.setDepth(-38);
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
    const start = this.level.playerStart;
    // Roster autoritativo (slot + heroe). En single-player es solo el slot 0 con
    // el heroe local. `this.player` es siempre el slot 0; los slots 1..N-1 van a
    // `remotePlayers` (alineados por indice = slot - 1), sin importar quien soy.
    const roster = this.coop?.roster
      ?? [{ slot: 0, characterId: this.save.selectedCharacterId }];

    for (const entry of [...roster].sort((a, b) => a.slot - b.slot)) {
      const character = getCharacterDefinition(entry.characterId as CharacterId);
      const isLocal = entry.slot === this.coopSelfSlot;
      // El jugador local usa el save real; los demas, una copia a vida llena
      // (el host no tiene el save de los guests: limitacion aceptada).
      const stats: PlayerStats = isLocal
        ? this.save.player
        : { ...this.save.player, health: this.save.player.maxHealth };
      const spawnX = getCoopSpawnX(
        start.x,
        entry.slot,
        roster.length,
        40,
        GAME_WIDTH - 40,
      );
      const player = new Player(this, spawnX, start.y, stats, character);
      if (entry.slot === 0) {
        this.player = player;
      } else {
        this.remotePlayers.push(player);
        this.remoteMovement.push(new MovementSystem());
        // Cargas reales del jugador de ese slot: llegan en el roster (presence
        // en el primer nivel, contadores vivos al encadenar). Nunca se siembran
        // desde el save del host: bloqueaba los poderes de los guests.
        this.remoteCharges.push({
          healingCharges: entry.healingCharges ?? 0,
          powerCharges: entry.powerCharges ?? 0,
        });
        this.remoteDamageCooldownUntil.push(0);
      }
    }

    // El guest no simula ningun cuerpo autoritativo: los congela todos.
    if (this.isGuest) {
      this.forEachPlayer((player, slot) => {
        if (slot === this.coopSelfSlot) this.enablePredictedPlayer(player);
        else this.freezePuppet(player);
      });
    }

    // Camara independiente por dispositivo: cada pantalla ancla a su propio
    // personaje local (el del slot `coopSelfSlot`), sin punto medio compartido.
    const cameraTarget = this.playerAtSlot(this.coopSelfSlot) ?? this.player;
    this.cameras.main.startFollow(cameraTarget, true, 0.08, 0.08, -180, 40);
  }

  // Todos los jugadores en orden de slot (0 primero).
  private allPlayers(): Player[] {
    return [this.player, ...this.remotePlayers].filter((p) => p && p.active);
  }

  private playerAtSlot(slot: number): Player | undefined {
    return slot === 0 ? this.player : this.remotePlayers[slot - 1];
  }

  // Id de participante estable por slot para PuzzleActivationSystem.
  private participantForSlot(slot: number): string {
    return `player-${slot + 1}`;
  }

  // El guest no simula la fisica de los cuerpos autoritativos: deshabilita su
  // cuerpo Arcade para que no lo muevan gravedad ni colisiones, y solo reposiciona
  // el sprite desde los snapshots del host.
  private freezePuppet(target: Phaser.GameObjects.GameObject): void {
    const body = target.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
    body.enable = false;
  }

  private enablePredictedPlayer(target: Player): void {
    const body = target.body as Phaser.Physics.Arcade.Body;
    body.reset(target.x, target.y);
    body.setAllowGravity(true);
  }

  private forEachPlayer(callback: (player: Player, slot: number) => void): void {
    callback(this.player, 0);
    this.remotePlayers.forEach((player, index) => callback(player, index + 1));
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
      if (this.isGuest) this.freezePuppet(crate);
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
        .image(leverDef.x, leverDef.y + 7, leverDef.rangedOnly ? "ancient-trials-lever-dist" : "ancient-trials-lever")
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

      const sparkles: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 8; i++) {
        const sp = this.add.image(
          gateDef.x + Math.random() * gateDef.width,
          gateDef.y + Math.random() * gateDef.height,
          "ambient-sparkle"
        )
        .setAlpha(0.7)
        .setDepth(11.1)
        .setScale(Math.random() * 0.4 + 0.3);
        
        this.tweens.add({
          targets: sp,
          y: gateDef.y + Math.random() * gateDef.height,
          duration: 1500 + Math.random() * 2500,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: -1,
          hold: Math.random() * 800,
          repeatDelay: Math.random() * 800,
        });

        this.tweens.add({
          targets: sp,
          x: sp.x + (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 5),
          duration: 1200 + Math.random() * 1500,
          ease: "Quad.easeInOut",
          yoyo: true,
          repeat: -1,
        });
        
        sparkles.push(sp);
      }

      this.gates.push({
        id: gateDef.id,
        rect,
        visual,
        sparkles,
        definition: gateDef,
        opened: false,
      });
    }

    // 6. Sellos mágicos (Seals)
    this.seals = this.level.seals.map((sealDefinition, index) => {
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
      return { hitbox, visual, index };
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

    const goalSparkles: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 24; i++) {
      const sp = this.add.image(
        this.level.goal.x - 46 + Math.random() * 20,
        Math.random() * 640,
        "ambient-sparkle"
      )
      .setAlpha(0.7)
      .setDepth(12.1)
      .setScale(Math.random() * 0.4 + 0.3);
      
      this.tweens.add({
        targets: sp,
        y: Math.random() * 640,
        duration: 1500 + Math.random() * 2500,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
        hold: Math.random() * 800,
        repeatDelay: Math.random() * 800,
      });

      this.tweens.add({
        targets: sp,
        x: sp.x + (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 5),
        duration: 1200 + Math.random() * 1500,
        ease: "Quad.easeInOut",
        yoyo: true,
        repeat: -1,
      });
      
      goalSparkles.push(sp);
    }

    this.goalGate = {
      rect: goalGateRect,
      visual: goalGateVisual,
      sparkles: goalSparkles,
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

    this.enemies = this.physics.add.group();
    if (this.level.enemies) {
      const walkableSurfaces = this.platforms.getChildren() as Phaser.GameObjects.Rectangle[];
      this.level.enemies.forEach((enemyDef, index) => {
        let enemyInstance;
        if (enemyDef.type === "m0") {
          enemyInstance = new BasicEnemy(
            this,
            enemyDef.x,
            enemyDef.y,
            "m0",
            enemyDef.patrolDistance,
            "enemy-ancient-m0"
          );
        } else if (enemyDef.type === "m1") {
          enemyInstance = new M1Enemy(
            this,
            enemyDef.x,
            enemyDef.y,
            enemyDef.patrolDistance,
            walkableSurfaces,
            "enemy-ancient-m1"
          );
        }
        if (enemyInstance) {
          // netId estable para sincronizar posicion/derrota con el guest.
          enemyInstance.setData("netId", index);
          if (this.isGuest) this.freezePuppet(enemyInstance);
          this.enemies.add(enemyInstance);
        }
      });
    }

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
    // Colisiones fisicas: se registran siempre. En el guest los cuerpos estan
    // congelados, asi que estos colliders no hacen nada (el estado llega por red).
    const applyEffects = !this.isGuest;
    this.physics.add.collider(this.crates, this.platforms);
    this.physics.add.collider(this.crates, this.crates); // Apilamiento de cajas!
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.enemies, this.crates);
    const players = this.allPlayers();
    for (let i = 0; i < players.length; i += 1) {
      for (let j = i + 1; j < players.length; j += 1) {
        this.physics.add.collider(players[i], players[j]);
      }
    }
    this.forEachPlayer((player) => {
      this.physics.add.collider(player, this.platforms);
      this.physics.add.collider(player, this.crates);
      this.physics.add.collider(player, this.goalGate.rect);
      for (const gateObj of this.gates) {
        this.physics.add.collider(player, gateObj.rect);
      }
      for (const seal of this.seals) {
        this.physics.add.collider(player, seal.hitbox);
      }
    });
    this.physics.add.collider(this.crates, this.goalGate.rect);
    for (const gateObj of this.gates) {
      this.physics.add.collider(this.crates, gateObj.rect);
    }

    // Efectos de gameplay (dano, recoleccion, activaciones, meta): solo el host o
    // el modo un jugador los resuelven; el guest los ve reflejados en el snapshot.
    this.forEachPlayer((player, slot) => {
      this.physics.add.overlap(player, this.enemies, (first, second) => {
        if (!applyEffects) return;
        const enemy = (first === player ? second : first) as BaseEnemy;
        if (this.tryStompEnemy(enemy, player)) return;
        this.damagePlayerSlot(player, slot, enemy.definition.damage);
      });
      this.physics.add.overlap(player, this.coins, (_player, rawCoin) => {
        if (!applyEffects) return;
        this.collectCoin(rawCoin as Coin);
      });
      if (this.inventoryPickup) {
        this.physics.add.overlap(player, this.inventoryPickup, () => {
          if (applyEffects) this.collectInventoryReward();
        });
      }
      this.physics.add.overlap(player, this.goal, () => {
        if (applyEffects) this.completeLevel();
      });
    });

    this.physics.add.overlap(this.projectiles, this.enemies, (first, second) => {
      this.handleProjectileImpact(first, second, () => {
        const enemy = (first instanceof PowerProjectile ? second : first) as BaseEnemy;
        this.handleEnemyDefeated(enemy);
      });
    });

    // El proyectil desaparece al primer contacto. Los overlaps evitan que Arcade
    // separe los cuerpos, detenga el disparo o transfiera velocidad a las cajas.
    this.physics.add.overlap(this.projectiles, this.platforms, (first, second) => {
      this.handleProjectileImpact(first, second);
    });
    this.physics.add.overlap(this.projectiles, this.crates, (first, second) => {
      this.handleProjectileImpact(first, second);
    });

    for (const gateObj of this.gates) {
      this.physics.add.overlap(this.projectiles, gateObj.rect, (first, second) => {
        this.handleProjectileImpact(first, second);
      });
    }

    this.physics.add.overlap(this.projectiles, this.goalGate.rect, (first, second) => {
      this.handleProjectileImpact(first, second);
    });
    this.physics.add.overlap(this.projectiles, this.goal, (first, second) => {
      this.handleProjectileImpact(first, second);
    });

    for (const leverObj of this.levers) {
      this.physics.add.overlap(this.projectiles, leverObj.rect, (first, second) => {
        this.handleProjectileImpact(first, second, () => {
          if (!this.activations.isActive(leverObj.id)) this.activateLever(leverObj, "player-1");
        });
      });
    }

    for (const seal of this.seals) {
      this.physics.add.overlap(this.projectiles, seal.hitbox, (first, second) => {
        this.handleProjectileImpact(first, second, () => this.breakSeal(seal));
      });
    }

    for (const hazardDefinition of this.level.hazards) {
      const hazard = this.add
        .rectangle(
          hazardDefinition.x,
          hazardDefinition.y,
          hazardDefinition.width,
          hazardDefinition.height,
        )
        .setOrigin(0, 0)
        .setVisible(false);
      this.physics.add.existing(hazard, true);

      const scale = 30 / 129;
      this.add
        .tileSprite(
          hazardDefinition.x,
          hazardDefinition.y + hazardDefinition.height + 6,
          hazardDefinition.width / scale,
          129,
          "ancient-trials-spikes"
        )
        .setOrigin(0, 1)
        .setScale(scale)
        .setDepth(9);

      this.forEachPlayer((player, slot) => {
        this.physics.add.overlap(player, hazard, () => {
          if (applyEffects) this.damagePlayerSlot(player, slot, hazardDefinition.damage);
        });
      });
      this.physics.add.overlap(this.projectiles, hazard, (first, second) => {
        this.handleProjectileImpact(first, second);
      });
    }
  }

  private collectCoin(coin: Coin): void {
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

  private handleActionsFor(player: Player, input: GameplayInputFrame, slot: number): void {
    const participant = this.participantForSlot(slot);
    if (input.meleeJustPressed && player.canMelee(this.time.now)) {
      this.playSfx("sword-swing");
      this.combat.meleeAttack(this, player, this.enemies, (enemy) => {
        this.handleEnemyDefeated(enemy);
      });
      this.tryActivateLever(player, participant);
      this.tryBreakSealWithMelee(player);
    }
    if (input.spinJustPressed && player.canSpin(this.time.now)) {
      this.playSfx("sword-swing");
      const didSpin = this.combat.spinAttack(this, player, this.enemies, (enemy) => {
        this.handleEnemyDefeated(enemy);
      });
      if (didSpin) {
        for (const seal of [...this.seals]) {
          if (Phaser.Math.Distance.Between(
            player.x,
            player.y,
            seal.visual.x,
            seal.visual.y,
          ) < 145) {
            this.breakSeal(seal);
          }
        }
      }
    }
    if (input.healJustPressed) this.useHealingPowerFor(player, slot);
    if (input.powerJustPressed) this.useLethalPowerFor(player, slot);
  }

  private tryStompEnemy(enemy: BaseEnemy, player: Player): boolean {
    if (enemy.getData("stompable") !== true) {
      return false;
    }

    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
    const isFallingOntoEnemy = playerBody.velocity.y > 90 && playerBody.bottom <= enemyBody.top + 18;

    if (!isFallingOntoEnemy) {
      return false;
    }

    const defeated = enemy.takeDamage(player.stats.meleeDamage);
    player.setVelocityY(-310);

    if (defeated) {
      this.handleEnemyDefeated(enemy);
    } else {
      this.playSfx("enemy-hit");
    }

    return true;
  }

  private handleEnemyDefeated(enemy: BaseEnemy): void {
    const coinReward = enemy.definition.coinReward;
    if (coinReward) {
      const amount = Phaser.Math.Between(coinReward.min, coinReward.max);
      const previousGold = this.save.player.coins;
      this.inventory.collect(this.save.player, "bronzeCoin", amount);
      const collectedGold = this.save.player.coins - previousGold;
      this.goldCollected += collectedGold;
      this.announceAchievements(
        this.achievements.recordGoldCollected(this.save, collectedGold),
      );
      this.createCoinGainEffect(enemy.x, enemy.y - 12, amount);
      gameSaveStore.save(this.save);
      this.emitHud();
    }
    this.createEnemyDefeatEffect(enemy);
    enemy.destroy();
    this.playSfx("enemy-defeat");
  }

  private createEnemyDefeatEffect(enemy: BaseEnemy): void {
    const x = enemy.x;
    const y = enemy.y;
    const palette = getEnemyDefeatPalette(enemy.definition.id);
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
        scale: 0.1,
        duration: Phaser.Math.Between(350, 520),
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
  }

  private activateLever(leverObj: {
    id: string;
    rect: Phaser.GameObjects.Rectangle;
    knob: Phaser.GameObjects.Arc;
    visual: Phaser.GameObjects.Image;
    definition: { id: string; x: number; y: number; rangedOnly?: boolean };
  }, participant: string): void {
    if (this.activations.isActive(leverObj.id)) return;
    this.activations.setParticipantActive(leverObj.id, participant, true);
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

  private tryActivateLever(player: Player, participant: string): void {
    for (const leverObj of this.levers) {
      if (this.activations.isActive(leverObj.id)) continue;
      if (leverObj.definition.rangedOnly) continue;

      const dist = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        leverObj.rect.x,
        leverObj.rect.y - 30
      );

      if (dist <= 105) {
        this.activateLever(leverObj, participant);
      }
    }
  }

  private tryBreakSealWithMelee(player: Player): void {
    const seal = this.seals.find((candidate) => Phaser.Geom.Intersects.RectangleToRectangle(
      player.getMeleeHitbox(),
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
      if (reqs.every((actId: string) => this.activations.isActive(actId))) {
        this.openGate(gateObj);
      }
    }

    const portalReady = this.activations.isComplete() && this.seals.length === 0;
    this.goal.setFillStyle(0x66dbc0, portalReady ? 0.34 : 0.12);
    if (portalReady) this.openGoalGate();
  }

  private openGate(gateObj: (typeof this.gates)[number]): void {
    if (gateObj.opened) return;
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
    if (gateObj.sparkles) {
      for (const sp of gateObj.sparkles) {
        this.tweens.add({
          targets: sp,
          alpha: 0,
          scale: sp.scale * (Math.random() > 0.5 ? 2.5 : 1.2),
          duration: 150,
        });
      }
    }
    this.playSfx("progress");
  }

  private openGoalGate(): void {
    if (this.goalGate.opened) return;
    this.goalGate.opened = true;
    (this.goalGate.rect.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.tweens.add({
      targets: this.goalGate.visual,
      y: this.goalGate.visual.y - 640,
      alpha: 0.12,
      duration: 850,
    });
    if (this.goalGate.sparkles) {
      for (const sp of this.goalGate.sparkles) {
        this.tweens.add({
          targets: sp,
          alpha: 0,
          scale: sp.scale * (Math.random() > 0.5 ? 2.5 : 1.2),
          duration: 150,
        });
      }
    }
    this.tweens.add({
      targets: this.goalGate.rect,
      y: this.goalGate.rect.y - 640,
      alpha: 0.06,
      duration: 850,
    });
    this.playSfx("progress");
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

  // Cargas del slot: el slot 0 (jugador local del host) usa el save; los guests
  // usan sus contadores vivos sembrados por el host (no se persisten).
  private chargesForSlot(slot: number): { healingCharges: number; powerCharges: number } {
    return slot === 0
      ? this.save.characterPowerCharges[this.save.selectedCharacterId]
      : this.remoteCharges[slot - 1];
  }

  private useHealingPowerFor(player: Player, slot: number): void {
    const charges = this.chargesForSlot(slot);
    if (charges.healingCharges <= 0 || player.stats.health >= player.stats.maxHealth) return;
    charges.healingCharges -= 1;
    player.stats.health = player.stats.maxHealth;
    this.playSfx("heal");
    if (slot === 0) gameSaveStore.save(this.save);
    this.emitHud();
  }

  private useLethalPowerFor(player: Player, slot: number): void {
    const charges = this.chargesForSlot(slot);
    if (charges.powerCharges <= 0 || !player.canUsePower(this.time.now)) return;
    charges.powerCharges -= 1;
    player.markUsingPower(this.time.now);
    // El proyectil emerge por delante del jugador (no en su centro) para que su
    // cuerpo de 34px no se solape con una pared pegada a la espalda y se consuma
    // al instante: disparar junto a un muro debe lanzar el tiro igualmente.
    const direction = player.facing;
    const projectile = new PowerProjectile(
      this,
      player.x + 34 * direction,
      player.y - 12,
      direction,
    );
    projectile.setData("netId", this.nextProjectileNetId);
    this.nextProjectileNetId += 1;
    this.projectiles.add(projectile);
    projectile.launch();
    this.playSfx("lethal-power");
    if (slot === 0) gameSaveStore.save(this.save);
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

  private damagePlayerSlot(player: Player, slot: number, amount: number): void {
    const cooldownUntil = slot === 0
      ? this.damageCooldownUntil
      : this.remoteDamageCooldownUntil[slot - 1] ?? 0;
    if (this.time.now < cooldownUntil) return;
    const previousHealth = player.stats.health;
    const defeated = player.takeDamage(amount);
    if (player.stats.health === previousHealth) return;
    if (slot === 0) {
      this.damageCooldownUntil = this.time.now + 900;
    } else {
      this.remoteDamageCooldownUntil[slot - 1] = this.time.now + 900;
    }
    this.playSfx("player-hit");
    // El destello rojo es un efecto local del cliente: en host/single solo el
    // slot 0 es "mi" personaje. El guest lo dispara al detectar su propia baja.
    if (slot === 0) {
      gameEvents.emit(EVENTS.PLAYER_DAMAGED, { amount: previousHealth - player.stats.health });
      gameSaveStore.save(this.save);
    }
    this.emitHud();
    if (defeated) this.finishWithDefeat();
  }

  // Cierre de nivel completado, compartido entre host/single y el guest (que lo
  // ejecuta al recibir end("won") del host). No emite SCREEN_CHANGED.
  private finalizeCompletion(): void {
    if (!this.save.completedLevels.includes(this.level.id)) {
      this.save.completedLevels.push(this.level.id);
    }
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
  }

  private completeLevel(): void {
    if (
      this.levelFinished
      || !this.activations.isComplete()
      || this.seals.length > 0
    ) return;
    this.levelFinished = true;
    this.finalizeCompletion();
    if (this.isHost) this.coopLink?.finish("won");
    this.physics.pause();
    this.emitHud();
    gameEvents.emit(EVENTS.SCREEN_CHANGED, "level-transition");
  }

  private finishWithDefeat(): void {
    if (this.levelFinished) return;
    this.levelFinished = true;
    this.recordRunStatistics("defeat");
    this.allPlayers().forEach((player) => player.markDefeated());
    gameSaveStore.save(this.save);
    if (this.isHost) this.coopLink?.finish("lost");
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
    if (this.isGuest) {
      this.emitGuestHud();
      return;
    }
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
    this.emitTeammateHud();
  }

  private bindSceneEvents(): void {
    this.unbindResume = gameEvents.on(EVENTS.RESUME_GAME, () => {
      // En co-op la escena nunca se pausa: la vuelta desde la confirmacion de
      // salida o desde la tienda solo refresca compras y vuelve a "playing".
      if (this.coop && !this.scene.isPaused()) {
        this.syncCoopPurchases();
        gameEvents.emit(EVENTS.SCREEN_CHANGED, "playing");
        return;
      }
      if (!this.scene.isPaused()) return;
      this.save = gameSaveStore.load();
      this.scene.resume();
      gameEvents.emit(EVENTS.SCREEN_CHANGED, "playing");
      this.emitHud();
    });
    this.unbindPowerShop = gameEvents.on(EVENTS.PAUSE_FOR_POWER_SHOP, () => {
      if (this.levelFinished || this.scene.isPaused()) return;
      // Las compras del guest no pueden verificarse desde Broadcast; hasta que
      // exista una RPC autoritativa, la tienda co-op queda limitada al host.
      if (this.isGuest) return;
      gameEvents.emit(EVENTS.SCREEN_CHANGED, "power-shop");
      // En co-op la tienda no pausa la escena (pausar desincronizaria la sala):
      // la partida sigue corriendo detras, como en la confirmacion de salida.
      if (!this.coop) this.scene.pause();
    });
    this.unbindRestart = gameEvents.on(EVENTS.RESTART_GAME, ({ levelId }) => {
      if (this.coop) {
        if (this.isHost) {
          this.startNextCoopLevel(this.level.id);
        }
        return;
      }
      if (!this.levelFinished) {
        this.recordRunStatistics("abandoned");
        gameSaveStore.save(this.save);
      }
      const nextId = puzzleLevelDefinitions[levelId] ? levelId : this.level.id;
      this.scene.start("PuzzleScene", { levelId: nextId });
    });
    this.unbindContinue = gameEvents.on(EVENTS.CONTINUE_LEVEL, ({ completedLevelId, nextLevelId }) => {
      if (!this.levelFinished || completedLevelId !== this.level.id) return;
      if (this.coop) {
        // Co-op encadenado: el host avanza la sala completa reutilizando el
        // mensaje `start`; el boton del guest no avanza (espera al host). Sin
        // siguiente nivel, la expedicion termina y se vuelve al menu.
        if (nextLevelId && puzzleLevelDefinitions[nextLevelId]) {
          if (this.isHost) this.startNextCoopLevel(nextLevelId);
          return;
        }
        gameEvents.emit(EVENTS.GO_TO_MENU, undefined);
        return;
      }
      if (nextLevelId && puzzleLevelDefinitions[nextLevelId]) {
        this.scene.start("PuzzleScene", { levelId: nextLevelId });
        return;
      }
      this.scene.start("GameOverScene", {
        result: "victory",
        restartLevelId: this.level.id,
      });
    });
    this.unbindMenu = gameEvents.on(EVENTS.GO_TO_MENU, () => {
      // Si la sesion co-op sigue viva, avisar al peer antes de abandonar.
      this.coopLink?.finish("left");
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
      this.projectilePuppets?.dispose();
      this.coopLink?.dispose(this.keepCoopSessionOnShutdown);
      touchInputStore.reset();
      this.scene.stop("UIScene");
    });
  }

  private playSfx(cue: SfxCue): void {
    gameEvents.emit(EVENTS.SFX_REQUESTED, { cue });
  }

  // ======================= Capa de co-op online =======================

  private bindCoopNet(): void {
    this.coopLink?.bind({
      onRemoteEnd: (reason, slot) => this.handleRemoteEnd(reason, slot),
      onPeerLeft: () => this.endCoopToMenu(),
      onParticipantLeft: (slot) => this.handleParticipantDisconnected(slot),
      onParticipantRejoined: (slot) => this.handleParticipantRejoined(slot),
      onParticipantReconnectExpired: (slot) => this.handleParticipantReconnectExpired(slot),
      onPredictionReset: () => this.resetGuestPrediction(),
      onStartNextLevel: (message) => {
        // El host encadeno el siguiente nivel: el guest lo sigue solo cuando su
        // propio nivel ya termino (evita reinicios a mitad de partida).
        if (!this.isGuest || !this.levelFinished) return;
        this.restartCoopScene(message.levelId, message.roster);
      },
    });
  }

  // Vuelta de la tienda en co-op (sin pausa): tomar del save fresco solo lo que
  // una compra cambia (ORO y cargas) sin reemplazar `this.save`, porque los
  // stats vivos del jugador comparten referencia con `this.save.player`.
  private syncCoopPurchases(): void {
    const fresh = gameSaveStore.load();
    this.save.player.coins = fresh.player.coins;
    this.save.characterPowerCharges = fresh.characterPowerCharges;
    this.emitHud();
  }

  // Host: encadena el siguiente nivel para toda la sala reutilizando el mensaje
  // `start` (misma sala y canal); la sesion sobrevive al reinicio de escena.
  // El roster lleva las cargas vivas de la partida para que el proximo nivel
  // no las reinicie desde valores viejos.
  private startNextCoopLevel(nextLevelId: string): void {
    const ownCharges = this.save.characterPowerCharges[this.save.selectedCharacterId];
    const roster: CoopStartPlayer[] = coopSession.participants.map((entry) => ({
      slot: entry.slot,
      characterId: entry.characterId,
      healingCharges: entry.slot === 0
        ? ownCharges?.healingCharges ?? 0
        : this.remoteCharges[entry.slot - 1]?.healingCharges ?? 0,
      powerCharges: entry.slot === 0
        ? ownCharges?.powerCharges ?? 0
        : this.remoteCharges[entry.slot - 1]?.powerCharges ?? 0,
    }));
    coopSession.sendStart(nextLevelId, roster);
    this.restartCoopScene(nextLevelId, roster);
  }

  private restartCoopScene(levelId: string, roster: CoopStartPlayer[]): void {
    if (!this.coop) return;
    this.keepCoopSessionOnShutdown = true;
    this.scene.start("PuzzleScene", {
      levelId,
      coop: {
        role: this.coop.role,
        code: this.coop.code,
        // El slot y el roster se toman frescos: si alguien abandono durante el
        // nivel, la sala se compacta para el siguiente.
        localSlot: coopSession.localSlot,
        roster,
      },
    });
  }

  private buildSnapshot(seq: number): Omit<WorldSnapshot, "hostTimeMs" | "inputSeqBySlot"> {
    const hostCharges = this.save.characterPowerCharges[this.save.selectedCharacterId];
    const enemies: Array<[number, number, number]> = [];
    this.enemies.children.each((obj) => {
      const enemy = obj as BaseEnemy;
      const netId = enemy.getData("netId") as number | undefined;
      if (typeof netId === "number" && enemy.active) {
        enemies.push([netId, Math.round(enemy.x), Math.round(enemy.y)]);
      }
      return true;
    });
    const projectiles: NetProjectile[] = [];
    this.projectiles.children.each((obj) => {
      const projectile = obj as PowerProjectile;
      const netId = projectile.getData("netId") as number | undefined;
      if (typeof netId === "number" && projectile.active) {
        projectiles.push([
          netId,
          Math.round(projectile.x),
          Math.round(projectile.y),
          projectile.flipX ? -1 : 1,
        ]);
      }
      return true;
    });
    const active = this.level.requiredActivations.filter((id) => this.activations.isActive(id));
    // players indexado por slot (0 = host, 1..N = guests).
    const players = [
      toNetPlayer(this.player, hostCharges, this.time.now),
      ...this.remotePlayers.map((player, index) =>
        toNetPlayer(player, this.remoteCharges[index], this.time.now),
      ),
    ];
    return {
      seq,
      players,
      crates: this.crates.map((crate) => [Math.round(crate.x), Math.round(crate.y)]),
      enemies,
      projectiles,
      active,
      gatesOpen: this.gates.map((gate) => gate.opened),
      sealsAlive: this.level.seals.map((_, index) =>
        this.seals.some((seal) => seal.index === index),
      ),
      goalOpen: this.goalGate.opened,
      timeMs: Math.round(this.remainingTimeMs),
    };
  }

  private updateGuest(time: number, delta: number): void {
    const input = this.inputSystem.readFrame();
    this.runTracker.advance(delta);
    this.runTracker.trackInput(input);
    if (input.pauseJustPressed) {
      this.handlePausePressed();
      return;
    }
    const localPlayer = this.playerAtSlot(this.coopSelfSlot);
    const controller = this.guestCoopController;
    if (localPlayer && controller) {
      const authoritative = this.coopLink?.latestSnapshot?.players[this.coopSelfSlot];
      controller.update({
        timeMs: time,
        deltaMs: delta,
        input,
        localPlayer,
        localSlot: this.coopSelfSlot,
        outOfWorld: localPlayer.y > GAME_HEIGHT + 60,
        nearestDynamicDistancePx: this.nearestGuestDynamicDistance(localPlayer, authoritative),
        degradedEnterDistancePx: 120,
        setPredictionEnabled: (enabled) => {
          if (enabled) this.enablePredictedPlayer(localPlayer);
          else this.freezePuppet(localPlayer);
        },
        resetMovement: () => this.guestPredictionMovement.reset(),
        simulatePredicted: () => {
          const jumped = this.guestPredictionMovement.update(localPlayer, input, delta);
          if (jumped) {
            controller.traceEdge("jump");
            this.playSfx("jump");
          }
          this.playPredictedActions(localPlayer, input);
        },
        applyDegradedPlayer: (net, position) => {
          applyNetPlayer(localPlayer, net);
          localPlayer.x = position.x;
          localPlayer.y = position.y;
        },
        interpolateSnapshot: (frame) => this.interpolateSnapshot(frame),
        applySnapshot: (snapshot, isNew) => this.applySnapshot(snapshot, isNew),
        applyRemainingTime: (remainingTimeMs) => { this.remainingTimeMs = remainingTimeMs; },
      });
    }
    this.updatePlateKeyInterface();
    this.updateObjectiveText();
    this.emitHud();
  }

  private resetGuestPrediction(): void {
    this.guestCoopController?.reset();
    this.guestPredictionMovement.reset();
  }

  private nearestGuestDynamicDistance(
    player: Player,
    authoritative: WorldSnapshot["players"][number] | undefined,
  ): number {
    const points = [[player.x, player.y], [authoritative?.x ?? player.x, authoritative?.y ?? player.y]];
    let nearestDistance = Number.POSITIVE_INFINITY;
    this.crates.forEach((crate) => points.forEach(([x, y]) => {
      nearestDistance = Math.min(nearestDistance, Math.hypot(crate.x - x, crate.y - y));
    }));
    return nearestDistance;
  }

  private playPredictedActions(player: Player, input: GameplayInputFrame): void {
    const now = this.time.now;
    if (input.meleeJustPressed && player.canMelee(now)) {
      this.guestCoopController?.traceEdge("melee");
      player.markAttacking(now);
      this.playSfx("sword-swing");
    }
    if (input.spinJustPressed && player.canSpin(now)) {
      this.guestCoopController?.traceEdge("spin");
      player.markSpinning(now);
      this.playSfx("sword-swing");
    }
    const charges = this.coopLink?.latestSnapshot?.players[this.coopSelfSlot]?.powerCharges ?? 0;
    if (input.powerJustPressed && charges > 0 && player.canUsePower(now)) {
      this.guestCoopController?.traceEdge("power");
      player.markUsingPower(now);
    }
    const self = this.coopLink?.latestSnapshot?.players[this.coopSelfSlot];
    if (input.healJustPressed && self && self.healCharges > 0 && self.health < self.maxHealth) {
      this.guestCoopController?.traceEdge("heal");
      this.playSfx("heal");
    }
  }

  private interpolateSnapshot(frame: SnapshotRenderFrame<WorldSnapshot>): WorldSnapshot {
    const { previous, next, alpha, extrapolationMs } = frame;
    const latest = this.coopLink?.latestSnapshot ?? previous;
    const snapshot = this.guestInterpolatedSnapshot ?? { ...previous };
    Object.assign(snapshot, previous);
    previous.players.forEach((player, slot) => {
      const source = slot === this.coopSelfSlot ? latest.players[slot] ?? player : player;
      const target = slot === this.coopSelfSlot ? undefined : next?.players[slot];
      this.guestInterpolatedPlayers[slot] = interpolatePlayer(
        source,
        target,
        alpha,
        slot === this.coopSelfSlot ? 0 : extrapolationMs,
        this.guestInterpolatedPlayers[slot],
      );
    });
    this.guestInterpolatedPlayers.length = previous.players.length;
    snapshot.players = this.guestInterpolatedPlayers;
    snapshot.crates = previous.crates
      ? interpolateIndexedPositions(
        previous.crates,
        next?.crates,
        alpha,
        this.guestInterpolatedCrates,
      )
      : undefined;
    snapshot.enemies = previous.enemies
      ? interpolatePositionTuples(
        previous.enemies,
        next?.enemies,
        alpha,
        this.guestInterpolatedEnemies,
      )
      : undefined;
    snapshot.projectiles = interpolateProjectiles(
      previous.projectiles,
      next?.projectiles,
      alpha,
      this.guestInterpolatedProjectiles,
    );
    this.guestInterpolatedSnapshot = snapshot;
    return snapshot;
  }

  private applySnapshot(snap: WorldSnapshot, isNew: boolean): void {
    // players[] esta indexado por slot: se resuelve cada jugador por su slot y
    // NO por posicion en allPlayers(), que filtra a los que abandonaron y
    // desalinearia los estados (aplicaria el estado del que se fue al siguiente).
    snap.players.forEach((net, slot) => {
      if (slot === this.coopSelfSlot) return;
      const target = this.playerAtSlot(slot);
      if (target && net) applyNetPlayer(target, net);
    });
    this.projectilePuppets?.apply(snap.projectiles);

    // Deteccion de dano propio para el destello local del guest, leido en su slot.
    const self = snap.players[this.coopSelfSlot];
    if (self && Number.isFinite(this.guestPrevSelfHealth) && self.health < this.guestPrevSelfHealth) {
      gameEvents.emit(EVENTS.PLAYER_DAMAGED, { amount: this.guestPrevSelfHealth - self.health });
      this.playSfx("player-hit");
    }
    if (self) this.guestPrevSelfHealth = self.health;

    if (snap.crates !== undefined) {
      if (isNew) {
        snap.crates.forEach(([x, y], index) => {
          const crate = this.crates[index];
          if (crate) {
            crate.x = x;
            crate.y = y;
          }
        });
      }
      if (!isNew) snap.crates.forEach(([x, y], index) => {
        const crate = this.crates[index];
        if (crate) { crate.x = x; crate.y = y; }
      });
    }

    if (snap.enemies !== undefined) {
      if (isNew) {
        const aliveEnemies = new Map<number, [number, number]>();
        for (const [netId, x, y] of snap.enemies) aliveEnemies.set(netId, [x, y]);
        this.enemies.children.each((obj) => {
          const enemy = obj as BaseEnemy;
          const netId = enemy.getData("netId") as number | undefined;
          if (typeof netId !== "number") return true;
          const target = aliveEnemies.get(netId);
          if (!target) {
            enemy.destroy();
            return true;
          }
          enemy.x = target[0];
          enemy.y = target[1];
          return true;
        });
      }
      if (!isNew) {
        const positions = new Map(snap.enemies.map(([id, x, y]) => [id, [x, y]]));
        this.enemies.children.each((obj) => {
          const enemy = obj as BaseEnemy;
          const pos = positions.get(enemy.getData("netId") as number);
          if (pos) { enemy.x = pos[0]; enemy.y = pos[1]; }
          return true;
        });
      }
    }

    // Estado de objetivos: activaciones, placas, puertas, sellos y portal.
    if (snap.active !== undefined && isNew) {
      this.activations.reset(this.level.requiredActivations);
      for (const id of snap.active) this.activations.setParticipantActive(id, "net", true);
      for (const plate of this.plates) {
        const active = this.activations.isActive(plate.id);
        plate.rect.setFillStyle(active ? 0x3f8d6e : this.visualPalette.lowerFace);
        plate.visual.setTint(active ? 0x9ff0c5 : this.visualPalette.objectTint);
      }
    }
    if (snap.gatesOpen !== undefined) {
      snap.gatesOpen.forEach((open, index) => {
        if (open && this.gates[index]) this.openGate(this.gates[index]);
      });
    }
    if (snap.sealsAlive !== undefined) {
      snap.sealsAlive.forEach((alive, index) => {
        if (alive) return;
        const seal = this.seals.find((candidate) => candidate.index === index);
        if (seal) this.breakSeal(seal);
      });
    }
    this.goal.setFillStyle(0x66dbc0, snap.goalOpen ? 0.34 : 0.12);
    if (snap.goalOpen) this.openGoalGate();
  }

  private emitGuestHud(): void {
    const snap = this.coopLink?.latestSnapshot;
    const self = snap?.players[this.coopSelfSlot];
    const hud: HudState = {
      ...this.save.player,
      health: self?.health ?? this.save.player.health,
      maxHealth: self?.maxHealth ?? this.save.player.maxHealth,
      healingCharges: self?.healCharges ?? 0,
      powerCharges: self?.powerCharges ?? 0,
      stageNumber: this.level.stageNumber,
      timeRemaining: snap ? Math.ceil(snap.timeMs / 1000) : this.level.timeLimitSeconds,
      timeLimit: this.level.timeLimitSeconds,
      progressPercent: Math.round(
        Phaser.Math.Clamp(((self?.x ?? 0) / this.level.worldWidth) * 100, 0, 100),
      ),
      spinCooldownRemainingMs: self?.spinCdMs ?? 0,
    };
    // updateGuest corre a 60 Hz: emitir el HUD a React solo cuando algo visible
    // cambio (re-render de todo el HUD por frame era un costo gratuito).
    const key = `${hud.health}|${hud.maxHealth}|${hud.healingCharges}|${hud.powerCharges}|`
      + `${hud.timeRemaining}|${hud.progressPercent}|${Math.ceil(hud.spinCooldownRemainingMs / 100)}|`
      + `${hud.coins}`;
    if (key === this.lastGuestHudKey) return;
    this.lastGuestHudKey = key;
    gameEvents.emit(EVENTS.HUD_UPDATED, hud);
    this.emitTeammateHud();
  }

  private lastTeammateHudKey?: string;

  private emitTeammateHud(): void {
    if (!this.coop || !this.coop.roster || this.coop.roster.length <= 1) return;

    const teammates: import("../../shared/types/game").TeammateHudState[] = [];
    
    for (const entry of this.coop.roster) {
      if (entry.slot === this.coopSelfSlot) continue;
      
      const player = this.playerAtSlot(entry.slot);
      if (!player) continue;

      const isConnected = coopSession.participants.some(p => p.slot === entry.slot);
      const snapshotPlayer = this.isGuest
        ? this.coopLink?.latestSnapshot?.players[entry.slot]
        : undefined;
      const charges = snapshotPlayer
        ? { healingCharges: snapshotPlayer.healCharges, powerCharges: snapshotPlayer.powerCharges }
        : this.chargesForSlot(entry.slot);
      
      let status: import("../../shared/types/game").TeammateConnectionStatus = "connected";
      if (!isConnected) {
        status = "disconnected";
      } else if (player.stats.health <= 0) {
        status = "defeated";
      }

      teammates.push({
        slot: entry.slot,
        characterId: entry.characterId as import("../../shared/types/game").CharacterId,
        health: player.stats.health,
        maxHealth: player.stats.maxHealth,
        healingCharges: charges.healingCharges,
        powerCharges: charges.powerCharges,
        status,
      });
    }

    if (teammates.length > 0) {
      const key = teammates.map(t => `${t.slot}|${t.health}|${t.healingCharges}|${t.powerCharges}|${t.status}`).join(",");
      if (key === this.lastTeammateHudKey) return;
      this.lastTeammateHudKey = key;
      gameEvents.emit(EVENTS.TEAMMATE_HUD_UPDATED, teammates);
    }
  }

  private handleParticipantDisconnected(slot: number): void {
    const target = this.playerAtSlot(slot);
    if (!target) return;
    this.freezePuppet(target);
    target.setNetworkPresence(false);
  }

  private handleParticipantRejoined(slot: number): void {
    const target = this.playerAtSlot(slot);
    if (!target) return;
    target.setNetworkPresence(true);
    const body = target.body as Phaser.Physics.Arcade.Body;
    const locallyPredicted = this.isGuest && slot === this.coopSelfSlot;
    body.enable = this.isHost || locallyPredicted;
    body.setAllowGravity(this.isHost || locallyPredicted);
  }

  private handleParticipantReconnectExpired(slot: number): void {
    if (slot === this.coopSelfSlot) {
      this.endCoopToMenu();
      return;
    }
    if (slot === 0 || this.remotePlayers.length < 2) {
      this.endCoopToMenu();
      return;
    }
    this.handleParticipantDisconnected(slot);
  }

  // El guest ejecuta el cierre de nivel al recibir end("won") del host, y su
  // derrota al recibir end("lost"). "left" termina la sesion para ambos lados.
  private handleRemoteEnd(reason: "won" | "lost" | "left", slot?: number): void {
    if (reason === "won") {
      if (this.levelFinished) return;
      this.levelFinished = true;
      this.finalizeCompletion();
      this.physics.pause();
      this.emitHud();
      gameEvents.emit(EVENTS.SCREEN_CHANGED, "level-transition");
    } else if (reason === "lost") {
      if (this.levelFinished) return;
      this.levelFinished = true;
      this.recordRunStatistics("defeat");
      this.allPlayers().forEach((player) => player.markDefeated());
      gameSaveStore.save(this.save);
      this.physics.pause();
      this.playSfx("game-over");
      gameEvents.emit(EVENTS.SCREEN_CHANGED, "game-over");
    } else {
      if (typeof slot === "number") {
        if (slot === this.coopSelfSlot) this.endCoopToMenu();
        else this.handleParticipantReconnectExpired(slot);
      } else {
        this.endCoopToMenu();
      }
    }
  }

  // El peer se fue o cerro: terminamos la sesion y volvemos al menu.
  private endCoopToMenu(): void {
    if (!this.coopLink?.markEnded()) return;
    if (!this.levelFinished) {
      this.recordRunStatistics("abandoned");
      gameSaveStore.save(this.save);
    }
    this.scene.start("MainMenuScene");
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
    for (const crate of this.crates) {
      const body = crate.body as Phaser.Physics.Arcade.Body;
      let staySolid = false;
      this.forEachPlayer((player) => {
        const playerBody = player.body as Phaser.Physics.Arcade.Body;
        if (shouldCrateStaySolid(
          {
            left: playerBody.left,
            right: playerBody.right,
            centerY: playerBody.center.y,
            velocityY: playerBody.velocity.y,
          },
          { left: body.left, right: body.right, top: body.top },
        )) {
          staySolid = true;
        }
      });
      body.pushable = !staySolid;
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
