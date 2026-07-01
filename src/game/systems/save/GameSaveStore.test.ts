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
  private readonly saveGates: Array<{
    started: Deferred<void>;
    release: Deferred<void>;
  }> = [];
  private nextSaveError?: Error;

  constructor(save = createDefaultSave()) {
    this.remoteSave = structuredClone(save);
  }

  deferNextLoad(): Deferred<SaveData> {
    this.nextLoad = createDeferred<SaveData>();
    return this.nextLoad;
  }

  blockNextSave(): { started: Deferred<void>; release: Deferred<void> } {
    const gate = {
      started: createDeferred<void>(),
      release: createDeferred<void>(),
    };
    this.saveGates.push(gate);
    return gate;
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

    const gate = this.saveGates.shift();
    if (gate) {
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
  it("preserves local progress when a session refresh reconnects during a pending save", async () => {
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

  it("keeps the store disconnected when an earlier remote load resolves after sign-out", async () => {
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

  it("shares one load between concurrent connections for the same user", async () => {
    const adapter = new ControlledSaveAdapter();
    const delayedLoad = adapter.deferNextLoad();
    const store = new GameSaveStore();
    const firstConnection = store.connect(adapter, "user-a");
    const secondConnection = store.connect(adapter, "user-a");

    const remoteSave = createDefaultSave();
    remoteSave.player.coins = 40;
    delayedLoad.resolve(remoteSave);

    const [firstSave, secondSave] = await Promise.all([firstConnection, secondConnection]);
    expect(firstSave.player.coins).toBe(40);
    expect(secondSave.player.coins).toBe(40);
  });

  it("ignores a stale load after connecting a different user", async () => {
    const firstAdapter = new ControlledSaveAdapter();
    const delayedFirstLoad = firstAdapter.deferNextLoad();
    const secondRemoteSave = createDefaultSave();
    secondRemoteSave.player.coins = 60;
    const secondAdapter = new ControlledSaveAdapter(secondRemoteSave);
    const store = new GameSaveStore();
    const firstConnection = store.connect(firstAdapter, "user-a");

    await store.connect(secondAdapter, "user-b");
    const staleSave = createDefaultSave();
    staleSave.player.coins = 90;
    delayedFirstLoad.resolve(staleSave);
    await firstConnection;

    expect(store.load().player.coins).toBe(60);
  });

  it("rejects flush when the latest remote write failed", async () => {
    const adapter = new ControlledSaveAdapter();
    const store = new GameSaveStore();
    await store.connect(adapter);

    adapter.failNextSave(new Error("network unavailable"));
    const changedSave = store.load();
    changedSave.player.coins = 25;
    store.save(changedSave);

    await expect(store.flush()).rejects.toThrow("network unavailable");
    expect(store.getSyncState()).toBe("error");
    expect(store.hasPendingChanges()).toBe(true);

    await store.retry();

    expect(adapter.remoteSave.player.coins).toBe(25);
    expect(store.getSyncState()).toBe("synced");
    expect(store.hasPendingChanges()).toBe(false);
  });

  it("flush waits for writes queued while an earlier write is still running", async () => {
    const adapter = new ControlledSaveAdapter();
    const store = new GameSaveStore();
    await store.connect(adapter);

    const firstGate = adapter.blockNextSave();
    const firstChange = store.load();
    firstChange.player.coins = 20;
    store.save(firstChange);
    await firstGate.started.promise;

    let flushFinished = false;
    const flushing = store.flush().then(() => {
      flushFinished = true;
    });
    const secondGate = adapter.blockNextSave();
    const secondChange = store.load();
    secondChange.player.coins = 30;
    store.save(secondChange);

    firstGate.release.resolve();
    await secondGate.started.promise;
    expect(flushFinished).toBe(false);

    secondGate.release.resolve();
    await flushing;
    expect(adapter.remoteSave.player.coins).toBe(30);
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
