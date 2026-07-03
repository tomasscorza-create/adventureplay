import Phaser from "phaser";
import { gameEvents } from "../../events/EventBus";
import { EVENTS } from "../../../shared/constants/events";
import type { BaseEnemy } from "../../entities/enemies/BaseEnemy";
import type { Player } from "../../entities/player/Player";

const SPIN_ATTACK_RADIUS = 128;

export class CombatSystem {
  meleeAttack(
    scene: Phaser.Scene,
    player: Player,
    enemies: Phaser.GameObjects.Group,
    onEnemyDefeated: (enemy: BaseEnemy) => void,
  ): void {
    if (!player.canMelee(scene.time.now)) {
      return;
    }

    player.markAttacking(scene.time.now);
    this.createSwordSlash(scene, player);

    const damagedEnemies = new Set<BaseEnemy>();
    const hitMoments = [0, 45, 95, 145];
    for (const delay of hitMoments) {
      scene.time.delayedCall(delay, () => {
        this.applyMeleeDamage(player, enemies, damagedEnemies, onEnemyDefeated);
      });
    }
  }

  spinAttack(
    scene: Phaser.Scene,
    player: Player,
    enemies: Phaser.GameObjects.Group,
    onEnemyDefeated: (enemy: BaseEnemy) => void,
  ): boolean {
    if (!player.canSpin(scene.time.now)) {
      return false;
    }

    player.markSpinning(scene.time.now);
    this.createSpinSlash(scene, player);

    const damagedEnemies = new Set<BaseEnemy>();
    const damage = Math.max(player.stats.meleeDamage, player.stats.rangedDamage);
    for (const delay of [55, 145, 235, 325]) {
      scene.time.delayedCall(delay, () => {
        this.applySpinDamage(
          player,
          enemies,
          damagedEnemies,
          damage,
          onEnemyDefeated,
        );
      });
    }

    return true;
  }

  private applySpinDamage(
    player: Player,
    enemies: Phaser.GameObjects.Group,
    damagedEnemies: Set<BaseEnemy>,
    damage: number,
    onEnemyDefeated: (enemy: BaseEnemy) => void,
  ): void {
    if (!player.active) {
      return;
    }

    const hitArea = new Phaser.Geom.Circle(player.x, player.y - 8, SPIN_ATTACK_RADIUS);
    for (const enemy of enemies.getChildren() as BaseEnemy[]) {
      if (
        !enemy.active
        || damagedEnemies.has(enemy)
        || !Phaser.Geom.Intersects.CircleToRectangle(hitArea, enemy.getBounds())
      ) {
        continue;
      }

      damagedEnemies.add(enemy);
      const defeated = enemy.takeDamage(damage);
      if (defeated) {
        onEnemyDefeated(enemy);
      } else {
        gameEvents.emit(EVENTS.SFX_REQUESTED, { cue: "enemy-hit" });
      }
    }
  }

  private createSpinSlash(scene: Phaser.Scene, player: Player): void {
    const effect = scene.add.container(player.x, player.y - 8).setDepth(26);
    const glow = scene.add.circle(0, 0, 66, 0x8cecff, 0.1)
      .setStrokeStyle(4, 0xfff0a8, 0.72);
    const innerRing = scene.add.circle(0, 0, 42, 0xffffff, 0)
      .setStrokeStyle(3, 0x9fffee, 0.86);
    const arcs = scene.add.graphics();
    arcs.lineStyle(9, 0xf7f4cf, 0.82);
    arcs.beginPath();
    arcs.arc(0, 0, 92, Phaser.Math.DegToRad(-32), Phaser.Math.DegToRad(118));
    arcs.strokePath();
    arcs.lineStyle(5, 0x72e8ff, 0.68);
    arcs.beginPath();
    arcs.arc(0, 0, 112, Phaser.Math.DegToRad(142), Phaser.Math.DegToRad(332));
    arcs.strokePath();
    effect.add([glow, innerRing, arcs]);

    for (let index = 0; index < 6; index += 1) {
      const angle = index * 60;
      const radians = Phaser.Math.DegToRad(angle);
      const sword = scene.add
        .image(Math.cos(radians) * 74, Math.sin(radians) * 74, "weapon-sword-1")
        .setScale(index === 0 ? 0.34 : 0.29)
        .setAngle(angle + 42)
        .setAlpha(index === 0 ? 0.96 : 0.34);
      effect.add(sword);
    }

    effect.setScale(0.72);
    scene.cameras.main.shake(150, 0.0035);
    scene.tweens.add({
      targets: effect,
      angle: 720,
      scale: 1.18,
      alpha: 0,
      duration: 410,
      ease: "Cubic.easeOut",
      onComplete: () => effect.destroy(true),
    });
  }

  private applyMeleeDamage(
    player: Player,
    enemies: Phaser.GameObjects.Group,
    damagedEnemies: Set<BaseEnemy>,
    onEnemyDefeated: (enemy: BaseEnemy) => void,
  ): void {
    if (!player.active) {
      return;
    }

    const hitbox = player.getMeleeHitbox();
    for (const enemy of enemies.getChildren() as BaseEnemy[]) {
      if (!enemy.active || damagedEnemies.has(enemy)) {
        continue;
      }

      if (!Phaser.Geom.Intersects.RectangleToRectangle(hitbox, enemy.getBounds())) {
        continue;
      }

      damagedEnemies.add(enemy);
      const defeated = enemy.takeDamage(player.stats.meleeDamage);
      if (defeated) {
        onEnemyDefeated(enemy);
      } else {
        gameEvents.emit(EVENTS.SFX_REQUESTED, { cue: "enemy-hit" });
      }
    }
  }

  private createSwordSlash(scene: Phaser.Scene, player: Player): void {
    const direction = player.facing;
    const slash = scene.add.graphics({ x: player.x, y: player.y - 10 });
    slash.setDepth(18);

    slash.fillStyle(0x9fffee, 0.24);
    slash.fillTriangle(direction * 20, -34, direction * 96, -6, direction * 28, 34);
    slash.lineStyle(7, 0xf7f4cf, 0.94);
    slash.lineBetween(direction * 20, -28, direction * 91, -4);
    slash.lineStyle(3, 0x8cecff, 0.82);
    slash.lineBetween(direction * 28, 25, direction * 78, -18);

    scene.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.22,
      scaleY: 0.82,
      duration: 170,
      ease: "Quad.easeOut",
      onComplete: () => slash.destroy(),
    });
  }
}
