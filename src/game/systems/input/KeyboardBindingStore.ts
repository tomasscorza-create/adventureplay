export type KeyboardCommandAction =
  | "left"
  | "right"
  | "jump"
  | "melee"
  | "spin"
  | "heal"
  | "power"
  | "pause";

export type KeyboardBindingSlot = "primary" | "secondary";
export type KeyboardBindingCode = keyof typeof KEYBOARD_BINDING_LABELS;
export type KeyboardBindingPair = Record<KeyboardBindingSlot, KeyboardBindingCode | null>;
export type KeyboardBindings = Record<KeyboardCommandAction, KeyboardBindingPair>;

export const keyboardCommandDefinitions: readonly {
  action: KeyboardCommandAction;
  label: string;
  description: string;
}[] = [
  { action: "left", label: "Mover a la izquierda", description: "Movimiento horizontal" },
  { action: "right", label: "Mover a la derecha", description: "Movimiento horizontal" },
  { action: "jump", label: "Saltar", description: "Salto normal" },
  { action: "melee", label: "Golpe de espada", description: "Ataque cercano" },
  { action: "spin", label: "Ataque giratorio", description: "Giro con recarga" },
  { action: "heal", label: "Regenerar", description: "Consumir carga de vida" },
  { action: "power", label: "Poder letal", description: "Consumir carga letal" },
  { action: "pause", label: "Pausar", description: "Abrir pausa" },
] as const;

const STORAGE_KEY = "adventurePlayKeyboardBindings";

const KEYBOARD_BINDING_LABELS = {
  A: "A", B: "B", C: "C", D: "D", E: "E", F: "F", G: "G", H: "H", I: "I",
  J: "J", K: "K", L: "L", M: "M", N: "N", O: "O", P: "P", Q: "Q", R: "R",
  S: "S", T: "T", U: "U", V: "V", W: "W", X: "X", Y: "Y", Z: "Z",
  ZERO: "0", ONE: "1", TWO: "2", THREE: "3", FOUR: "4",
  FIVE: "5", SIX: "6", SEVEN: "7", EIGHT: "8", NINE: "9",
  LEFT: "←", RIGHT: "→", UP: "↑", DOWN: "↓",
  SPACE: "ESPACIO", SHIFT: "SHIFT", CTRL: "CTRL", ALT: "ALT", ENTER: "ENTER", ESC: "ESC",
} as const;

const defaultBindings: KeyboardBindings = {
  left: { primary: "A", secondary: "LEFT" },
  right: { primary: "D", secondary: "RIGHT" },
  jump: { primary: "SPACE", secondary: "W" },
  melee: { primary: "J", secondary: null },
  spin: { primary: "K", secondary: null },
  heal: { primary: "Q", secondary: null },
  power: { primary: "E", secondary: null },
  pause: { primary: "P", secondary: "ESC" },
};

class KeyboardBindingStore {
  private bindings = this.load();
  private readonly listeners = new Set<(bindings: KeyboardBindings) => void>();

  getBindings(): KeyboardBindings {
    return cloneBindings(this.bindings);
  }

  setBinding(
    action: KeyboardCommandAction,
    slot: KeyboardBindingSlot,
    code: KeyboardBindingCode | null,
  ): { ok: true } | { ok: false; error: string } {
    const otherSlot: KeyboardBindingSlot = slot === "primary" ? "secondary" : "primary";
    if (code === null && this.bindings[action][otherSlot] === null) {
      return { ok: false, error: "Cada comando necesita al menos una tecla." };
    }

    if (code !== null) {
      const occupied = keyboardCommandDefinitions.find(({ action: candidateAction }) =>
        candidateAction !== action
        && Object.values(this.bindings[candidateAction]).includes(code)
      );
      if (occupied) {
        return { ok: false, error: `${getBindingLabel(code)} ya se usa en ${occupied.label}.` };
      }
    }

    this.bindings = {
      ...this.bindings,
      [action]: {
        ...this.bindings[action],
        [slot]: code,
        ...(code !== null && this.bindings[action][otherSlot] === code ? { [otherSlot]: null } : {}),
      },
    };
    this.persist();
    this.emit();
    return { ok: true };
  }

