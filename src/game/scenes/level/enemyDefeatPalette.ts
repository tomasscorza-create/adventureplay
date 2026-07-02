export interface EnemyDefeatPalette {
  core: number;
  ring: number;
  sparks: number[];
}

export function getEnemyDefeatPalette(enemyId: string): EnemyDefeatPalette {
  if (enemyId === "e2m3") {
    return { core: 0x8dff78, ring: 0x2f9d62, sparks: [0xd4ff8c, 0x6dff91, 0x25684f] };
  }
  if (enemyId === "m3") {
    return { core: 0xff6a32, ring: 0x9f1f2d, sparks: [0xffd06a, 0xe23a35, 0x5c1820] };
  }
  if (enemyId === "m2") {
    return { core: 0xfff1a1, ring: 0x8cecff, sparks: [0xfff1a1, 0xffffff, 0x8cecff] };
  }
  if (enemyId === "m1") {
    return { core: 0xff8f5f, ring: 0xffd56a, sparks: [0xff8f5f, 0xffd56a, 0x6be092] };
  }
  return { core: 0xff5f68, ring: 0xffd56a, sparks: [0xff5f68, 0xffd56a, 0xffffff] };
}
