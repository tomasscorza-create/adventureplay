import Phaser from "phaser";
import type { Player } from "../../entities/player/Player";
import type { NetPlayerState } from "./coopMessages";

// Serializacion/aplicacion del estado de red de un jugador, compartida por las
// escenas co-op. Cualquier cambio aqui es un cambio de protocolo: revisar
// COOP_PROTOCOL_VERSION en coopMessages.ts antes de tocar la forma de los datos.

export interface NetPlayerCharges {
  healingCharges: number;
  powerCharges: number;
}

export function toNetPlayer(
  player: Player,
  charges: NetPlayerCharges,
  nowMs: number,
): NetPlayerState {
  const body = player.body as Phaser.Physics.Arcade.Body;
  return {
    x: Math.round(player.x),
    y: Math.round(player.y),
    vx: Math.round(body.velocity.x),
    vy: Math.round(body.velocity.y),
    facing: player.facing,
    state: player.state,
    health: player.stats.health,
    maxHealth: player.stats.maxHealth,
    healCharges: charges.healingCharges,
    powerCharges: charges.powerCharges,
    spinCdMs: Math.round(player.getSpinCooldownRemaining(nowMs)),
  };
}

export function applyNetPlayer(player: Player, net: NetPlayerState): void {
  player.x = net.x;
  player.y = net.y;
  player.stats.health = net.health;
  player.renderNetState(net.state, net.facing);
}