  reset(): void {
    this.bindings = cloneBindings(defaultBindings);
    this.persist();
    this.emit();
  }

  onChange(listener: (bindings: KeyboardBindings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private load(): KeyboardBindings {
    if (typeof window === "undefined") {
      return cloneBindings(defaultBindings);
    }
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as unknown;
      return normalizeBindings(parsed);
    } catch {
      return cloneBindings(defaultBindings);
    }
  }

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings));
    } catch {
      // El juego conserva los comandos en memoria si el navegador bloquea localStorage.
    }
  }

  private emit(): void {
    const snapshot = this.getBindings();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export function getBindingLabel(code: KeyboardBindingCode | null): string {
  return code ? KEYBOARD_BINDING_LABELS[code] : "Sin asignar";
}

export function getActionDisplayBinding(
  bindings: KeyboardBindings,
  action: KeyboardCommandAction,
): string {
  return getBindingLabel(bindings[action].primary ?? bindings[action].secondary);
}

export function getCompactActionBinding(
  bindings: KeyboardBindings,
  action: KeyboardCommandAction,
): string {
  const label = getActionDisplayBinding(bindings, action);
  const compactLabels: Record<string, string> = {
    ESPACIO: "SPC",
    SHIFT: "SHF",
    ENTER: "ENT",
  };
  return compactLabels[label] ?? label;
}

export function getBindingCodeFromKeyboardEvent(event: KeyboardEvent): KeyboardBindingCode | null {
  if (/^Key[A-Z]$/.test(event.code)) {
    return event.code.slice(3) as KeyboardBindingCode;
  }
  if (/^Digit[0-9]$/.test(event.code)) {
    const digitNames = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"] as const;
    return digitNames[Number(event.code.slice(5))];
  }
  const specialCodes: Partial<Record<string, KeyboardBindingCode>> = {
    ArrowLeft: "LEFT", ArrowRight: "RIGHT", ArrowUp: "UP", ArrowDown: "DOWN",
    Space: "SPACE", ShiftLeft: "SHIFT", ShiftRight: "SHIFT",
    ControlLeft: "CTRL", ControlRight: "CTRL", AltLeft: "ALT", AltRight: "ALT",
    Enter: "ENTER", Escape: "ESC",
  };
  return specialCodes[event.code] ?? null;
}

function normalizeBindings(raw: unknown): KeyboardBindings {
  if (!raw || typeof raw !== "object") {
    return cloneBindings(defaultBindings);
  }
  const source = raw as Record<string, unknown>;
  const normalized = {} as KeyboardBindings;
  const used = new Set<KeyboardBindingCode>();
  for (const { action } of keyboardCommandDefinitions) {
    const pair = source[action];
    if (!pair || typeof pair !== "object") {
      return cloneBindings(defaultBindings);
    }
    const candidate = pair as Record<string, unknown>;
    const primary = candidate.primary === null || isBindingCode(candidate.primary)
      ? candidate.primary
      : undefined;
    const secondary = candidate.secondary === null || isBindingCode(candidate.secondary)
      ? candidate.secondary
      : undefined;
    if (primary === undefined || secondary === undefined || (!primary && !secondary)) {
      return cloneBindings(defaultBindings);
    }
    if ((primary && used.has(primary)) || (secondary && used.has(secondary)) || primary === secondary) {
      return cloneBindings(defaultBindings);
    }
    if (primary) used.add(primary);
    if (secondary) used.add(secondary);
    normalized[action] = { primary, secondary };
  }
  return normalized;
}

function isBindingCode(value: unknown): value is KeyboardBindingCode {
  return typeof value === "string" && value in KEYBOARD_BINDING_LABELS;
}

function cloneBindings(bindings: KeyboardBindings): KeyboardBindings {
  return Object.fromEntries(
    Object.entries(bindings).map(([action, pair]) => [action, { ...pair }]),
  ) as KeyboardBindings;
}

export const keyboardBindingStore = new KeyboardBindingStore();
