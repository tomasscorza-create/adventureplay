import type { CharacterId } from "../../shared/types/game";

export const initialCharacterIds = ["dunel", "ruder", "sarix"] as const satisfies readonly CharacterId[];

export interface CharacterUnlockRequirement {
  unlockNumber: number;
  requiredLevel: number;
  cost: number;
}

export function canChooseInitialCharacter(characterId: CharacterId): boolean {
  return initialCharacterIds.some((initialId) => initialId === characterId);
}

export function getNextCharacterUnlockRequirement(
  unlockedCharacterIds: readonly CharacterId[],
): CharacterUnlockRequirement {
  const paidUnlockCount = Math.max(0, unlockedCharacterIds.length - 1);
  const unlockNumber = paidUnlockCount + 1;

  if (paidUnlockCount < 3) {
    return {
      unlockNumber,
      requiredLevel: (paidUnlockCount + 1) * 4,
      cost: 700 * 10 ** paidUnlockCount,
    };
  }

  return {
    unlockNumber,
    requiredLevel: 12,
    cost: 70_000 * 2 ** (paidUnlockCount - 2),
  };
}
