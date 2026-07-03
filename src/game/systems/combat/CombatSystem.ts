import Phaser from "phaser";
import { gameEvents } from "../../events/EventBus";
import { EVENTS } from "../../../shared/constants/events";
import type { BaseEnemy } from "../../entities/enemies/BaseEnemy";
import type { Player } from "../../entities/player/Player";
import { Projectile } from "../../entities/projectiles/Projectile";

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

  shoot(scene: Phaser.Scene, player: Player, projectiles: Phaser.Physics.Arcade.Group): void {
    if (!player.canShoot(scene.time.now)) {
      return;
    }

    player.markShooting(scene.time.now);
    const projectile = new Projectile(
      scene,
      player.x + player.facing * 24,
      player.y - 4,
      player.facing,
      player.stats.rangedDamage,
    );
    projectiles.add(projectile);
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
