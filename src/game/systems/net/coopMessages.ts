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
// v3: snapshots con proyectiles de poder letal ([netId, x, y, dir]).
// v4: modelo de slots N jugadores: input con slot emisor y players como arreglo.
// v5: gameplay N jugadores: el inicio lleva el roster autoritativo (slot+heroe).
// v6: `end` lleva el slot emisor (salidas individuales) y `start` se reutiliza
//     a mitad de sesion para encadenar el siguiente nivel de la sala.
// v7: cada jugador reporta sus cargas reales (presence + roster del start) y
//     las compras del guest viajan como delta `charges` hacia el host.
// v8: canal de input separado y snapshots con delta en arrays (secciones opcionales).
// v9: reserva temporal de identidad/slot y recuperacion por snapshot completo.
// v10: envelope comun con identidad/rol, validacion defensiva y rate limiting.
export const COOP_PROTOCOL_VERSION = 10;

// Tiempo durante el cual una ausencia de presence en partida se considera una
// desconexion recuperable. Al vencer, la salida se vuelve definitiva.
export const COOP_RECONNECT_WINDOW_MS = 30_000;

export type CoopRole = "host" | "guest";

// Cantidad maxima de jugadores por sala (host + guests). El modelo de slots
// admite crecer; este tope acota el gameplay y el lobby.
export const COOP_MAX_PLAYERS = 4;

// Slot fijo del anfitrion. Los guests ocupan slots 1..N segun `assignSlots`.
export const HOST_SLOT = 0;

// Eventos de broadcast usados en el canal de la sala.
export const COOP_EVENTS = {
  hello: "hello",
  input: "input",
  snapshot: "snapshot",
  start: "start",
  end: "end",
  charges: "charges",
} as const;

// El guest se presenta con el heroe que eligio para que el host lo instancie,
// y con sus cargas reales para que el host no las invente desde su propio save.
// `protocol` falta en los clientes anteriores a la v2 (se interpreta como 1).
export interface CoopHello {
  characterId: string;
  protocol?: number;
  healingCharges?: number;
  powerCharges?: number;
}

// Entrada normalizada de presence de un peer. La key del canal es un clientId
// unico por dispositivo (no el rol) para admitir mas de un guest en el futuro;
// el rol viaja dentro del payload.
export interface CoopPresenceEntry {
  key: string;
  role: CoopRole;
  characterId: string;
  protocol: number;
  healingCharges: number;
  powerCharges: number;
}

function normalizeNetworkCharge(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
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
        healingCharges: normalizeNetworkCharge(entry.healingCharges),
        powerCharges: normalizeNetworkCharge(entry.powerCharges),
      });
    }
  }
  return peers;
}

// Participante con su slot ya asignado dentro de la sala.
export interface CoopParticipant {
  key: string;
  role: CoopRole;
  characterId: string;
  slot: number;
  healingCharges: number;
  powerCharges: number;
}

// Roster determinista de la sala: el anfitrion ocupa HOST_SLOT y los guests se
// ordenan por su clientId ascendente para recibir slots 1..N. Al derivarse solo
// del conjunto de presencias (identico en todos los dispositivos), cada cliente
// calcula el mismo mapa sin necesitar un mensaje de asignacion ni una carrera.
export function assignSlots<T extends { key: string; role: CoopRole; characterId: string }>(
  entries: ReadonlyArray<T>,
): Array<T & { slot: number }> {
  const roster: Array<T & { slot: number }> = [];
  const host = entries.find((entry) => entry.role === "host");
  if (host) roster.push({ ...host, slot: HOST_SLOT });
  entries
    .filter((entry) => entry.role === "guest")
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .forEach((guest, index) => roster.push({ ...guest, slot: HOST_SLOT + 1 + index }));
  return roster;
}

// Entrada compacta del roster que el host transmite al iniciar: define cuantos
// jugadores hay, en que slot, con que heroe y con que cargas, de forma
// autoritativa para que todos instancien exactamente lo mismo sin depender del
// timing de presence. En el encadenado de niveles lleva las cargas vivas.
export interface CoopStartPlayer {
  slot: number;
  characterId: string;
  healingCharges?: number;
  powerCharges?: number;
}

// Compra de cargas durante la partida: el comprador transmite el delta y el
// host lo suma a los contadores vivos de ese slot (los valores absolutos del
// save no sirven porque no reflejan lo gastado en la partida).
export interface CoopChargesMessage {
  slot: number;
  healingDelta: number;
  powerDelta: number;
}

export interface CoopStartMessage {
  levelId: string;
  roster: CoopStartPlayer[];
}

export type CoopEndReason = "won" | "lost" | "left";
export interface CoopEndMessage {
  reason: CoopEndReason;
  slot?: number;
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

// Input de un guest hacia el host. `slot` identifica al emisor para que el host
// enrute varios streams simultaneos (uno por guest); `seq` se deduplica por slot.
export interface CoopInputMessage {
  slot: number;
  seq: number;
  bits: number;
  // Solo se agrega al recibir en el host; nunca se confia ni se envia desde el guest.
  receivedAtMs?: number;
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

// [netId, x, y, direccion] por proyectil de poder letal vivo; los ausentes
// impactaron o salieron de pantalla.
export type NetProjectile = [number, number, number, -1 | 1];

// Snapshot completo del mundo que el host transmite ~20 veces por segundo.
// `players` esta indexado por slot (0 = host, 1..N = guests). Hoy son 2, pero el
// arreglo admite mas sin cambiar la forma del mensaje.
export interface WorldSnapshot {
  seq: number;
  players: NetPlayerState[];
  crates?: Array<[number, number]>;
  // [netId, x, y] por enemigo vivo; los ausentes fueron derrotados.
  enemies?: Array<[number, number, number]>;
  projectiles: NetProjectile[];
  active?: string[];
  gatesOpen?: boolean[];
  sealsAlive?: boolean[];
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
