import Phaser from "phaser";
import {
  GAME_HEIGHT,
  MOBILE_GAMEPLAY_CAMERA_ZOOM,
  MOBILE_GAMEPLAY_FLOOR_EXTENSION,
  MOBILE_GAMEPLAY_QUERY,
  MOBILE_GAMEPLAY_VISIBLE_TOP,
} from "../../../shared/constants/game";
import {
  getMobileRenderScale,
  mobileGameplaySettingsStore,
} from "../input/MobileGameplaySettings";

export class CameraSystem {
  setBounds(scene: Phaser.Scene, worldWidth: number): void {
    scene.cameras.main.setBounds(0, 0, worldWidth, GAME_HEIGHT);
  }

  bindResponsiveZoom(scene: Phaser.Scene, worldWidth: number): () => void {
    const mediaQuery = window.matchMedia(MOBILE_GAMEPLAY_QUERY);
    const applyZoom = () => {
      const camera = scene.cameras.main;
      const visibleWorldLeft = this.getVisibleWorldLeft(scene);
      const mobileGameplay = mediaQuery.matches;
      const renderScale = mobileGameplay
        ? getMobileRenderScale(mobileGameplaySettingsStore.getSettings().performanceMode)
        : 1;
      camera.setZoom(
        mobileGameplay
          ? MOBILE_GAMEPLAY_CAMERA_ZOOM * renderScale
          : 1,
      );
      camera.setBounds(
        0,
        0,
        worldWidth,
        GAME_HEIGHT + (mobileGameplay ? MOBILE_GAMEPLAY_FLOOR_EXTENSION : 0),
      );
      this.setVisibleWorldLeft(scene, visibleWorldLeft);
      this.setVisibleWorldTop(scene, mobileGameplay ? MOBILE_GAMEPLAY_VISIBLE_TOP : 0);
    };

    applyZoom();
    mediaQuery.addEventListener("change", applyZoom);
    window.addEventListener("resize", applyZoom);
    const unbindSettings = mobileGameplaySettingsStore.onChange(applyZoom);
    return () => {
      mediaQuery.removeEventListener("change", applyZoom);
      window.removeEventListener("resize", applyZoom);
      unbindSettings();
    };
  }

  getVisibleWorldWidth(scene: Phaser.Scene): number {
    const camera = scene.cameras.main;
    return camera.width / camera.zoom;
  }

  getVisibleWorldLeft(scene: Phaser.Scene): number {
    const camera = scene.cameras.main;
    return camera.scrollX + (camera.width - camera.width / camera.zoom) * 0.5;
  }

  setVisibleWorldLeft(scene: Phaser.Scene, worldX: number): void {
    const camera = scene.cameras.main;
    const zoomOffset = (camera.width - camera.width / camera.zoom) * 0.5;
    camera.scrollX = camera.clampX(worldX - zoomOffset);
  }

  setVisibleWorldTop(scene: Phaser.Scene, worldY: number): void {
    const camera = scene.cameras.main;
    const zoomOffset = (camera.height - camera.height / camera.zoom) * 0.5;
    camera.scrollY = camera.clampY(worldY - zoomOffset);
  }

  follow(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, worldWidth: number): void {
    this.setBounds(scene, worldWidth);
    scene.cameras.main.startFollow(target, true, 0.08, 0.08);
  }
}
