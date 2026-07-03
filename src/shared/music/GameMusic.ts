import { musicTracks, type MusicTrackId } from "../../game/data/music";

const DEFAULT_CROSSFADE_MS = 2_800;
const TOGGLE_FADE_MS = 600;

class GameMusicController {
  private readonly settingsKey = "adventurePlayMusicEnabled";
  private readonly volumeKey = "adventurePlayMusicVolume";
  private readonly layers = new Set<HTMLAudioElement>();
  private readonly layerMixVolumes = new Map<HTMLAudioElement, number>();
  private activeTrackId?: MusicTrackId;
  private desiredTrackId?: MusicTrackId;
  private pendingTrackId?: MusicTrackId;
  private transitionId = 0;
  private unlockInstalled = false;
  private enabled = this.loadEnabled();
  private volumePercent = this.loadVolume();

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volumePercent;
  }

  setVolume(volume: number): number {
    this.volumePercent = this.normalizeVolume(volume);
    this.saveVolume();
    this.layers.forEach((layer) => this.applyLayerVolume(layer));
    return this.volumePercent;
  }

  setEnabled(enabled: boolean): boolean {
    this.enabled = enabled;
    this.saveEnabled();

    if (!enabled) {
      this.fadeOutLayers(TOGGLE_FADE_MS);
      return this.enabled;
    }

    if (this.desiredTrackId) {
      const activeLayer = this.findLayer(this.desiredTrackId);
      if (activeLayer) {
        this.crossfadeTo(activeLayer, TOGGLE_FADE_MS);
      } else {
        this.play(this.desiredTrackId, TOGGLE_FADE_MS);
      }
    }

    return this.enabled;
  }

  play(trackId: MusicTrackId, crossfadeMs = DEFAULT_CROSSFADE_MS): void {
    this.desiredTrackId = trackId;
    if (!this.enabled || typeof Audio === "undefined") {
      return;
    }

    const activeLayer = this.findLayer(trackId);
    if (this.activeTrackId === trackId && activeLayer && !activeLayer.paused) {
      return;
    }

    if (this.pendingTrackId === trackId) {
      return;
    }

    const track = musicTracks[trackId];
    const nextLayer = new Audio(track.source);
    nextLayer.dataset.musicTrackId = trackId;
    nextLayer.loop = true;
    nextLayer.preload = "auto";
    nextLayer.volume = 0;
    this.layerMixVolumes.set(nextLayer, 0);
    this.pendingTrackId = trackId;

    void nextLayer.play()
      .then(() => {
        if (!this.enabled || this.desiredTrackId !== trackId) {
          nextLayer.pause();
          this.layerMixVolumes.delete(nextLayer);
          return;
        }

        this.pendingTrackId = undefined;
        this.activeTrackId = trackId;
        this.layers.add(nextLayer);
        this.crossfadeTo(nextLayer, crossfadeMs);
      })
      .catch(() => {
        nextLayer.pause();
        this.layerMixVolumes.delete(nextLayer);
        if (this.pendingTrackId === trackId) {
          this.pendingTrackId = undefined;
        }
        this.installUnlockRetry();
      });
  }

  stop(fadeMs = TOGGLE_FADE_MS): void {
    this.desiredTrackId = undefined;
    this.pendingTrackId = undefined;
    this.fadeOutLayers(fadeMs);
  }

  private crossfadeTo(nextLayer: HTMLAudioElement, durationMs: number): void {
    const transitionId = ++this.transitionId;
    const layers = [...this.layers];
    const startingVolumes = new Map(
      layers.map((layer) => [layer, this.layerMixVolumes.get(layer) ?? 0]),
    );
    const trackId = nextLayer.dataset.musicTrackId as MusicTrackId;
    const targetVolume = musicTracks[trackId].volume;
    const startedAt = performance.now();

    const update = (now: number) => {
      if (transitionId !== this.transitionId) {
        return;
      }

      const progress = Math.min(1, (now - startedAt) / Math.max(1, durationMs));
      const eased = 0.5 - Math.cos(Math.PI * progress) / 2;

      layers.forEach((layer) => {
        const startVolume = startingVolumes.get(layer) ?? 0;
        const mixVolume = layer === nextLayer
          ? startVolume + (targetVolume - startVolume) * eased
          : startVolume * (1 - eased);
        this.layerMixVolumes.set(layer, mixVolume);
        this.applyLayerVolume(layer);
      });

      if (progress < 1) {
        requestAnimationFrame(update);
        return;
      }

      layers.forEach((layer) => {
        if (layer !== nextLayer) {
          layer.pause();
          this.layers.delete(layer);
          this.layerMixVolumes.delete(layer);
        }
      });
    };

    requestAnimationFrame(update);
  }

  private fadeOutLayers(durationMs: number): void {
    const transitionId = ++this.transitionId;
    const layers = [...this.layers];
    const startingVolumes = new Map(
      layers.map((layer) => [layer, this.layerMixVolumes.get(layer) ?? 0]),
    );
    const startedAt = performance.now();

    const update = (now: number) => {
      if (transitionId !== this.transitionId) {
        return;
      }

      const progress = Math.min(1, (now - startedAt) / Math.max(1, durationMs));
      const eased = 0.5 - Math.cos(Math.PI * progress) / 2;

      layers.forEach((layer) => {
        const mixVolume = (startingVolumes.get(layer) ?? 0) * (1 - eased);
        this.layerMixVolumes.set(layer, mixVolume);
        this.applyLayerVolume(layer);
      });

      if (progress < 1) {
        requestAnimationFrame(update);
        return;
      }

      layers.forEach((layer) => {
        layer.pause();
        this.layers.delete(layer);
        this.layerMixVolumes.delete(layer);
      });
      this.activeTrackId = undefined;
    };

    requestAnimationFrame(update);
  }

  private findLayer(trackId: MusicTrackId): HTMLAudioElement | undefined {
    return [...this.layers].find((layer) => layer.dataset.musicTrackId === trackId);
  }

  private applyLayerVolume(layer: HTMLAudioElement): void {
    const mixVolume = this.layerMixVolumes.get(layer) ?? 0;
    layer.volume = Math.min(1, Math.max(0, mixVolume * (this.volumePercent / 100)));
  }

  private installUnlockRetry(): void {
    if (this.unlockInstalled || typeof window === "undefined") {
      return;
    }

    this.unlockInstalled = true;
    const retry = () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      this.unlockInstalled = false;
      if (this.desiredTrackId && this.enabled) {
        this.play(this.desiredTrackId, TOGGLE_FADE_MS);
      }
    };

    window.addEventListener("pointerdown", retry, { once: true });
    window.addEventListener("keydown", retry, { once: true });
  }

  private loadEnabled(): boolean {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(this.settingsKey) !== "false";
  }

  private saveEnabled(): void {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(this.settingsKey, String(this.enabled));
    }
  }

  private loadVolume(): number {
    if (typeof window === "undefined") {
      return 50;
    }

    return this.normalizeVolume(Number(window.localStorage.getItem(this.volumeKey) ?? 50));
  }

  private saveVolume(): void {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(this.volumeKey, String(this.volumePercent));
    }
  }

  private normalizeVolume(volume: number): number {
    return Number.isFinite(volume) ? Math.round(Math.min(100, Math.max(0, volume))) : 50;
  }
}

export const gameMusic = new GameMusicController();
