import type { PlayerState } from "../../../shared/types/game";
import {
  emptyGameplayInputState,
  type GameplayInputState,
} from "../../../shared/types/input";

// Frecuencias de red conservadoras para no acercarse a los limites de broadcast
// de Supabase Realtime. El guest interpola entre snapshots del host.
export const COOP_INPUT_RATE_HZ = 30;
export const COOP_SNAPSHOT_RATE_HZ = 20;

export type CoopRole = "host" | "guest";

// Eventos de broadcast usados en el canal de la sala.
export const COOP_EVENTS = {
  hello: "hello",
  input: "input",
  snapshot: "snapshot",
  start: "start",
  end: "end",
} as const;

// El guest se presenta con el heroe que eligio para que el host lo instancie.
export interface CoopHello {
  characterId: string;
}

export interface CoopStartMessage {
  levelId: string;
}

export type CoopEndReason = "won" | "lost" | "left";
export interface CoopEndMessage {
  reason: CoopEndReason;
}

// Input del guest empaquetado en bits para mensajes minimos. El host reconstruye
// los flags "justPressed" comparando contra el frame recibido anterior, para no
// depender de eventos de flanco que un transporte con perdidas podria descartar.
const INPUT_ORDER: readonly (keyof GameplayInputState)[] = [
  "left",
  "right",
  "jump",
  "melee",
  "spin",
  "heal",
  "power",
  "pause",
];

export interface GuestInputMessage {
  seq: number;
  bits: number;
}

export function packInputState(state: GameplayInputState): number {
  let bits = 0;
  INPUT_ORDER.forEach((action, index) => {
    if (state[action]) bits |= 1 << index;
  });
  return bits;
}

export function unpackInputState(bits: number): GameplayInputState {
  const state: GameplayInputState = { ...emptyGameplayInputState };
  INPUT_ORDER.forEach((action, index) => {
    state[action] = (bits & (1 << index)) !== 0;
  });
  return state;
}

// Estado de un jugador dentro de un snapshot autoritativo del host.
export interface NetPlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: -1 | 1;
  state: PlayerState;
  health: number;
  maxHealth: number;
  healCharges: number;
  powerCharges: number;
  spinCdMs: number;
}

// Snapshot completo del mundo que el host transmite ~20 veces por segundo.
export interface WorldSnapshot {
  seq: number;
  players: [NetPlayerState, NetPlayerState];
  crates: Array<[number, number]>;
  // [netId, x, y] por enemigo vivo; los ausentes fueron derrotados.
  enemies: Array<[number, number, number]>;
  active: string[];
  gatesOpen: boolean[];
  sealsAlive: boolean[];
  goalOpen: boolean;
  timeMs: number;
}

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 4;

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .split("")
    .filter((char) => ROOM_CODE_ALPHABET.includes(char))
    .join("")
    .slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH && normalizeRoomCode(code) === code;
}
