import type { SaveData } from "../../../shared/types/game";
import type { AsyncSaveAdapter, SaveAdapter } from "./SaveAdapter";
import { createDefaultSave, normalizeSaveData } from "./SaveDefaults";

type SaveErrorHandler = (error: unknown) => void;
export type SaveSyncState = "disconnected" | "loading" | "pending" | "synced" | "error";

export class GameSaveStore implements SaveAdapter {
  private currentSave = createDefaultSave();
  private remoteAdapter?: AsyncSaveAdapter;
  private connectionKey?: string;
  private connectionGeneration = 0;
  private connectionPromise?: Promise<SaveData>;
  private saveRevision = 0;
  private persistQueue: Promise<void> = Promise.resolve();
  private errorHandler?: SaveErrorHandler;
  private syncState: SaveSyncState = "disconnected";
  private dirty = false;

  async connect(remoteAdapter: AsyncSaveAdapter, connectionKey = "default"): Promise<SaveData> {
    if (this.remoteAdapter && this.connectionKey === connectionKey) {
      return this.connectionPromise ?? this.load();
    }

    const generation = this.invalidateConnection();
    this.remoteAdapter = remoteAdapter;
    this.connectionKey = connectionKey;
    this.syncState = "loading";

    const connectionPromise = this.finishConnection(remoteAdapter, generation);
    this.connectionPromise = connectionPromise;
    try {
      return await connectionPromise;
    } finally {
      if (this.connectionPromise === connectionPromise) {
        this.connectionPromise = undefined;
      }
    }
  }

  disconnect(): void {
    this.invalidateConnection();
    this.currentSave = createDefaultSave();
    this.saveRevision += 1;
    this.syncState = "disconnected";
    this.dirty = false;
  }

  onError(handler: SaveErrorHandler): void {
    this.errorHandler = handler;
  }

  load(): SaveData {
    return structuredClone(this.currentSave);
  }

  save(data: SaveData): void {
    this.currentSave = normalizeSaveData(data);
    this.saveRevision += 1;
    this.dirty = Boolean(this.remoteAdapter);
    this.queuePersist();
  }

  reset(): SaveData {
    const freshSave = createDefaultSave();
    this.save(freshSave);
    return this.load();
  }

  async flush(): Promise<void> {
    while (true) {
      const queue = this.persistQueue;
      await queue;
      if (queue === this.persistQueue) {
        return;
      }
    }
  }

  async retry(): Promise<void> {
    if (!this.remoteAdapter || !this.dirty) {
      await this.flush();
      return;
    }

    this.queuePersist();
    await this.flush();
  }

  getSyncState(): SaveSyncState {
    return this.syncState;
  }

  hasPendingChanges(): boolean {
    return this.dirty;
  }

  private invalidateConnection(): number {
    this.connectionGeneration += 1;
    this.remoteAdapter = undefined;
    this.connectionKey = undefined;
    this.connectionPromise = undefined;
    void this.persistQueue.catch(() => undefined);
    this.persistQueue = Promise.resolve();
    return this.connectionGeneration;
  }

  private isCurrentConnection(adapter: AsyncSaveAdapter, generation: number): boolean {
    return this.remoteAdapter === adapter && this.connectionGeneration === generation;
  }

  private async finishConnection(
    remoteAdapter: AsyncSaveAdapter,
    generation: number,
  ): Promise<SaveData> {
    try {
      const remoteSave = normalizeSaveData(await remoteAdapter.load());
      if (!this.isCurrentConnection(remoteAdapter, generation)) {
        return this.load();
      }

      this.currentSave = remoteSave;
      this.saveRevision += 1;
      this.dirty = true;
      this.queuePersist();
      await this.flush();
      return this.load();
    } catch (error) {
      if (this.isCurrentConnection(remoteAdapter, generation)) {
        this.remoteAdapter = undefined;
        this.connectionKey = undefined;
        this.syncState = "error";
        this.dirty = false;
      }
      throw error;
    }
  }

  private queuePersist(): void {
    const adapter = this.remoteAdapter;
    const generation = this.connectionGeneration;
    if (!adapter) {
      return;
    }

    this.dirty = true;
    this.syncState = "pending";
    this.persistQueue = this.persistQueue
      .catch(() => undefined)
      .then(async () => {
        if (!this.isCurrentConnection(adapter, generation)) {
          return;
        }

        const revision = this.saveRevision;
        const snapshot = this.load();
        try {
          await adapter.save(snapshot);
        } catch (error) {
          if (!this.isCurrentConnection(adapter, generation)) {
            return;
          }

          this.syncState = "error";
          this.dirty = true;
          this.errorHandler?.(error);
          throw error;
        }

        if (!this.isCurrentConnection(adapter, generation)) {
          return;
        }

        if (this.saveRevision === revision) {
          this.dirty = false;
          this.syncState = "synced";
        }
      });
  }
}

export const gameSaveStore = new GameSaveStore();
