import { describe, expect, it } from "vitest";
import type { SaveData } from "../../../shared/types/game";
import type { AsyncSaveAdapter } from "./SaveAdapter";
import { createDefaultSave, normalizeSaveData } from "./SaveDefaults";
import { GameSaveStore } from "./GameSaveStore";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

class ControlledSaveAdapter implements AsyncSaveAdapter {
  remoteSave: SaveData;
  private nextLoad?: Deferred<SaveData>;
  private nextSaveGate?: {
    started: Deferred<void>;
    release: Deferred<void>;
  };
  private nextSaveError?: Error;

  constructor(save = createDefaultSave()) {
    this.remoteSave = structuredClone(save);
  }

  deferNextLoad(): Deferred<SaveData> {
    this.nextLoad = createDeferred<SaveData>();
    return this.nextLoad;
  }

  blockNextSave(): { started: Deferred<void>; release: Deferred<void> } {
    this.nextSaveGate = {
      started: createDeferred<void>(),
      release: createDeferred<void>(),
    };
    return this.nextSaveGate;
  }

  failNextSave(error: Error): void {
    this.nextSaveError = error;
  }

  async load(): Promise<SaveData> {
    if (this.nextLoad) {
      const deferred = this.nextLoad;
      this.nextLoad = undefined;
      return structuredClone(await deferred.promise);
    }

    return structuredClone(this.remoteSave);
  }

  async save(data: SaveData): Promise<void> {
    const snapshot = structuredClone(data);

    if (this.nextSaveError) {
      const error = this.nextSaveError;
      this.nextSaveError = undefined;
      throw error;
    }

    if (this.nextSaveGate) {
      const gate = this.nextSaveGate;
      this.nextSaveGate = undefined;
      gate.started.resolve();
      await gate.release.promise;
    }

    this.remoteSave = snapshot;
  }

  async reset(): Promise<SaveData> {
    this.remoteSave = createDefaultSave();
    return structuredClone(this.remoteSave);
  }
}

describe("GameSaveStore persistence regressions", () => {
  it.fails("preserves local progress when a session refresh reconnects during a pending save", async () => {
    const remoteSave = createDefaultSave();
    remoteSave.player.coins = 10;
    const adapter = new ControlledSaveAdapter(remoteSave);
    const store = new GameSaveStore();
    await store.connect(adapter);

    const localSave = store.load();
    localSave.player.coins = 50;
    const pendingSave = adapter.blockNextSave();
    store.save(localSave);
    await pendingSave.started.promise;

    await store.connect(adapter);
    pendingSave.release.resolve();
    await store.flush();

    expect(store.load().player.coins).toBe(50);
  });

  it.fails("keeps the store disconnected when an earlier remote load resolves after sign-out", async () => {
    const adapter = new ControlledSaveAdapter();
    const delayedLoad = adapter.deferNextLoad();
    const store = new GameSaveStore();
    const connecting = store.connect(adapter);

    store.disconnect();
    const staleSave = createDefaultSave();
    staleSave.player.coins = 75;
    delayedLoad.resolve(staleSave);
    await connecting;

    expect(store.load()).toEqual(createDefaultSave());
  });

  it.fails("rejects flush when the latest remote write failed", async () => {
    const adapter = new ControlledSaveAdapter();
    const store = new GameSaveStore();
    await store.connect(adapter);

    adapter.failNextSave(new Error("network unavailable"));
    const changedSave = store.load();
    changedSave.player.coins = 25;
    store.save(changedSave);

    await expect(store.flush()).rejects.toThrow("network unavailable");
  });
});

describe("normalizeSaveData regression coverage", () => {
  it.fails("repairs malformed runtime values from remote JSON", () => {
    const defaults = createDefaultSave();
    const malformedSave = {
      ...defaults,
      player: {
        ...defaults.player,
        health: "invalid",
        coins: "invalid",
        inventory: null,
      },
      unlockedLevels: ["meadowOutpost", null, 42],
    } as unknown as Partial<SaveData>;

    const normalized = normalizeSaveData(malformedSave);

    expect(Number.isFinite(normalized.player.health)).toBe(true);
    expect(Number.isFinite(normalized.player.coins)).toBe(true);
    expect(Array.isArray(normalized.player.inventory)).toBe(true);
    expect(normalized.unlockedLevels.every((levelId) => typeof levelId === "string")).toBe(true);
  });
});
