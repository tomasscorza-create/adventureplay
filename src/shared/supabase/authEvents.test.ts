import { describe, expect, it } from "vitest";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { shouldLoadSessionSave } from "./authEvents";

describe("shouldLoadSessionSave", () => {
  it.each<AuthChangeEvent>(["INITIAL_SESSION", "SIGNED_IN"])(
    "loads the remote save for %s",
    (event) => {
      expect(shouldLoadSessionSave(event)).toBe(true);
    },
  );

  it.each<AuthChangeEvent>([
    "TOKEN_REFRESHED",
    "USER_UPDATED",
    "PASSWORD_RECOVERY",
    "MFA_CHALLENGE_VERIFIED",
  ])("does not reload the remote save for %s", (event) => {
    expect(shouldLoadSessionSave(event)).toBe(false);
  });
});
