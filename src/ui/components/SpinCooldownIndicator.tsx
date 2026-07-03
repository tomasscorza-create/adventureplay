import type { CSSProperties } from "react";
import { SPIN_ATTACK_COOLDOWN_MS } from "../../shared/constants/game";

export function SpinCooldownIndicator({ remainingMs }: { remainingMs: number }) {
  if (remainingMs <= 0) {
    return null;
  }

  const elapsedRatio = 1 - Math.min(1, remainingMs / SPIN_ATTACK_COOLDOWN_MS);
  const style = {
    "--spin-cooldown-angle": `${elapsedRatio * 360}deg`,
  } as CSSProperties;

  return (
    <span className="spin-cooldown" style={style} aria-hidden="true">
      <span className="spin-cooldown__time">{Math.ceil(remainingMs / 1000)}</span>
    </span>
  );
}
