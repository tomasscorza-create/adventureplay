import type { SupabaseClient } from "@supabase/supabase-js";
import type { SaveData } from "../../../shared/types/game";
import type { AsyncSaveAdapter } from "./SaveAdapter";
import { createDefaultSave, normalizeSaveData, SAVE_SCHEMA_VERSION } from "./SaveDefaults";

interface GameSaveRow {
  save_data: SaveData | null;
}

export class SupabaseSaveAdapter implements AsyncSaveAdapter {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
    private readonly slotId = "default",
  ) {}

  async load(): Promise<SaveData> {
    const { data, error } = await this.supabase
      .from("game_saves")
      .select("save_data")
      .eq("user_id", this.userId)
      .eq("slot_id", this.slotId)
      .maybeSingle<GameSaveRow>();

    if (error) {
      throw error;
    }

    return normalizeSaveData(data?.save_data);
  }

  async save(data: SaveData): Promise<void> {
    const { error } = await this.supabase.from("game_saves").upsert(
      {
        user_id: this.userId,
        slot_id: this.slotId,
        save_version: SAVE_SCHEMA_VERSION,
        save_data: data,
      },
      { onConflict: "user_id,slot_id" },
    );

    if (error) {
      throw error;
    }
  }

  async reset(): Promise<SaveData> {
    const freshSave = createDefaultSave();
    await this.save(freshSave);
    return freshSave;
  }
}
