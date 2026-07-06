export interface ResolvedProjectileImpact<TCandidate, TProjectile extends TCandidate> {
  projectile: TProjectile;
  target: TCandidate;
}

export function resolveProjectileImpact<TCandidate, TProjectile extends TCandidate>(
  first: TCandidate,
  second: TCandidate,
  isProjectile: (candidate: TCandidate) => candidate is TProjectile,
): ResolvedProjectileImpact<TCandidate, TProjectile> | undefined {
  if (isProjectile(first)) {
    if (isProjectile(second)) return undefined;
    return { projectile: first, target: second };
  }
  if (isProjectile(second)) return { projectile: second, target: first };
  return undefined;
}
