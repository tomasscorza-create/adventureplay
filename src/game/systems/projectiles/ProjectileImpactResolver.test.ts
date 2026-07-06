import { describe, expect, it } from "vitest";
import { resolveProjectileImpact } from "./ProjectileImpactResolver";

type Candidate =
  | { kind: "projectile"; id: string }
  | { kind: "target"; id: string };

function isProjectile(candidate: Candidate): candidate is Extract<Candidate, { kind: "projectile" }> {
  return candidate.kind === "projectile";
}

describe("resolveProjectileImpact", () => {
  const projectile: Candidate = { kind: "projectile", id: "power-1" };
  const target: Candidate = { kind: "target", id: "gate-1" };

  it("resolves the projectile when Phaser provides it first", () => {
    expect(resolveProjectileImpact(projectile, target, isProjectile)).toEqual({ projectile, target });
  });

  it("resolves the projectile when Phaser reverses the callback arguments", () => {
    expect(resolveProjectileImpact(target, projectile, isProjectile)).toEqual({ projectile, target });
  });

  it("rejects pairs without exactly one projectile", () => {
    expect(resolveProjectileImpact(target, { kind: "target", id: "wall-1" }, isProjectile))
      .toBeUndefined();
    expect(resolveProjectileImpact(projectile, { kind: "projectile", id: "power-2" }, isProjectile))
      .toBeUndefined();
  });
});
