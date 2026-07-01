import type { SaveData } from "../../../shared/types/game";
import type { AsyncSaveAdapter, SaveAdapter } from "./SaveAdapter";
import { createDefaultSave, normalizeSaveData } from "./SaveDefaults";

type SaveErrorHandler = (error: unknown) => void;
export type SaveSyncState = "disconnected" | "loading" | "pending" | "synced" | "error";
type SaveSyncStateHandler = (state: SaveSyncState) => void;

export class GameSaveStore implements SaveAdapter {
  private currentSave = createDefaultSave();
  private remoteAdapter?: AsyncSaveAdapter;
  private connectionKey?: string;
  private connectionGeneration = 0;
  private connectionPromise?: Promise<SaveData>;
  private saveRevision = 0;
  private persistQueue: Promise<void> = Promise.resolve();
  private readonly errorHandlers = new Set<SaveErrorHandler>();
  private readonly syncStateHandlers = new Set<SaveSyncStateHandler>();
  private syncState: SaveSyncState = "disconnected";
  private dirty = false;

  async connect(remoteAdapter: AsyncSaveAdapter, connectionKey = "default"): Promise<SaveData> {
    if (this.remoteAdapter && this.connectionKey === connectionKey) {
      return this.connectionPromise ?? this.load();
    }

    const generation = this.invalidateConnection();
    this.remoteAdapter = remoteAdapter;
    this.connectionKey = connectionKey;
    this.setSyncState("loading");

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
    this.setSyncState("disconnected");
    this.dirty = false;
  }

  onError(handler: SaveErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  onSyncStateChange(handler: SaveSyncStateHandler): () => void {
    this.syncStateHandlers.add(handler);
    return () => this.syncStateHandlers.delete(handler);
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
        this.setSyncState("error");
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
    this.setSyncState("pending");
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

          this.setSyncState("error");
          this.dirty = true;
          for (const handler of this.errorHandlers) {
            handler(error);
          }
          throw error;
        }

        if (!this.isCurrentConnection(adapter, generation)) {
          return;
        }

        if (this.saveRevision === revision) {
          this.dirty = false;
          this.setSyncState("synced");
        }
      });
  }

  private setSyncState(state: SaveSyncState): void {
    if (this.syncState === state) {
      return;
    }

    this.syncState = state;
    for (const handler of this.syncStateHandlers) {
      handler(state);
    }
  }
}

export const gameSaveStore = new GameSaveStore();
