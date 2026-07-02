export function getCarouselOffset(index: number, activeIndex: number, total: number): number {
  let offset = index - activeIndex;
  if (offset > total / 2) {
    offset -= total;
  } else if (offset < -total / 2) {
    offset += total;
  }
  return offset;
}

export function formatCompactAmount(value: number): string {
  const absoluteValue = Math.abs(value);

  if (absoluteValue < 10_000) {
    return value.toLocaleString("es-AR");
  }

  const [divisor, suffix] = absoluteValue >= 1_000_000_000
    ? [1_000_000_000, "B"]
    : absoluteValue >= 1_000_000
      ? [1_000_000, "M"]
      : [1_000, "K"];
  const compactValue = value / divisor;
  const maximumFractionDigits = Math.abs(compactValue) >= 100 ? 0 : Math.abs(compactValue) >= 10 ? 1 : 2;

  return `${compactValue.toLocaleString("es-AR", { maximumFractionDigits })}${suffix}`;
}

export function formatGameplayTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  return `${minutes} min`;
}

export function getLevelStatus({
  levelExists,
  isCompleted,
  isCurrent,
  isUnlocked,
}: {
  levelExists: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  isUnlocked: boolean;
}): { kind: "completed" | "current" | "locked" | "soon"; label: string } {
  if (!levelExists) {
    return { kind: "soon", label: "Proximamente" };
  }

  if (isCompleted) {
    return { kind: "completed", label: "Completado" };
  }

  if (isCurrent || isUnlocked) {
    return { kind: "current", label: "Pendiente" };
  }

  return { kind: "locked", label: "Bloqueado" };
}
