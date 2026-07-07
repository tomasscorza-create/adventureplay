export const PUZZLE_CRATE_COLLISION_SIZE = 70;
// El sprite debe medir lo mismo que el cuerpo físico (70px de mundo). Con un
// display mayor la caja se veía 13px por encima de su tope real: al caer sobre
// una caja apilada parecías quedar en la de abajo y las cajas se hundían en el
// piso. Igualar display y colisión hace que pares justo sobre el borde visible.
export const PUZZLE_CRATE_DISPLAY_SIZE = 70;

/**
 * Decide si una caja debe comportarse como solida (no empujable) en este frame.
 *
 * Las cajas son cuerpos empujables para poder resolverse los puzzles, pero eso
 * hace que Arcade reparta la velocidad cuando el jugador cae encima y este se
 * hunda a traves de la caja de arriba de una pila. Mientras el jugador esta
 * sobre la caja (la solapa en horizontal, su centro esta por encima del techo
 * de la caja y no viene subiendo) la caja pasa a ser solida para que aterrice
 * encima; al costado sigue empujable.
 */
export function shouldCrateStaySolid(
  player: { left: number; right: number; centerY: number; velocityY: number },
  crate: { left: number; right: number; top: number },
): boolean {
  const horizontallyOverlaps = player.right > crate.left + 4 && player.left < crate.right - 4;
  const playerAboveTop = player.centerY < crate.top;
  const descendingOrResting = player.velocityY > -30;
  return horizontallyOverlaps && playerAboveTop && descendingOrResting;
}

export function getSourceBodyDimension(
  sourceDimension: number,
  displayDimension: number,
  desiredWorldDimension: number,
): number {
  if (sourceDimension <= 0 || displayDimension <= 0 || desiredWorldDimension <= 0) {
    throw new RangeError("Puzzle body dimensions must be positive");
  }
  return sourceDimension * (desiredWorldDimension / displayDimension);
}
