import type { NetPlayerState } from "./coopMessages";

// Snapshot autoritativo del host para el Modo Explorar (LevelScene). Reutiliza
// NetPlayerState de coopMessages para ambos jugadores; el resto son entidades
// propias de la escena. Los arreglos con `netId` permiten identificar cada
// entidad de forma estable aunque el orden cambie o alguna sea destruida.
export interface LevelSnapshot {
  seq: number;
  players: [NetPlayerState, NetPlayerState];
  // [netId, x, y, flip] por enemigo vivo (flip 0/1); los ausentes fueron derrotados.
  enemies: Array<[number, number, number, number]>;
  // [netId, x, y] por plataforma movil.
  platforms: Array<[number, number, number]>;
  // [netId, x, y] por peligro movil.
  hazards: Array<[number, number, number]>;
  // indices (segun orden de creacion) de monedas y corazones aun presentes.
  coins: number[];
  hearts: number[];
  // la caja de recompensa sigue disponible.
  rewardBox: boolean;
  // el checkpoint del nivel ya fue activado.
  checkpointActive: boolean;
  // posicion mundial de la linea de presion roja (sigue al jugador mas atrasado).
  pressureX: number;
  timeMs: number;
}
