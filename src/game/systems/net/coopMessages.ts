import type { PlayerState } from "../../../shared/types/game";
import {
  emptyGameplayInputState,
  type GameplayInputState,
} from "../../../shared/types/input";

// Frecuencias de red conservadoras para no acercarse a los limites de broadcast
// de Supabase Realtime. El guest interpola entre snapshots del host.
export const COOP_INPUT_RATE_HZ = 30;
export const COOP_SNAPSHOT_RATE_HZ = 20;

// El input solo se transmite cuando cambia; este keepalive reenvia el estado
// sostenido sin cambios para corregir cualquier mensaje perdido sin volver a
// emitir a COOP_INPUT_RATE_HZ constante (ahorra ~2/3 del trafico de input).
export const COOP_INPUT_KEEPALIVE_MS = 100;

// Version del protocolo co-op. Incrementarla ante cualquier cambio incompatible
// de mensajes o presencia: los clientes con versiones distintas no juegan entre
// si y reciben un error claro en el lobby en lugar de fallar en silencio.
// v1: presencia con key por rol, hello sin protocol (builds previos).
// v2: presencia con key por clientId y payload {role, characterId, protocol}.
export const COOP_PROTOCOL_VERSION = 2;

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
// `protocol` falta en los clientes anteriores a la v2 (se interpreta como 1).
export interface CoopHello {
  characterId: string;
  protocol?: number;
}

// Entrada normalizada de presence de un peer. La key del canal es un clientId
// unico por dispositivo (no el rol) para admitir mas de un guest en el futuro;
// el rol viaja dentro del payload.
export interface CoopPresenceEntry {
  key: string;
  role: CoopRole;
  characterId: string;
  protocol: number;
}

export function collectPeerPresences(
  state: Record<string, Array<Record<string, unknown>>>,
  selfKey: string,
): CoopPresenceEntry[] {
  const peers: CoopPresenceEntry[] = [];
  for (const [key, entries] of Object.entries(state)) {
    if (key === selfKey) continue;
    for (const entry of entries) {
      const role = entry.role;
      if (role !== "host" && role !== "guest") continue;
      peers.push({
        key,
        role,
        characterId: typeof entry.characterId === "string" ? entry.characterId : "",
        protocol: typeof entry.protocol === "number" ? entry.protocol : 1,
      });
    }
  }
  return peers;
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
