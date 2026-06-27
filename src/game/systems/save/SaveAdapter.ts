import type { SaveData } from "../../../shared/types/game";

export interface SaveAdapter {
  load(): SaveData;
  save(data: SaveData): void;
  reset(): SaveData;
}

export interface AsyncSaveAdapter {
  load(): Promise<SaveData>;
  save(data: SaveData): Promise<void>;
  reset(): Promise<SaveData>;
}
