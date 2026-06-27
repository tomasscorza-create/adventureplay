type AudioDestination = "music" | "sfx" | "ui";

interface AudioSettings {
  musicEnabled: boolean;
  soundEnabled: boolean;
}

interface ToneOptions {
  frequency: number;
  endFrequency?: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  destination?: AudioDestination;
  startTime?: number;
}

interface NoiseOptions {
  duration: number;
  volume?: number;
  destination?: AudioDestination;
  startTime?: number;
  filterType?: BiquadFilterType;
  filterFrequency?: number;
}

class GameAudioController {
  private readonly settingsKey = "adventureReignsAudioSettings";
  private context?: AudioContext;
  private masterGain?: GainNode;
  private musicGain?: GainNode;
  private sfxGain?: GainNode;
  private uiGain?: GainNode;
  private musicInterval?: number;
  private nextMusicTime = 0;
  private musicStep = 0;
  private settings: AudioSettings = this.loadSettings();
  private readonly melody = [392, 440, 523.25, 440, 349.23, 392, 493.88, 392];
  private readonly bass = [130.81, 146.83, 164.81, 146.83];

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  setMusicEnabled(enabled: boolean): AudioSettings {
    this.settings = { ...this.settings, musicEnabled: enabled };
    this.saveSettings();
    this.applySettings();

    if (enabled) {
      this.unlock();
    }

    return this.getSettings();
  }

  setSoundEnabled(enabled: boolean): AudioSettings {
    this.settings = { ...this.settings, soundEnabled: enabled };
    this.saveSettings();
    this.applySettings();
    return this.getSettings();
  }

  unlock(): void {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    if (this.settings.musicEnabled) {
      this.startMusic();
    }
  }

  startMusic(): void {
    const context = this.ensureContext();
    if (!context || !this.settings.musicEnabled || this.musicInterval !== undefined) {
      return;
    }

    this.nextMusicTime = context.currentTime + 0.08;
    this.scheduleMusic();
    this.musicInterval = window.setInterval(() => this.scheduleMusic(), 240);
  }

  playUiSelect(): void {
    this.unlock();
    const context = this.context;
    if (!context) {
      return;
    }

    const now = context.currentTime;
    this.playTone({ frequency: 660, endFrequency: 880, duration: 0.08, type: "sine", volume: 0.07, destination: "ui", startTime: now });
    this.playTone({ frequency: 990, duration: 0.06, type: "triangle", volume: 0.035, destination: "ui", startTime: now + 0.045 });
  }

  playJump(): void {
    this.unlock();
    this.playTone({ frequency: 220, endFrequency: 520, duration: 0.14, type: "triangle", volume: 0.12 });
  }

  playAttack(): void {
    this.unlock();
    const now = this.context?.currentTime ?? 0;
    this.playNoise({ duration: 0.09, volume: 0.09, filterType: "highpass", filterFrequency: 1300, startTime: now });
    this.playTone({ frequency: 760, endFrequency: 360, duration: 0.1, type: "sawtooth", volume: 0.045, startTime: now });
  }

  playShoot(): void {
    this.unlock();
    this.playTone({ frequency: 520, endFrequency: 940, duration: 0.09, type: "square", volume: 0.045 });
  }

  playHealingPower(): void {
    this.unlock();
    const now = this.context?.currentTime ?? 0;
    [392, 523.25, 659.25, 783.99].forEach((frequency, index) => {
      this.playTone({
        frequency,
        duration: 0.2,
        type: "sine",
        volume: 0.055,
        startTime: now + index * 0.055,
      });
    });
  }

  playLethalPower(): void {
    this.unlock();
    const now = this.context?.currentTime ?? 0;
    this.playTone({ frequency: 180, endFrequency: 980, duration: 0.22, type: "sawtooth", volume: 0.075, startTime: now });
    this.playTone({ frequency: 620, endFrequency: 1240, duration: 0.18, type: "square", volume: 0.045, startTime: now + 0.04 });
    this.playNoise({ duration: 0.16, volume: 0.045, filterType: "highpass", filterFrequency: 1400, startTime: now + 0.03 });
  }

  playEnemyHit(): void {
    this.unlock();
    const now = this.context?.currentTime ?? 0;
    this.playTone({ frequency: 150, endFrequency: 92, duration: 0.1, type: "triangle", volume: 0.09, startTime: now });
    this.playNoise({ duration: 0.08, volume: 0.055, filterType: "bandpass", filterFrequency: 620, startTime: now });
  }

  playEnemyDefeat(): void {
    this.unlock();
    const now = this.context?.currentTime ?? 0;
    this.playNoise({ duration: 0.16, volume: 0.08, filterType: "bandpass", filterFrequency: 900, startTime: now });
    this.playTone({ frequency: 261.63, duration: 0.13, type: "triangle", volume: 0.08, startTime: now });
    this.playTone({ frequency: 392, duration: 0.16, type: "triangle", volume: 0.06, startTime: now + 0.045 });
    this.playTone({ frequency: 523.25, duration: 0.18, type: "sine", volume: 0.05, startTime: now + 0.09 });
  }

