import Phaser from "phaser";
import { EVENTS } from "../../shared/constants/events";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  MOBILE_GAMEPLAY_FLOOR_EXTENSION,
  MOBILE_GAMEPLAY_QUERY,
} from "../../shared/constants/game";
import type {
  AchievementId,
  CharacterId,
  LevelDefinition,
  LevelHazardDefinition,
  PlayerStats,
  PowerChargeState,
  SaveData,
} from "../../shared/types/game";
import type { GameplayInputFrame } from "../../shared/types/input";
import type { SfxCue } from "../data/sfx";
import { BasicEnemy } from "../entities/enemies/BasicEnemy";
import type { BaseEnemy } from "../entities/enemies/BaseEnemy";
import { M1Enemy } from "../entities/enemies/M1Enemy";
import { M2Enemy } from "../entities/enemies/M2Enemy";
import { M3Enemy } from "../entities/enemies/M3Enemy";
import { MovingHazard } from "../entities/hazards/MovingHazard";
import { Coin } from "../entities/items/Coin";
import { MovingPlatform } from "../entities/platforms/MovingPlatform";
import { SinkingPlatform } from "../entities/platforms/SinkingPlatform";
import { Player } from "../entities/player/Player";
import { PowerProjectile } from "../entities/projectiles/PowerProjectile";
import { getCharacterDefinition } from "../data/characters";
import { getAchievementDefinition } from "../data/achievements";
import { itemDefinitions, randomInventoryRewardItemIds } from "../data/items";
import { levelDefinitions } from "../data/levels";
import { gameEvents } from "../events/EventBus";
import { CameraSystem } from "../systems/camera/CameraSystem";
import { CombatSystem } from "../systems/combat/CombatSystem";
import { GameplayInputSystem } from "../systems/input/GameplayInputSystem";
import { MobileActionBuffer } from "../systems/input/MobileActionBuffer";
import { touchInputStore } from "../systems/input/TouchInputStore";
import { InventorySystem } from "../systems/inventory/InventorySystem";
import { MovementSystem } from "../systems/movement/MovementSystem";
import { AchievementSystem } from "../systems/achievements/AchievementSystem";
import { ProgressionSystem } from "../systems/progression/ProgressionSystem";
import { gameSaveStore } from "../systems/save/GameSaveStore";
import { LevelRunTracker, type RunResult } from "./level/LevelRunTracker";
import { getEnemyDefeatPalette } from "./level/enemyDefeatPalette";
import { coopSession } from "../systems/net/CoopSession";
import type { CoopSessionInfo } from "../events/EventBus";
import { CoopSceneLink } from "../systems/net/CoopSceneLink";
import { CoopProjectilePuppets } from "../systems/net/CoopProjectilePuppets";
import { applyNetPlayer, toNetPlayer } from "../systems/net/coopPlayerNet";
import type { CoopStartPlayer, NetProjectile } from "../systems/net/coopMessages";
import type { LevelSnapshot } from "../systems/net/levelCoopMessages";

// Margen fijo (px) que la linea de presion co-op mantiene detras del jugador mas
// atrasado. Independiente de la camara, que ahora es por dispositivo.
const COOP_PRESSURE_MARGIN = 560;

