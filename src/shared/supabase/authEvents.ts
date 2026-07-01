import type { AuthChangeEvent } from "@supabase/supabase-js";

export function shouldLoadSessionSave(event: AuthChangeEvent): boolean {
  return event === "INITIAL_SESSION" || event === "SIGNED_IN";
}
