import { useEffect, useState } from "react";
import {
  keyboardBindingStore,
  type KeyboardBindings,
} from "../../game/systems/input/KeyboardBindingStore";

export function useKeyboardBindings(): KeyboardBindings {
  const [bindings, setBindings] = useState(() => keyboardBindingStore.getBindings());
  useEffect(() => keyboardBindingStore.onChange(setBindings), []);
  return bindings;
}
