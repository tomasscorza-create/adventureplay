import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getActionDisplayBinding,
  getBindingCodeFromKeyboardEvent,
  keyboardBindingStore,
} from "./KeyboardBindingStore";

describe("KeyboardBindingStore", () => {
  afterEach(() => keyboardBindingStore.reset());

  it("updates both slots and exposes the primary binding to the HUD", () => {
    expect(keyboardBindingStore.setBinding("spin", "primary", "ONE")).toEqual({ ok: true });
    expect(keyboardBindingStore.setBinding("spin", "secondary", "K")).toEqual({ ok: true });
    expect(getActionDisplayBinding(keyboardBindingStore.getBindings(), "spin")).toBe("1");
  });

  it("rejects a key already assigned to another command", () => {
    const result = keyboardBindingStore.setBinding("spin", "primary", "J");
    expect(result.ok).toBe(false);
  });

  it("notifies interface subscribers immediately", () => {
    const listener = vi.fn();
    const unsubscribe = keyboardBindingStore.onChange(listener);
    keyboardBindingStore.setBinding("heal", "primary", "THREE");
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("normalizes letters, numbers and arrows from browser events", () => {
    expect(getBindingCodeFromKeyboardEvent({ code: "KeyR" } as KeyboardEvent)).toBe("R");
    expect(getBindingCodeFromKeyboardEvent({ code: "Digit7" } as KeyboardEvent)).toBe("SEVEN");
    expect(getBindingCodeFromKeyboardEvent({ code: "ArrowUp" } as KeyboardEvent)).toBe("UP");
  });
});
