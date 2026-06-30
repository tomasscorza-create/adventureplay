import Phaser from "phaser";
import {
  GAME_HEIGHT,
  MOBILE_GAMEPLAY_CAMERA_ZOOM,
  MOBILE_GAMEPLAY_QUERY,
} from "../../../shared/constants/game";

export class CameraSystem {
  setBounds(scene: Phaser.Scene, worldWidth: number): void {
    scene.cameras.main.setBounds(0, 0, worldWidth, GAME_HEIGHT);
  }

  bindResponsiveZoom(scene: Phaser.Scene): () => void {
    const mediaQuery = window.matchMedia(MOBILE_GAMEPLAY_QUERY);
    const applyZoom = () => {
      scene.cameras.main.setZoom(
        mediaQuery.matches ? MOBILE_GAMEPLAY_CAMERA_ZOOM : 1,
      );
    };

    applyZoom();
    mediaQuery.addEventListener("change", applyZoom);
    window.addEventListener("resize", applyZoom);
    return () => {
      mediaQuery.removeEventListener("change", applyZoom);
      window.removeEventListener("resize", applyZoom);
    };
  }

  getVisibleWorldWidth(scene: Phaser.Scene): number {
    const camera = scene.cameras.main;
    return camera.width / camera.zoom;
  }

  follow(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, worldWidth: number): void {
    this.setBounds(scene, worldWidth);
    scene.cameras.main.startFollow(target, true, 0.08, 0.08);
  }
}