  playPlayerHit(): void {
    this.unlock();
    const now = this.context?.currentTime ?? 0;
    this.playTone({ frequency: 180, endFrequency: 72, duration: 0.18, type: "sawtooth", volume: 0.1, startTime: now });
    this.playNoise({ duration: 0.12, volume: 0.06, filterType: "lowpass", filterFrequency: 700, startTime: now });
  }

  playCollect(): void {
    this.unlock();
    const now = this.context?.currentTime ?? 0;
    this.playTone({ frequency: 880, duration: 0.07, type: "sine", volume: 0.05, startTime: now });
    this.playTone({ frequency: 1174.66, duration: 0.09, type: "sine", volume: 0.04, startTime: now + 0.055 });
  }

  playLevelComplete(): void {
    this.unlock();
    const now = this.context?.currentTime ?? 0;
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      this.playTone({
        frequency,
        duration: 0.22,
        type: "triangle",
        volume: 0.065,
        startTime: now + index * 0.105,
      });
    });
  }

  private ensureContext(): AudioContext | undefined {
    if (this.context || typeof window === "undefined") {
      return this.context;
    }

    const audioWindow = window as Window &
      typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
      };
    const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) {
      return undefined;
    }

    this.context = new AudioContextConstructor();
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.uiGain = this.context.createGain();

    this.masterGain.gain.value = 0.72;
    this.applySettings();

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.uiGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);

    return this.context;
  }

  private scheduleMusic(): void {
    const context = this.context;
    if (!context || !this.musicGain || !this.settings.musicEnabled) {
      return;
    }

    const lookAhead = context.currentTime + 1.4;
    while (this.nextMusicTime < lookAhead) {
      const step = this.musicStep % this.melody.length;
      const frequency = this.melody[step];
      const bassFrequency = this.bass[Math.floor(step / 2) % this.bass.length];
      const isStrongBeat = step % 4 === 0;

      this.playTone({
        frequency,
        duration: 0.42,
        type: "sine",
        volume: isStrongBeat ? 0.052 : 0.038,
        destination: "music",
        startTime: this.nextMusicTime,
      });

      if (step % 2 === 0) {
        this.playTone({
          frequency: bassFrequency,
          duration: 0.82,
          type: "triangle",
          volume: 0.035,
          destination: "music",
          startTime: this.nextMusicTime,
        });
      }

      this.nextMusicTime += 0.48;
      this.musicStep += 1;
    }
  }

  private playTone(options: ToneOptions): void {
    const context = this.ensureContext();
    const destination = this.getDestination(options.destination ?? "sfx");
    if (!context || !destination) {
      return;
    }

    const startTime = options.startTime ?? context.currentTime;
    const duration = options.duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(options.frequency, startTime);
    if (options.endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), startTime + duration);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(options.volume ?? 0.08, startTime + Math.min(0.025, duration * 0.35));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  private playNoise(options: NoiseOptions): void {
    const context = this.ensureContext();
    const destination = this.getDestination(options.destination ?? "sfx");
    if (!context || !destination) {
      return;
    }

    const startTime = options.startTime ?? context.currentTime;
    const sampleCount = Math.max(1, Math.floor(context.sampleRate * options.duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = buffer;
    filter.type = options.filterType ?? "bandpass";
    filter.frequency.setValueAtTime(options.filterFrequency ?? 900, startTime);
    gain.gain.setValueAtTime(options.volume ?? 0.06, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + options.duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(startTime);
    source.stop(startTime + options.duration + 0.02);
  }

  private getDestination(destination: AudioDestination): GainNode | undefined {
    if (destination === "music") {
      return this.musicGain;
    }

    if (destination === "ui") {
      return this.uiGain;
    }

    return this.sfxGain;
  }

  private applySettings(): void {
    if (this.musicGain) {
      this.musicGain.gain.value = this.settings.musicEnabled ? 0.18 : 0;
    }

    if (this.sfxGain) {
      this.sfxGain.gain.value = this.settings.soundEnabled ? 0.34 : 0;
    }

    if (this.uiGain) {
      this.uiGain.gain.value = this.settings.soundEnabled ? 0.16 : 0;
    }
  }

  private loadSettings(): AudioSettings {
    if (typeof window === "undefined") {
      return { musicEnabled: true, soundEnabled: true };
    }

    try {
      const rawSettings = window.localStorage.getItem(this.settingsKey);
      if (!rawSettings) {
        return { musicEnabled: true, soundEnabled: true };
      }

      const parsed = JSON.parse(rawSettings) as Partial<AudioSettings>;
      return {
        musicEnabled: parsed.musicEnabled !== false,
        soundEnabled: parsed.soundEnabled !== false,
      };
    } catch {
      return { musicEnabled: true, soundEnabled: true };
    }
  }

  private saveSettings(): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
  }
}

export const gameAudio = new GameAudioController();
