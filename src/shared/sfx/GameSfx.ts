import { sfxDefinitions, type SfxCue } from "../../game/data/sfx";

class GameSfxController {
  private readonly settingsKey = "adventurePlaySoundEnabled";
  private readonly volumeKey = "adventurePlaySoundVolume";
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly loading = new Map<string, Promise<AudioBuffer | undefined>>();
  private readonly lastPlayedAt = new Map<SfxCue, number>();
  private readonly activeSources = new Map<SfxCue, Set<AudioBufferSourceNode>>();
  private readonly cueGenerations = new Map<SfxCue, number>();
  private context?: AudioContext;
  private masterGain?: GainNode;
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
    this.applyMasterVolume();
    return this.volumePercent;
  }

  setEnabled(enabled: boolean): boolean {
    this.enabled = enabled;
    this.saveEnabled();
    if (this.masterGain) {
      this.applyMasterVolume();
    }
    return this.enabled;
  }

  preload(): void {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    const sources = new Set(
      Object.values(sfxDefinitions).flatMap((definition) => definition.sources),
    );
    sources.forEach((source) => {
      void this.loadSource(source);
    });
  }

  play(cue: SfxCue): void {
    if (!this.enabled) {
      return;
    }

    const definition = sfxDefinitions[cue];
    const cueGeneration = this.cueGenerations.get(cue) ?? 0;
    const now = performance.now();
    const lastPlayedAt = this.lastPlayedAt.get(cue) ?? Number.NEGATIVE_INFINITY;
    if (definition.cooldownMs && now - lastPlayedAt < definition.cooldownMs) {
      return;
    }
    this.lastPlayedAt.set(cue, now);

    const context = this.ensureContext();
    if (!context || !this.masterGain) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    const sourceUrl = definition.sources[Math.floor(Math.random() * definition.sources.length)];
    const loadedBuffer = this.buffers.get(sourceUrl);
    if (loadedBuffer) {
      this.playBuffer(cue, loadedBuffer, definition.volume, definition.playbackRate);
      return;
    }

    void this.loadSource(sourceUrl).then((buffer) => {
      if (
        buffer
        && this.enabled
        && (this.cueGenerations.get(cue) ?? 0) === cueGeneration
      ) {
        this.playBuffer(cue, buffer, definition.volume, definition.playbackRate);
      }
    });
  }

  stop(cue: SfxCue): void {
    this.cueGenerations.set(cue, (this.cueGenerations.get(cue) ?? 0) + 1);
    const sources = this.activeSources.get(cue);
    if (!sources) {
      return;
    }

    sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // The source may already have ended between lookup and cancellation.
      }
    });
    this.activeSources.delete(cue);
  }

  private ensureContext(): AudioContext | undefined {
    if (this.context || typeof window === "undefined") {
      return this.context;
    }

    const audioWindow = window as Window & typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) {
      return undefined;
    }

    this.context = new AudioContextConstructor();
    this.masterGain = this.context.createGain();
    this.applyMasterVolume();
    this.masterGain.connect(this.context.destination);
    return this.context;
  }

  private loadSource(sourceUrl: string): Promise<AudioBuffer | undefined> {
    const loaded = this.buffers.get(sourceUrl);
    if (loaded) {
      return Promise.resolve(loaded);
    }

    const pending = this.loading.get(sourceUrl);
    if (pending) {
      return pending;
    }

    const context = this.ensureContext();
    if (!context) {
      return Promise.resolve(undefined);
    }

    const request = fetch(sourceUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`No se pudo cargar ${sourceUrl}`);
        }
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        this.buffers.set(sourceUrl, buffer);
        this.loading.delete(sourceUrl);
        return buffer;
      })
      .catch(() => {
        this.loading.delete(sourceUrl);
        return undefined;
      });

    this.loading.set(sourceUrl, request);
    return request;
  }

  private playBuffer(
    cue: SfxCue,
    buffer: AudioBuffer,
    volume: number,
    playbackRate?: readonly [number, number],
  ): void {
    const context = this.context;
    const destination = this.masterGain;
    if (!context || !destination) {
      return;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    if (playbackRate) {
      source.playbackRate.value = playbackRate[0]
        + Math.random() * (playbackRate[1] - playbackRate[0]);
    }
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(destination);
    const cueSources = this.activeSources.get(cue) ?? new Set<AudioBufferSourceNode>();
    cueSources.add(source);
    this.activeSources.set(cue, cueSources);
    source.addEventListener("ended", () => {
      cueSources.delete(source);
      if (cueSources.size === 0 && this.activeSources.get(cue) === cueSources) {
        this.activeSources.delete(cue);
      }
      source.disconnect();
      gain.disconnect();
    }, { once: true });
    source.start();
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
      return 75;
    }
    return this.normalizeVolume(Number(window.localStorage.getItem(this.volumeKey) ?? 75));
  }

  private saveVolume(): void {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(this.volumeKey, String(this.volumePercent));
    }
  }

  private applyMasterVolume(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this.enabled ? this.volumePercent / 100 : 0;
    }
  }

  private normalizeVolume(volume: number): number {
    return Number.isFinite(volume) ? Math.round(Math.min(100, Math.max(0, volume))) : 75;
  }
}

export const gameSfx = new GameSfxController();