export class LevelScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private save!: SaveData;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private movingPlatforms!: Phaser.Physics.Arcade.Group;
  private sinkingPlatforms!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private healthPickups!: Phaser.Physics.Arcade.StaticGroup;
  private rewardBox?: Phaser.Physics.Arcade.Sprite;
  private staticHazards!: Phaser.Physics.Arcade.StaticGroup;
  private movingHazards!: Phaser.Physics.Arcade.Group;
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
  private lastSpinCooldownStep = -1;
  private readonly mobileActionBuffer = new MobileActionBuffer();
  private pressureLine!: Phaser.GameObjects.Rectangle;
  private readonly achievements = new AchievementSystem();
  private damageTakenThisLevel = false;
  private recoveringFromPit = false;
  private monstersDefeatedThisLevel = 0;
  private goldCollectedThisLevel = 0;
  private unlockedAchievementsThisLevel: AchievementId[] = [];
  private readonly runTracker = new LevelRunTracker();

  // --- Estado de co-op online (activo solo cuando llega `coop` en create) ---
  // El plumbing de red (seq, throttling, flancos, fin de sesion) vive en
  // CoopSceneLink; la escena solo conserva el estado jugable del slot B.
  private coop?: CoopSessionInfo;
  private coopLink?: CoopSceneLink<LevelSnapshot>;
  private isHost = false;
  private isGuest = false;
  // Slot del jugador local en el modelo de red (0 = host, 1..N = guests). El
  // gameplay sigue siendo de 2, pero el "self" del guest se lee por su slot.
  private coopSelfSlot = 0;
  // Jugadores co-op en los slots 1..N-1 (el slot 0 es siempre `this.player`).
  // Los arreglos hermanos estan alineados por indice = slot - 1.
  private remotePlayers: Player[] = [];
  private remoteMovement: MovementSystem[] = [];
  private remoteCharges: Array<{ healingCharges: number; powerCharges: number }> = [];
  private remoteRecoveringFromPit: boolean[] = [];
  private remotePressureCooldown: number[] = [];
  private guestPrevSelfHealth = Number.POSITIVE_INFINITY;
  private projectilePuppets?: CoopProjectilePuppets;
  private nextProjectileNetId = 1;
  // Al encadenar el siguiente nivel co-op, el SHUTDOWN no debe cerrar la sala.
  private keepCoopSessionOnShutdown = false;
  // Cargas propias segun el save al entrar (para detectar compras en co-op).
  private coopChargeBaseline = { healingCharges: 0, powerCharges: 0 };
  // Firma del ultimo HUD emitido por el guest (evita emitir a 60 Hz).
  private lastGuestHudKey = "";
  private coopPressureX = 0;
  // Cooldown de dano por presion del slot 0 (los slots remotos usan el arreglo).
  private pressureCooldownSlot0 = 0;

  constructor() {
    super("LevelScene");
  }

  create(data: { levelId?: string; coop?: CoopSessionInfo }): void {
    const requestedLevelId = data.levelId ?? "meadowOutpost";
    this.level = levelDefinitions[requestedLevelId] ?? levelDefinitions.meadowOutpost;
    this.levelFinished = false;

    // Modo co-op: solo activo si la sesion sigue viva (si el peer cerro, degradamos
    // a un jugador). En co-op no hay checkpoint persistente compartido.
    this.coop = data.coop && coopSession.isActive ? data.coop : undefined;
    this.coopLink = this.coop ? new CoopSceneLink<LevelSnapshot>(this.coop) : undefined;
    this.isHost = this.coop?.role === "host";
    this.isGuest = this.coop?.role === "guest";
    this.coopSelfSlot = this.coop?.localSlot ?? 0;
    this.remotePlayers = [];
    this.remoteMovement = [];
    this.remoteCharges = [];
    this.remoteRecoveringFromPit = [];
    this.remotePressureCooldown = [];
    this.guestPrevSelfHealth = Number.POSITIVE_INFINITY;
    this.projectilePuppets = this.isGuest
      ? new CoopProjectilePuppets(this, () => this.playSfx("lethal-power"))
      : undefined;
    this.nextProjectileNetId = 1;
    this.keepCoopSessionOnShutdown = false;
    this.lastGuestHudKey = "";
    this.coopPressureX = 0;
    this.pressureCooldownSlot0 = 0;
    this.damageTakenThisLevel = false;
    this.recoveringFromPit = false;
    this.monstersDefeatedThisLevel = 0;
    this.goldCollectedThisLevel = 0;
    this.unlockedAchievementsThisLevel = [];
    this.runTracker.reset();
    gameEvents.emit(EVENTS.ACTIVE_LEVEL_CHANGED, { levelId: this.level.id });
    this.save = gameSaveStore.load();
    this.save.player.health = this.save.player.maxHealth;
    const ownCharges = this.save.characterPowerCharges[this.save.selectedCharacterId];
    this.coopChargeBaseline = {
      healingCharges: ownCharges?.healingCharges ?? 0,
      powerCharges: ownCharges?.powerCharges ?? 0,
    };
    // En co-op ambos empiezan en el inicio del nivel (sin checkpoint asimetrico).
    this.activeCheckpoint = !this.coop && this.save.checkpointId === this.level.checkpoint.id
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
    this.lastSpinCooldownStep = -1;
    this.mobileActionBuffer.reset(window.matchMedia(MOBILE_GAMEPLAY_QUERY).matches);

    touchInputStore.reset();
    this.movement.reset();
    this.inputSystem = new GameplayInputSystem(this);
    this.createWorld();
    this.createPlayer();
    this.unbindCameraZoom = this.cameraSystem.bindResponsiveZoom(this, this.level.worldWidth);
    if (this.activeCheckpoint) {
      this.resetPressureForSafePoint(this.activeCheckpoint.x);
    }
    this.createEntities();
    this.createCollisions();
    this.bindSceneEvents();
    if (this.coop) this.bindCoopNet();

    this.scene.launch("UIScene");
    gameEvents.emit(EVENTS.SCREEN_CHANGED, "playing");
    this.emitHud();
  }

  update(time: number, delta: number): void {
    if (this.levelFinished) {
      return;
    }

    // El guest no simula: envia su input y renderiza los snapshots del host.
    if (this.isGuest) {
      this.updateGuest(time, delta);
      return;
    }

    this.runTracker.advance(delta);
    this.updateLevelTimer(delta);
    if (this.levelFinished) {
      return;
    }

    const input = this.inputSystem.readFrame();
    this.runTracker.trackInput(input);
    if (input.pauseJustPressed) {
      this.handlePausePressed();
      return;
    }
    const didJump = this.movement.update(this.player, input, delta);
    if (didJump) {
      this.playSfx("jump");
      this.requestHaptic("jump");
    }
    this.handleActionsFor(this.player, input, 0, true);

    if (this.isHost && this.coopLink) {
      // El host simula cada guest (slots 1..N) desde su input remoto por slot.
      // Los que abandonaron quedan inactivos: no se simulan ni actuan.
      this.remotePlayers.forEach((player, index) => {
        if (!player.active) return;
        const slot = index + 1;
        const remoteFrame = this.coopLink!.consumeRemoteInputFrame(slot);
        const didJumpRemote = this.remoteMovement[index].update(player, remoteFrame, delta);
        if (didJumpRemote) this.playSfx("jump");
        this.handleActionsFor(player, remoteFrame, slot, false);
      });
    }

    this.updateSpinCooldownHud();

    if (this.coop) {
      this.updateCoopPressure(delta);
    } else {
      this.updateCameraPressure(delta);
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      this.cameraSystem.updateMobileJumpFollow(this, playerBody.top, delta);
      this.handlePressureLineDamage(delta);
    }
    if (this.levelFinished) {
      return;
    }

    this.enemies.children.each((enemy) => {
      (enemy as BaseEnemy).update(this.nearestPlayerTo(enemy as BaseEnemy));
      return true;
    });

    this.forEachPlayer((player, slot) => {
      if (player.y > GAME_HEIGHT + 80) this.handlePitFall(player, slot);
    });

    if (this.isHost && this.remotePlayers.length > 0) {
      this.coopLink?.maybeSendSnapshot(time, (seq) => this.buildSnapshot(seq));
    }
  }

  private createWorld(): void {
    const isEnchantedForest = this.level.theme === "enchanted-forest";
    const isActiveVolcano = this.level.theme === "active-volcano";
    this.cameras.main.setBackgroundColor(
      isActiveVolcano ? "#190b0d" : isEnchantedForest ? "#153f3b" : "#071323",
    );
    this.physics.world.setBounds(0, 0, this.level.worldWidth, GAME_HEIGHT);
    this.physics.world.setBoundsCollision(true, true, true, false);
    if (isActiveVolcano) {
      this.createActiveVolcanoBackdrop();
    } else if (isEnchantedForest) {
      this.createEnchantedForestBackdrop();
    } else {
      this.createForestBackdrop();
    }
    this.createGroundLayer();
    this.createScenarioDressings();
    this.pressureLine = this.add
      .rectangle(
        3,
        (GAME_HEIGHT + MOBILE_GAMEPLAY_FLOOR_EXTENSION) / 2,
        6,
        GAME_HEIGHT + MOBILE_GAMEPLAY_FLOOR_EXTENSION,
        0xff2638,
        0.96,
      )
      .setDepth(30);

    this.platforms = this.physics.add.staticGroup();
    this.movingPlatforms = this.physics.add.group({ runChildUpdate: true });
    this.sinkingPlatforms = this.physics.add.group({ runChildUpdate: true });
    let movingPlatformNetId = 0;
    
    console.warn(`[DEBUG] LEVEL SCENE CREATED - ID: ${this.level.id}, Total platforms: ${this.level.platforms.length}`);
    
    for (const platform of this.level.platforms) {
      if (platform.movement) {
        const movingPlatform = new MovingPlatform(this, platform, this.level.theme);
        movingPlatform.setData("netId", movingPlatformNetId);
        movingPlatformNetId += 1;
        if (this.isGuest) this.freezePuppet(movingPlatform);
        this.movingPlatforms.add(movingPlatform);
      } else if (platform.sinking) {
        const sinkingPlatform = new SinkingPlatform(this, platform, this.level.theme);
        this.sinkingPlatforms.add(sinkingPlatform);
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
    const startY = this.activeCheckpoint ? start.y - 60 : start.y;
    // Roster autoritativo (slot + heroe). En single-player es solo el slot 0.
    // `this.player` es siempre el slot 0; los slots 1..N-1 van a `remotePlayers`.
    const roster = this.coop?.roster
      ?? [{ slot: 0, characterId: this.save.selectedCharacterId }];

    for (const entry of [...roster].sort((a, b) => a.slot - b.slot)) {
      const character = getCharacterDefinition(entry.characterId as CharacterId);
      const isLocal = entry.slot === this.coopSelfSlot;
      const stats: PlayerStats = isLocal
        ? this.save.player
        : { ...this.save.player, health: this.save.player.maxHealth };
      const player = new Player(this, start.x - 70 * entry.slot, startY, stats, character);
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
        this.remoteRecoveringFromPit.push(false);
        this.remotePressureCooldown.push(0);
      }
    }

    this.cameraSystem.setBounds(this, this.level.worldWidth);

    if (this.coop) {
      if (this.isGuest) this.allPlayers().forEach((player) => this.freezePuppet(player));
      // Camara independiente por dispositivo: cada pantalla ancla a su propio
      // personaje local (slot `coopSelfSlot`). En single-player la camara se
      // controla manualmente por la presion, asi que no se toca.
      const cameraTarget = this.playerAtSlot(this.coopSelfSlot) ?? this.player;
      this.cameras.main.startFollow(cameraTarget, true, 0.1, 0.1, 0, 0);
    }
  }

  private allPlayers(): Player[] {
    return [this.player, ...this.remotePlayers].filter((p) => p && p.active);
  }

  private playerAtSlot(slot: number): Player | undefined {
    return slot === 0 ? this.player : this.remotePlayers[slot - 1];
  }

  private freezePuppet(target: Phaser.GameObjects.GameObject): void {
    const body = target.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.enable = false;
  }

  private forEachPlayer(callback: (player: Player, slot: number) => void): void {
    callback(this.player, 0);
    this.remotePlayers.forEach((player, index) => callback(player, index + 1));
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

  private createEntities(): void {
    this.enemies = this.physics.add.group();
    this.coins = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.healthPickups = this.physics.add.staticGroup();
    this.movingHazards = this.physics.add.group({ runChildUpdate: true });
    this.powerProjectiles = this.physics.add.group({
      allowGravity: false,
      runChildUpdate: true,
    });

    this.level.enemies.forEach((enemy, index) => {
      const instance = this.createEnemy(enemy);
      instance.setData("netId", index);
      if (this.isGuest) this.freezePuppet(instance);
      this.enemies.add(instance);
    });

    this.level.coins.forEach((coin, index) => {
      const instance = new Coin(this, coin.x, coin.y, coin.itemId, coin.value);
      instance.setData("coinIndex", index);
      this.coins.add(instance);
    });

    this.level.healthPickups.forEach((pickup, index) => {
      const heart = this.healthPickups.create(pickup.x, pickup.y, "health-heart");
      heart.setDepth(9);
      heart.setData("heartIndex", index);
    });

    if (!this.save.claimedRewardBoxes.includes(this.level.rewardBox.id)) {
      this.rewardBox = this.physics.add.staticSprite(
        this.level.rewardBox.x,
        this.level.rewardBox.y,
        "reward-box",
      );
      this.rewardBox.setDepth(10);
      this.rewardBox.setData("rewardBoxId", this.level.rewardBox.id);
    }

    this.level.hazards
      .filter((item) => item.type === "moving")
      .forEach((hazard, index) => {
        const instance = new MovingHazard(this, hazard);
        instance.setData("netId", index);
        if (this.isGuest) this.freezePuppet(instance);
        this.movingHazards.add(instance);
      });

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
    const isActiveVolcano = this.level.theme === "active-volcano";
    if (enemy.enemyId === "m1") {
      return new M1Enemy(
        this,
        enemy.x,
        enemy.y,
        enemy.patrolDistance,
        [
          ...this.platforms.getChildren(),
          ...this.movingPlatforms.getChildren(),
          ...this.sinkingPlatforms.getChildren(),
        ] as Phaser.GameObjects.Rectangle[],
        isActiveVolcano
          ? "volcanic-enemy-m1"
          : isEnchantedForest
            ? "enchanted-enemy-m1"
            : "enemy-m1",
      );
    }

    if (enemy.enemyId === "m2") {
      return new M2Enemy(
        this,
        enemy.x,
        enemy.y,
        enemy.patrolDistance,
        enemy.aggression,
        isActiveVolcano ? "volcanic" : isEnchantedForest ? "enchanted" : "default",
      );
    }

    if (enemy.enemyId === "m3" || enemy.enemyId === "e2m3" || enemy.enemyId === "e3m3") {
      return new M3Enemy(
        this,
        enemy.x,
        enemy.y,
        [
          ...this.platforms.getChildren(),
          ...this.movingPlatforms.getChildren(),
          ...this.sinkingPlatforms.getChildren(),
        ] as Phaser.GameObjects.Rectangle[],
        this.level.m3Intelligence,
        enemy.enemyId === "e2m3"
          ? "enchanted"
          : enemy.enemyId === "e3m3"
            ? "volcanic"
            : "default",
      );
    }

    return new BasicEnemy(
      this,
      enemy.x,
      enemy.y,
      enemy.enemyId,
      enemy.patrolDistance,
      isActiveVolcano && enemy.enemyId === "m0"
        ? "volcanic-enemy-m0"
        : isEnchantedForest && enemy.enemyId === "m0"
          ? "enchanted-enemy-m0"
          : "enemy-emberling",
    );
  }

  private createCollisions(): void {
    // Los efectos de gameplay (dano, recoleccion, meta, checkpoint) solo los
    // resuelven host o single-player; el guest los ve reflejados por snapshot.
    const fx = !this.isGuest;
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.enemies, this.movingPlatforms);
    this.physics.add.collider(this.enemies, this.sinkingPlatforms);
    this.physics.add.collider(
      this.enemies,
      this.enemies,
      undefined,
      (enemyA, enemyB) => enemyA instanceof M3Enemy && enemyB instanceof M3Enemy,
    );
    const players = this.allPlayers();
    for (let i = 0; i < players.length; i += 1) {
      for (let j = i + 1; j < players.length; j += 1) {
        this.physics.add.collider(players[i], players[j]);
      }
    }

    this.forEachPlayer((player, slot) => {
      this.physics.add.collider(player, this.platforms);
      this.physics.add.collider(player, this.movingPlatforms);
      this.physics.add.collider(player, this.sinkingPlatforms, (_p, platformObj) => {
        const platform = platformObj as SinkingPlatform;
        if (platform.body && (platform.body as Phaser.Physics.Arcade.Body).touching.up) {
          platform.triggerSink();
        }
      });
      this.physics.add.overlap(player, this.coins, (_p, coin) => {
        if (fx) this.collectCoin(coin as Coin);
      });
      this.physics.add.overlap(player, this.healthPickups, (_p, pickup) => {
        if (fx) this.collectHealthPickup(pickup as Phaser.Physics.Arcade.Sprite);
      });
      if (this.rewardBox) {
        this.physics.add.overlap(player, this.rewardBox, (_p, box) => {
          if (fx) this.collectRewardBox(box as Phaser.Physics.Arcade.Sprite);
        });
      }
      this.physics.add.overlap(player, this.enemies, (_p, enemy) => {
        if (fx) this.handlePlayerEnemyOverlap(enemy as BaseEnemy, player, slot);
      });
      this.physics.add.overlap(player, this.staticHazards, (_p, hazard) => {
        if (fx) this.handleHazardOverlap(hazard as Phaser.GameObjects.GameObject, player, slot);
      });
      this.physics.add.overlap(player, this.movingHazards, (_p, hazard) => {
        if (fx) this.handleHazardOverlap(hazard as Phaser.GameObjects.GameObject, player, slot);
      });
      this.physics.add.overlap(player, this.checkpoint, () => {
        if (fx) this.activateCheckpoint();
      });
      this.physics.add.overlap(player, this.goal, () => {
        if (fx) this.completeLevel();
      });
    });

    this.physics.add.overlap(this.powerProjectiles, this.enemies, (projectile, enemy) => {
      this.hitEnemyWithPower(projectile as PowerProjectile, enemy as BaseEnemy);
    });
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

        if (this.coop) {
          // Co-op encadenado: el host avanza la sala completa reutilizando el
          // mensaje `start`; el boton del guest no avanza (espera al host).
          // Sin siguiente nivel, la expedicion termina y se vuelve al menu.
          if (nextLevelId && levelDefinitions[nextLevelId]) {
            if (this.isHost) this.startNextCoopLevel(nextLevelId);
            return;
          }
          gameEvents.emit(EVENTS.GO_TO_MENU, undefined);
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
      this.coopLink?.dispose(this.keepCoopSessionOnShutdown);
      touchInputStore.reset();
      this.scene.stop("UIScene");
    });
  }

  private handlePausePressed(): void {
    this.playSfx("ui-click");
    if (this.coop) {
      // Pausar desincronizaria la sesion: en co-op la partida sigue corriendo
      // detras de una confirmacion React para salir ("coop-exit-confirm").
      gameEvents.emit(EVENTS.SCREEN_CHANGED, "coop-exit-confirm");
      return;
    }
    this.pauseGame();
  }

  // `useBuffer` solo para el input local (mobileActionBuffer es de toque local);
  // el jugador remoto (host simulando al guest) usa los flancos crudos.
  private handleActionsFor(
    player: Player,
    input: GameplayInputFrame,
    slot: number,
    useBuffer: boolean,
  ): void {
    const now = this.time.now;
    const wantsMelee = useBuffer
      ? this.mobileActionBuffer.shouldExecute("melee", input.meleeJustPressed, now, player.canMelee(now))
      : input.meleeJustPressed && player.canMelee(now);
    if (wantsMelee) {
      this.playSfx("sword-swing");
      if (slot === 0) this.requestHaptic("attack");
      this.combat.meleeAttack(this, player, this.enemies, (enemy) => {
        this.handleEnemyDefeated(enemy);
      });
    }

    const wantsSpin = useBuffer
      ? this.mobileActionBuffer.shouldExecute("spin", input.spinJustPressed, now, player.canSpin(now))
      : input.spinJustPressed && player.canSpin(now);
    if (wantsSpin) {
      const didSpin = this.combat.spinAttack(
        this,
        player,
        this.enemies,
        (enemy) => this.handleEnemyDefeated(enemy),
      );
      if (didSpin) {
        this.playSfx("sword-swing");
        if (slot === 0) this.requestHaptic("spin");
        this.emitHud();
      }
    }

    if (input.healJustPressed) {
      this.useHealingPowerFor(player, slot);
    }

    if (input.powerJustPressed) {
      this.useLethalPowerFor(player, slot);
    }
  }

  private chargesForSlot(slot: number): { healingCharges: number; powerCharges: number } {
    return slot === 0 ? this.getActivePowerCharges() : this.remoteCharges[slot - 1];
  }

  private useHealingPowerFor(player: Player, slot: number): void {
    const powerCharges = this.chargesForSlot(slot);
    if (powerCharges.healingCharges <= 0 || player.stats.health >= player.stats.maxHealth) {
      return;
    }

    powerCharges.healingCharges -= 1;
    player.stats.health = player.stats.maxHealth;
    this.playSfx("heal");
    this.createHealingEffectAt(player);
    if (slot === 0) gameSaveStore.save(this.save);
    this.emitHud();
  }

  private useLethalPowerFor(player: Player, slot: number): void {
    const powerCharges = this.chargesForSlot(slot);
    if (powerCharges.powerCharges <= 0 || !player.canUsePower(this.time.now)) {
      return;
    }

    powerCharges.powerCharges -= 1;
    player.markUsingPower(this.time.now);
    const direction = player.facing;
    const projectile = new PowerProjectile(
      this,
      player.x + 34 * direction,
      player.y - 7,
      direction,
    );
    projectile.setData("netId", this.nextProjectileNetId);
    this.nextProjectileNetId += 1;
    this.powerProjectiles.add(projectile);
    projectile.launch();
    this.playSfx("lethal-power");
    if (slot === 0) gameSaveStore.save(this.save);
    this.emitHud();
  }

  private createHealingEffectAt(player: Player): void {
    const x = player.x;
    const y = player.y - 10;
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

  private createActiveVolcanoBackdrop(): void {
    this.add
      .image(0, 0, "volcanic-background")
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(-40);

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x3d0908, 0.12)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-39);

    const islandCrops = [
      { x: 60, y: 175, width: 410, height: 340 },
      { x: 505, y: 175, width: 455, height: 345 },
      { x: 55, y: 500, width: 420, height: 320 },
      { x: 500, y: 510, width: 465, height: 305 },
    ];
    for (let x = 220, index = 0; x < this.level.worldWidth + 500; x += 720, index += 1) {
      const crop = islandCrops[index % islandCrops.length];
      this.add
        .image(x, 645 - (index % 3) * 46, "volcanic-midground")
        .setCrop(crop.x, crop.y, crop.width, crop.height)
        .setOrigin(0.5, 1)
        .setDisplaySize(crop.width * 0.68, crop.height * 0.68)
        .setAlpha(index % 2 === 0 ? 0.54 : 0.42)
        .setTint(index % 2 === 0 ? 0xd77a55 : 0x9b5a52)
        .setScrollFactor(0.26 + (index % 3) * 0.08)
        .setDepth(-22 + (index % 3));
    }

    for (let x = 120; x < this.level.worldWidth; x += 210) {
      const y = 180 + ((x / 210) % 5) * 74;
      this.add.circle(x, y, 2.4, 0xff7b27, 0.7).setScrollFactor(0.5).setDepth(-8);
      this.add.circle(x + 78, y + 54, 1.5, 0xffd05b, 0.58).setScrollFactor(0.62).setDepth(-7);
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
    if (this.level.theme === "active-volcano") {
      for (let x = -160; x < this.level.worldWidth + 180; x += 340) {
        this.add.ellipse(x, 694, 500, 132, 0x16090a, 0.9).setDepth(-1);
        this.add.ellipse(x + 130, 642, 310, 76, 0x8f2416, 0.18).setDepth(-1);
      }
      return;
    }

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
    if (this.level.theme === "active-volcano") {
      this.createActiveVolcanoDressings();
      return;
    }

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

  private createActiveVolcanoDressings(): void {
    const groundPlatforms = this.level.platforms.filter((platform) => platform.y >= 640);
    for (const [index, platform] of groundPlatforms.entries()) {
      const surfaceY = platform.y + 2;
      if (platform.width > 380) {
        this.add
          .triangle(
            platform.x + 120 + (index % 3) * 70,
            surfaceY - 18,
            0,
            36,
            24,
            0,
            48,
            36,
            0x241315,
            0.92,
          )
          .setOrigin(0.5, 1)
          .setStrokeStyle(2, 0x6f2a20, 0.75)
          .setDepth(7);
      }
      if (index % 2 === 0) {
        this.add.circle(platform.x + platform.width - 88, surfaceY - 5, 4, 0xff6a20, 0.72).setDepth(8);
        this.add.circle(platform.x + platform.width - 72, surfaceY - 10, 2.4, 0xffc04b, 0.62).setDepth(8);
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

    if (this.level.theme === "active-volcano") {
      this.createVolcanicTerrainRun(platform);
    } else if (this.level.theme === "enchanted-forest") {
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
    const visualHeight = isGround
      ? GAME_HEIGHT + MOBILE_GAMEPLAY_FLOOR_EXTENSION - topY + 18
      : 58;
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

  private createVolcanicTerrainRun(platform: LevelDefinition["platforms"][number]): void {
    const isGround = platform.y >= 640;
    const topY = platform.y - 8;
    const visualHeight = isGround
      ? GAME_HEIGHT + MOBILE_GAMEPLAY_FLOOR_EXTENSION - topY + 18
      : 68;
    const graphics = this.add.graphics().setDepth(isGround ? 4 : 5);

    graphics.fillStyle(0x12090a, 0.48);
    graphics.fillRoundedRect(platform.x + 7, topY + 10, platform.width, visualHeight, 10);
    graphics.fillStyle(isGround ? 0x2b1718 : 0x382022, 1);
    graphics.fillRoundedRect(platform.x, topY, platform.width, visualHeight, isGround ? 7 : 12);
    graphics.fillStyle(0x1b1012, 0.94);
    graphics.fillRect(platform.x, topY + 25, platform.width, Math.max(24, visualHeight - 25));
    graphics.fillStyle(0xff5a1f, 0.9);
    graphics.fillRoundedRect(platform.x - 2, topY - 2, platform.width + 4, 9, 5);
    graphics.fillStyle(0xffb23f, 0.64);
    graphics.fillRect(platform.x + 8, topY, Math.max(18, platform.width - 18), 3);

    const crackWidth = isGround ? 94 : 72;
    for (let x = platform.x + crackWidth; x < platform.x + platform.width; x += crackWidth) {
      const offset = Math.floor((x - platform.x) / crackWidth) % 2 === 0 ? 8 : 16;
      graphics.lineStyle(3, 0xa72c19, 0.8);
      graphics.lineBetween(x, topY + 8, x - 11, topY + 28 + offset);
      graphics.lineBetween(x - 11, topY + 28 + offset, x + 4, topY + 48 + offset);
      graphics.lineStyle(1, 0xff8b2c, 0.88);
      graphics.lineBetween(x - 1, topY + 9, x - 10, topY + 28 + offset);
    }
    for (let y = topY + 48; y < topY + visualHeight; y += 38) {
      graphics.lineStyle(2, 0x4a2020, 0.72);
      graphics.lineBetween(platform.x + 8, y, platform.x + platform.width - 8, y + 5);
    }
  }

  private createTerrainRun(platform: LevelDefinition["platforms"][number]): void {
    const isGround = platform.y >= 640;
    const pieceWidth = isGround ? 128 : 96;
    const pieceHeight = isGround ? 112 + MOBILE_GAMEPLAY_FLOOR_EXTENSION : 78;
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
      const middle = this.add
        .image(cursorX, visualY, midKeys[index % midKeys.length])
        .setOrigin(0, 0)
        .setDepth(depth);
      middle.setDisplaySize(segmentWidth, pieceHeight);
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
    if (this.level.theme === "active-volcano") {
      this.add
        .rectangle(hazard.x, hazard.y - 22, hazard.width, hazard.height + 44, 0x5c120b, 0.98)
        .setOrigin(0, 0)
        .setDepth(5);
      this.add
        .rectangle(hazard.x, hazard.y - 8, hazard.width, 16, 0xff4f16, 0.72)
        .setOrigin(0, 0)
        .setDepth(6);
      for (let x = hazard.x + 20; x < hazard.x + hazard.width; x += 42) {
        this.add.circle(x, hazard.y - 4, 4, 0xffc04b, 0.7).setDepth(7);
        this.add.circle(x + 12, hazard.y + 8, 2.2, 0xff6a20, 0.84).setDepth(7);
      }
      return;
    }

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
    const isActiveVolcano = this.level.theme === "active-volcano";
    const baseY = hazard.y + hazard.height;
    this.add
      .rectangle(hazard.x, baseY - 8, hazard.width, 8, 0x1b1612, 1)
      .setOrigin(0, 0)
      .setDepth(10);

    for (let x = hazard.x + 8; x < hazard.x + hazard.width; x += 17) {
      this.add
        .triangle(x, baseY - 25, 0, 24, 16, 24, 8, 0, isActiveVolcano ? 0x4a2320 : 0xd8d3bb, 1)
        .setDepth(11)
        .setStrokeStyle(1, isActiveVolcano ? 0xff5a1f : 0x596167, 1);
      this.add
        .triangle(x + 4, baseY - 28, 0, 13, 8, 13, 4, 0, isActiveVolcano ? 0xffa33a : 0xffffff, 0.48)
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
    this.playSfx("coin");
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
    this.playSfx("pickup");
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
    this.playSfx("pickup");
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

  private handlePlayerEnemyOverlap(enemy: BaseEnemy, player: Player, slot: number): void {
    if (this.tryStompEnemy(enemy, player)) {
      return;
    }

    if (enemy instanceof M3Enemy) {
      if (!enemy.canDamagePlayer()) {
        return;
      }
      this.damagePlayerSlot(player, slot, enemy.damage);
      enemy.completeAttack();
      return;
    }

    this.damagePlayerSlot(player, slot, enemy.damage);

    if (enemy instanceof M2Enemy) {
      enemy.completeStrike();
    }
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
    this.monstersDefeatedThisLevel += 1;
    this.playSfx("enemy-defeat");
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
        scale: 0.25,
        rotation: angle + Phaser.Math.FloatBetween(-1.4, 1.4),
        duration: Phaser.Math.Between(220, 360),
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
  }

  private damagePlayer(amount: number): void {
    this.damagePlayerSlot(this.player, 0, amount);
  }

  private damagePlayerSlot(player: Player, slot: number, amount: number): void {
    if (this.levelFinished) {
      return;
    }

    const previousHealth = player.stats.health;
    const defeated = player.takeDamage(amount);
    if (player.stats.health < previousHealth) {
      this.playSfx("player-hit");
      // El "nivel perfecto" es por jugador: el dano del companero (slot B) no
      // debe arruinar el logro del heroe local del host.
      if (slot === 0) this.damageTakenThisLevel = true;
      // Efectos locales del cliente: solo el slot A es "mi" personaje en
      // host/single. El guest los dispara al detectar su propia baja.
      if (slot === 0) {
        this.requestHaptic("damage");
        this.cameras.main.shake(160, 0.009);
        gameEvents.emit(EVENTS.PLAYER_DAMAGED, { amount: previousHealth - player.stats.health });
        gameSaveStore.save(this.save);
      }
    }

    this.emitHud();
    if (defeated) {
      this.finishWithDefeat();
    }
  }

  private handleHazardOverlap(
    hazard: Phaser.GameObjects.GameObject,
    player: Player,
    slot: number,
  ): void {
    const damage = hazard.getData("damage") as number | undefined;
    const hazardType = hazard.getData("hazardType") as LevelHazardDefinition["type"] | undefined;
    if (hazardType === "pit") {
      this.handlePitFall(player, slot);
      return;
    }

    this.damagePlayerSlot(player, slot, damage ?? 1);
  }

  private updateCameraPressure(delta: number): void {
    const visibleWorldWidth = this.cameraSystem.getVisibleWorldWidth(this);
    const visibleWorldLeft = this.cameraSystem.getVisibleWorldLeft(this);
    const maxScrollX = Math.max(0, this.level.worldWidth - visibleWorldWidth);
    this.pressureScrollX = Math.max(this.pressureScrollX, visibleWorldLeft);
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
    const nextVisibleWorldLeft = Phaser.Math.Linear(visibleWorldLeft, targetScrollX, 0.09);

    this.cameraSystem.setVisibleWorldLeft(
      this,
      Math.max(nextVisibleWorldLeft, this.pressureScrollX),
    );

    this.pressureLine.x = this.cameraSystem.getVisibleWorldLeft(this) + this.pressureLine.width / 2;
  }

  private handlePressureLineDamage(delta: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const pressureLineX = this.pressureLine.x + this.pressureLine.width / 2;
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
    this.playSfx("checkpoint");
    this.announceAchievements(
      this.achievements.recordCheckpointActivated(this.save, this.level.checkpoint.id),
    );
    gameSaveStore.save(this.save);
    this.checkpoint.setTint(0xffffff);
    this.emitHud();
  }

  private handlePitFall(player: Player, slot: number): void {
    if (this.levelFinished) {
      return;
    }
    const recovering = slot === 0 ? this.recoveringFromPit : this.remoteRecoveringFromPit[slot - 1];
    if (recovering) {
      return;
    }
    if (slot === 0) this.recoveringFromPit = true;
    else this.remoteRecoveringFromPit[slot - 1] = true;

    const previousHealth = player.stats.health;
    player.stats.health = Math.max(0, player.stats.health - 1);
    this.playSfx("player-hit");
    this.damageTakenThisLevel = true;
    if (slot === 0) {
      this.cameras.main.shake(160, 0.009);
      gameEvents.emit(EVENTS.PLAYER_DAMAGED, { amount: previousHealth - player.stats.health });
      gameSaveStore.save(this.save);
    }
    this.emitHud();

    if (player.stats.health <= 0) {
      this.finishWithDefeat();
      return;
    }

    // Respawn anclado al jugador (co-op) o a la vista (single-player, sin cambios).
    const camLeft = this.cameraSystem.getVisibleWorldLeft(this);
    const camWidth = this.cameraSystem.getVisibleWorldWidth(this);
    const desiredX = this.coop ? Math.max(48, player.x - 80) : camLeft + 92;
    const searchEnd = this.coop
      ? Math.min(this.level.worldWidth - 48, player.x + 320)
      : Math.min(this.level.worldWidth - 48, camLeft + camWidth * 0.45);
    const safePoint = this.findPitRespawnPoint(desiredX, searchEnd);
    player.setPosition(safePoint.x, safePoint.y);
    player.setVelocity(0, 0);
    if (slot === 0) this.pressureDamageCooldownMs = 1500;
    if (slot === 0) this.pressureCooldownSlot0 = 1500;
    else this.remotePressureCooldown[slot - 1] = 1500;
    this.time.delayedCall(250, () => {
      if (slot === 0) this.recoveringFromPit = false;
      else this.remoteRecoveringFromPit[slot - 1] = false;
    });
  }

  private findPitRespawnPoint(desiredX: number, searchEnd: number): { x: number; y: number } {
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
    const visibleWorldWidth = this.cameraSystem.getVisibleWorldWidth(this);
    const maxScrollX = Math.max(0, this.level.worldWidth - visibleWorldWidth);
    const safeScrollX = Phaser.Math.Clamp(safePointX - visibleWorldWidth * 0.32, 0, maxScrollX);
    this.pressureScrollX = safeScrollX;
    this.cameraSystem.setVisibleWorldLeft(this, safeScrollX);
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
    this.playSfx("game-over");
    this.activeCheckpoint = undefined;
    this.save.checkpointId = undefined;
    this.recordRunStatistics("defeat");
    gameSaveStore.save(this.save);
    this.allPlayers().forEach((player) => {
      player.markDefeated();
      (player.body as Phaser.Physics.Arcade.Body).enable = false;
    });
    if (this.isHost) this.coopLink?.finish("lost");
    this.time.delayedCall(620, () => {
      if (this.coop) {
        this.physics.pause();
        gameEvents.emit(EVENTS.SCREEN_CHANGED, "game-over");
      } else {
        this.scene.start("GameOverScene", { result: "defeat", restartLevelId: this.level.id });
      }
    });
  }

  // Bookkeeping de nivel completado, compartido entre host/single y el guest (que
  // lo ejecuta al recibir end("won") del host).
  private finalizeCompletion(): void {
    this.playSfx("level-complete");
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
      gameplayDurationSeconds: this.runTracker.durationSeconds,
      goldCollected: this.goldCollectedThisLevel,
      actionsPerMinute: this.runTracker.actionsPerMinute,
      achievementIds: [...this.unlockedAchievementsThisLevel],
      nextLevelId: nextLevel?.id,
      nextLevelName: nextLevel?.name,
      nextStageNumber: nextLevel?.stageNumber,
    });
    this.emitHud();
  }

  private completeLevel(): void {
    if (this.levelFinished) {
      return;
    }

    this.levelFinished = true;
    this.finalizeCompletion();
    if (this.isHost) this.coopLink?.finish("won");
    this.showLevelSummary();
  }

  private showLevelSummary(): void {
    this.physics.pause();
    gameEvents.emit(EVENTS.SCREEN_CHANGED, "level-transition");
    this.cameras.main.stopFollow();
  }

  private recordRunStatistics(result: RunResult): void {
    this.runTracker.record(this.save.statistics, result);
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
      this.showDamageFeedback(previousHealth);
      this.emitHud();
      this.finishWithDefeat();
    }
  }

  private emitHud(): void {
    if (this.isGuest) {
      this.emitGuestHud();
      return;
    }
    const powerCharges = this.getActivePowerCharges();
    const spinCooldownRemainingMs = this.player.getSpinCooldownRemaining(this.time.now);
    this.lastSpinCooldownStep = Math.ceil(spinCooldownRemainingMs / 100);
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
      spinCooldownRemainingMs,
    });
  }

  private updateSpinCooldownHud(): void {
    const remainingMs = this.player.getSpinCooldownRemaining(this.time.now);
    const cooldownStep = Math.ceil(remainingMs / 100);
    if (cooldownStep !== this.lastSpinCooldownStep) {
      if (this.lastSpinCooldownStep > 0 && cooldownStep === 0) {
        this.requestHaptic("ready");
      }
      this.emitHud();
    }
  }

  private playSfx(cue: SfxCue): void {
    gameEvents.emit(EVENTS.SFX_REQUESTED, { cue });
  }

  private requestHaptic(cue: "jump" | "attack" | "spin" | "damage" | "ready"): void {
    gameEvents.emit(EVENTS.HAPTIC_REQUESTED, { cue });
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

  // ======================= Capa de co-op online =======================

  private bindCoopNet(): void {
    this.coopLink?.bind({
      onRemoteEnd: (reason, slot) => this.handleRemoteEnd(reason, slot),
      onPeerLeft: () => this.endCoopToMenu(),
      onParticipantLeft: (slot) => this.handleParticipantDisconnected(slot),
      onParticipantRejoined: (slot) => this.handleParticipantRejoined(slot),
      onParticipantReconnectExpired: (slot) => this.handleParticipantReconnectExpired(slot),
      onStartNextLevel: (message) => {
        // El host encadeno el siguiente nivel: el guest lo sigue solo cuando su
        // propio nivel ya termino (evita reinicios a mitad de partida).
        if (!this.isGuest || !this.levelFinished) return;
        this.restartCoopScene(message.levelId, message.roster);
      },
      onRemoteCharges: (message) => {
        // Solo el host administra los contadores vivos de cada guest.
        if (!this.isHost) return;
        const charges = this.remoteCharges[message.slot - 1];
        if (!charges) return;
        charges.healingCharges += Math.max(0, message.healingDelta);
        charges.powerCharges += Math.max(0, message.powerDelta);
      },
    });
  }

  // Vuelta de la tienda en co-op (sin pausa): tomar del save fresco solo lo que
  // una compra cambia (ORO y cargas) sin reemplazar `this.save`, porque los
  // stats vivos del jugador comparten referencia con `this.save.player`. Si
  // compro un guest, el delta viaja al host que administra sus contadores.
  private syncCoopPurchases(): void {
    const fresh = gameSaveStore.load();
    this.save.player.coins = fresh.player.coins;
    this.save.characterPowerCharges = fresh.characterPowerCharges;
    const charges = this.save.characterPowerCharges[this.save.selectedCharacterId];
    const healing = charges?.healingCharges ?? 0;
    const power = charges?.powerCharges ?? 0;
    if (this.isGuest) {
      this.coopLink?.sendChargeDelta(
        Math.max(0, healing - this.coopChargeBaseline.healingCharges),
        Math.max(0, power - this.coopChargeBaseline.powerCharges),
      );
    }
    this.coopChargeBaseline = { healingCharges: healing, powerCharges: power };
    this.emitHud();
  }

  // Host: encadena el siguiente nivel para toda la sala reutilizando el mensaje
  // `start` (misma sala y canal); la sesion sobrevive al reinicio de escena.
  // El roster lleva las cargas vivas de la partida para que el proximo nivel
  // no las reinicie desde valores viejos.
  private startNextCoopLevel(nextLevelId: string): void {
    const ownCharges = this.getActivePowerCharges();
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
    this.scene.start("LevelScene", {
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

  private buildSnapshot(seq: number): LevelSnapshot {
    const hostCharges = this.getActivePowerCharges();
    const enemies: Array<[number, number, number, number]> = [];
    this.enemies.children.each((obj) => {
      const enemy = obj as BaseEnemy;
      const netId = enemy.getData("netId") as number | undefined;
      if (typeof netId === "number" && enemy.active) {
        enemies.push([netId, Math.round(enemy.x), Math.round(enemy.y), enemy.flipX ? 1 : 0]);
      }
      return true;
    });
    const platforms: Array<[number, number, number]> = [];
    this.movingPlatforms.children.each((obj) => {
      const go = obj as Phaser.GameObjects.GameObject;
      const netId = go.getData("netId") as number | undefined;
      const t = go as unknown as { x: number; y: number };
      if (typeof netId === "number") platforms.push([netId, Math.round(t.x), Math.round(t.y)]);
      return true;
    });
    const hazards: Array<[number, number, number]> = [];
    this.movingHazards.children.each((obj) => {
      const go = obj as Phaser.GameObjects.GameObject;
      const netId = go.getData("netId") as number | undefined;
      const t = go as unknown as { x: number; y: number };
      if (typeof netId === "number") hazards.push([netId, Math.round(t.x), Math.round(t.y)]);
      return true;
    });
    const coins: number[] = [];
    this.coins.children.each((obj) => {
      const coin = obj as Coin;
      const index = coin.getData("coinIndex") as number | undefined;
      if (typeof index === "number" && coin.active) coins.push(index);
      return true;
    });
    const hearts: number[] = [];
    this.healthPickups.children.each((obj) => {
      const heart = obj as Phaser.Physics.Arcade.Sprite;
      const index = heart.getData("heartIndex") as number | undefined;
      if (typeof index === "number" && heart.active) hearts.push(index);
      return true;
    });
    const projectiles: NetProjectile[] = [];
    this.powerProjectiles.children.each((obj) => {
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
      enemies,
      platforms,
      hazards,
      projectiles,
      coins,
      hearts,
      rewardBox: Boolean(this.rewardBox?.active),
      checkpointActive: this.activeCheckpoint?.id === this.level.checkpoint.id,
      pressureX: Math.round(this.coopPressureX),
      timeMs: Math.round(this.remainingTimeMs),
    };
  }

  private updateGuest(time: number, delta: number): void {
    void delta;
    const input = this.inputSystem.readFrame();
    if (input.pauseJustPressed) {
      this.handlePausePressed();
      return;
    }
    this.coopLink?.sendLocalInput(time, input);
    const snapshot = this.coopLink?.latestSnapshot;
    if (snapshot) {
      this.applySnapshot(snapshot);
      this.remainingTimeMs = snapshot.timeMs;
    }
    this.emitHud();
  }

  private applySnapshot(snap: LevelSnapshot): void {
    const s = 0.4;
    // players[] esta indexado por slot: se resuelve cada jugador por su slot y
    // NO por posicion en allPlayers(), que filtra a los que abandonaron y
    // desalinearia los estados (aplicaria el estado del que se fue al siguiente).
    snap.players.forEach((net, slot) => {
      const target = this.playerAtSlot(slot);
      if (target && net) applyNetPlayer(target, net, s);
    });
    this.projectilePuppets?.apply(snap.projectiles, s);

    // Deteccion de dano propio para el destello/sacudida local del guest, leido
    // en su slot dentro del snapshot.
    const self = snap.players[this.coopSelfSlot];
    if (self && Number.isFinite(this.guestPrevSelfHealth) && self.health < this.guestPrevSelfHealth) {
      // El guest no simula: este es su unico registro de dano recibido, y el
      // logro de nivel perfecto depende de que quede marcado.
      this.damageTakenThisLevel = true;
      gameEvents.emit(EVENTS.PLAYER_DAMAGED, { amount: this.guestPrevSelfHealth - self.health });
      this.playSfx("player-hit");
      this.cameras.main.shake(160, 0.009);
    }
    if (self) this.guestPrevSelfHealth = self.health;

    if (snap.enemies !== undefined) {
      const aliveEnemies = new Map<number, [number, number, number]>();
      for (const [id, x, y, flip] of snap.enemies) aliveEnemies.set(id, [x, y, flip]);
      this.enemies.children.each((obj) => {
        const enemy = obj as BaseEnemy;
        const netId = enemy.getData("netId") as number | undefined;
        if (typeof netId !== "number") return true;
        const target = aliveEnemies.get(netId);
        if (!target) {
          enemy.destroy();
          return true;
        }
        enemy.x = Phaser.Math.Linear(enemy.x, target[0], s);
        enemy.y = Phaser.Math.Linear(enemy.y, target[1], s);
        enemy.setFlipX(target[2] === 1);
        return true;
      });
    }

    if (snap.platforms !== undefined) this.applyNetTransforms(this.movingPlatforms, snap.platforms, s);
    if (snap.hazards !== undefined) this.applyNetTransforms(this.movingHazards, snap.hazards, s);

    if (snap.coins !== undefined) {
      const coinsPresent = new Set(snap.coins);
      this.coins.children.each((obj) => {
        const coin = obj as Coin;
        const index = coin.getData("coinIndex") as number | undefined;
        if (typeof index === "number" && coin.active && !coinsPresent.has(index)) {
          coin.disableBody(true, true);
        }
        return true;
      });
    }
    if (snap.hearts !== undefined) {
      const heartsPresent = new Set(snap.hearts);
      this.healthPickups.children.each((obj) => {
        const heart = obj as Phaser.Physics.Arcade.Sprite;
        const index = heart.getData("heartIndex") as number | undefined;
        if (typeof index === "number" && heart.active && !heartsPresent.has(index)) {
          heart.disableBody(true, true);
        }
        return true;
      });
    }

    if (this.rewardBox?.active && !snap.rewardBox) this.rewardBox.disableBody(true, true);
    if (snap.checkpointActive) this.checkpoint.setTint(0xffffff);
    this.pressureLine.x = snap.pressureX + this.pressureLine.width / 2;
  }

  private applyNetTransforms(
    group: Phaser.Physics.Arcade.Group,
    positions: Array<[number, number, number]>,
    smoothing: number,
  ): void {
    const byId = new Map<number, [number, number]>();
    for (const [id, x, y] of positions) byId.set(id, [x, y]);
    group.children.each((obj) => {
      const go = obj as Phaser.GameObjects.GameObject;
      const netId = go.getData("netId") as number | undefined;
      if (typeof netId !== "number") return true;
      const pos = byId.get(netId);
      if (pos) {
        const t = go as unknown as { x: number; y: number };
        t.x = Phaser.Math.Linear(t.x, pos[0], smoothing);
        t.y = Phaser.Math.Linear(t.y, pos[1], smoothing);
      }
      return true;
    });
  }

  private emitGuestHud(): void {
    const snap = this.coopLink?.latestSnapshot;
    const self = snap?.players[this.coopSelfSlot];
    const hud = {
      ...this.save.player,
      health: self?.health ?? this.save.player.health,
      maxHealth: self?.maxHealth ?? this.save.player.maxHealth,
      healingCharges: self?.healCharges ?? 0,
      powerCharges: self?.powerCharges ?? 0,
      stageNumber: this.level.stageNumber,
      timeRemaining: snap ? Math.ceil(snap.timeMs / 1000) : this.level.timeLimitSeconds,
      timeLimit: this.level.timeLimitSeconds,
      progressPercent: this.getGuestProgressPercent(self?.x ?? this.level.playerStart.x),
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
  }

  private getGuestProgressPercent(x: number): number {
    const startX = this.level.playerStart.x;
    const goalDistance = Math.max(1, this.level.goal.x - startX);
    const distance = Phaser.Math.Clamp(x - startX, 0, goalDistance);
    return Math.round((distance / goalDistance) * 100);
  }

  // Presion co-op: linea de mundo que avanza pero nunca sobrepasa al jugador mas
  // atrasado (margen fijo). Desacoplada de la camara, que es por dispositivo.
  private updateCoopPressure(delta: number): void {
    if (this.remotePlayers.length === 0) return;
    const trailingX = Math.min(...this.allPlayers().map((player) => player.x));
    const cap = trailingX - COOP_PRESSURE_MARGIN;
    const advanced = this.coopPressureX + this.level.autoScrollSpeed * (delta / 1000);
    this.coopPressureX = Math.max(0, Math.max(this.coopPressureX, Math.min(advanced, cap)));
    this.pressureLine.x = this.coopPressureX + this.pressureLine.width / 2;

    this.pressureCooldownSlot0 = Math.max(0, this.pressureCooldownSlot0 - delta);
    for (let i = 0; i < this.remotePressureCooldown.length; i += 1) {
      this.remotePressureCooldown[i] = Math.max(0, this.remotePressureCooldown[i] - delta);
    }
    this.forEachPlayer((player, slot) => this.applyCoopPressureDamage(player, slot));
  }

  private applyCoopPressureDamage(player: Player, slot: number): void {
    const body = player.body as Phaser.Physics.Arcade.Body;
    const lineRight = this.pressureLine.x + this.pressureLine.width / 2;
    if (body.left > lineRight) return;
    const cooldown = slot === 0 ? this.pressureCooldownSlot0 : this.remotePressureCooldown[slot - 1];
    if (cooldown > 0) return;
    this.damagePlayerSlot(player, slot, 1);
    if (slot === 0) this.pressureCooldownSlot0 = 1000;
    else this.remotePressureCooldown[slot - 1] = 1000;
  }

  private handleParticipantDisconnected(slot: number): void {
    const target = this.playerAtSlot(slot);
    if (!target) return;
    this.freezePuppet(target);
    target.setActive(false);
    target.setVisible(false);
  }

  private handleParticipantRejoined(slot: number): void {
    const target = this.playerAtSlot(slot);
    if (!target) return;
    target.setActive(true);
    target.setVisible(true);
    const body = target.body as Phaser.Physics.Arcade.Body;
    body.enable = this.isHost;
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

  private handleRemoteEnd(reason: "won" | "lost" | "left", slot?: number): void {
    if (reason === "won") {
      if (this.levelFinished) return;
      this.levelFinished = true;
      this.finalizeCompletion();
      this.showLevelSummary();
    } else if (reason === "lost") {
      if (this.levelFinished) return;
      this.levelFinished = true;
      this.allPlayers().forEach((player) => player.markDefeated());
      this.playSfx("game-over");
      this.time.delayedCall(620, () => {
        this.physics.pause();
        gameEvents.emit(EVENTS.SCREEN_CHANGED, "game-over");
      });
    } else {
      if (typeof slot === "number") {
        if (slot === this.coopSelfSlot) this.endCoopToMenu();
        else this.handleParticipantReconnectExpired(slot);
      } else {
        this.endCoopToMenu();
      }
    }
  }

  private endCoopToMenu(): void {
    if (!this.coopLink?.markEnded()) return;
    if (!this.levelFinished) {
      this.recordRunStatistics("abandoned");
      gameSaveStore.save(this.save);
    }
    this.scene.start("MainMenuScene");
  }
}
