import type { SaveData } from "../../../shared/types/game";
import type { AsyncSaveAdapter, SaveAdapter } from "./SaveAdapter";
import { createDefaultSave, normalizeSaveData } from "./SaveDefaults";

type SaveErrorHandler = (error: unknown) => void;

export class GameSaveStore implements SaveAdapter {
  private currentSave = createDefaultSave();
  private remoteAdapter?: AsyncSaveAdapter;
  private persistQueue = Promise.resolve();
  private errorHandler?: SaveErrorHandler;

  async connect(remoteAdapter: AsyncSaveAdapter): Promise<SaveData> {
    this.remoteAdapter = remoteAdapter;
    this.currentSave = normalizeSaveData(await remoteAdapter.load());
    await remoteAdapter.save(this.currentSave);
    return this.load();
  }

  disconnect(): void {
    this.remoteAdapter = undefined;
    this.currentSave = createDefaultSave();
    this.persistQueue = Promise.resolve();
  }

  onError(handler: SaveErrorHandler): void {
    this.errorHandler = handler;
  }

  load(): SaveData {
    return structuredClone(this.currentSave);
  }

  save(data: SaveData): void {
    this.currentSave = normalizeSaveData(data);
    const adapter = this.remoteAdapter;

    if (!adapter) {
      return;
    }

    this.persistQueue = this.persistQueue
      .catch(() => undefined)
      .then(() => adapter.save(this.load()))
      .catch((error) => {
        this.errorHandler?.(error);
      });
  }

  reset(): SaveData {
    const freshSave = createDefaultSave();
    this.save(freshSave);
    return this.load();
  }

  async flush(): Promise<void> {
    await this.persistQueue;
  }
}

export const gameSaveStore = new GameSaveStore();
