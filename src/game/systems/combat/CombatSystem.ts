import Phaser from "phaser";
import type { BaseEnemy } from "../../entities/enemies/BaseEnemy";
import type { Player } from "../../entities/player/Player";
import { Projectile } from "../../entities/projectiles/Projectile";

export class CombatSystem {
  meleeAttack(player: Player, enemies: Phaser.GameObjects.Group): BaseEnemy[] {
    player.markAttacking();
    const hitbox = player.getMeleeHitbox();
    const enemiesHit: BaseEnemy[] = [];

    for (const enemy of enemies.getChildren() as BaseEnemy[]) {
      if (!enemy.active) {
        continue;
      }

      const enemyBounds = enemy.getBounds();
      if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, enemyBounds)) {
        enemy.takeDamage(player.stats.meleeDamage);
        enemiesHit.push(enemy);
      }
    }

    return enemiesHit;
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
}
