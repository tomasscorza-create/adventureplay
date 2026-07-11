import type { NetProjectile } from "./coopMessages";

export function uniqueProjectilesByNetId(entries: NetProjectile[]): NetProjectile[] {
  return [...new Map(entries.map((entry) => [entry[0], entry])).values()];
}
