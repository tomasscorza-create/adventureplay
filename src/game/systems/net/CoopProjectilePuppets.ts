import Phaser from "phaser";
import type { NetProjectile } from "./coopMessages";

// Representacion visual de los proyectiles autoritativos del host en la escena
// del guest: sprites sin fisica creados/interpolados/destruidos segun el
// snapshot. Cuando un netId desaparece (impacto o fuera de pantalla) se muestra
// un destello breve en su ultima posicion conocida.
export class CoopProjectilePuppets {
  private readonly sprites = new Map<number, Phaser.GameObjects.Sprite>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onSpawn?: () => void,
  ) {}

  apply(entries: NetProjectile[]): void {
    const alive = new Set<number>();
    for (const [netId, x, y, direction] of entries) {
      alive.add(netId);
      const existing = this.sprites.get(netId);
      if (existing) {
        existing.x = x;
        existing.y = y;
        continue;
      }
      const sprite = this.scene.add
        .sprite(x, y, "power-projectile")
        .setDepth(17)
        .setFlipX(direction < 0)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.sprites.set(netId, sprite);
      this.onSpawn?.();
    }

    for (const [netId, sprite] of this.sprites) {
      if (alive.has(netId)) continue;
      this.sprites.delete(netId);
      this.flashAt(sprite.x, sprite.y);
      sprite.destroy();
    }
  }

  private flashAt(x: number, y: number): void {
    const flash = this.scene.add
      .circle(x, y, 9, 0xffe9a8, 0.9)
      .setDepth(18)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: flash,
      scale: 3,
      alpha: 0,
      duration: 220,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy(),
    });
  }
}
