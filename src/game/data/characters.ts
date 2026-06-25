import type { CharacterDefinition, CharacterId } from "../../shared/types/game";

export const characterDefinitions: Record<CharacterId, CharacterDefinition> = {
  ruder: {
    id: "ruder",
    name: "Ruder",
    textureKey: "character-ruder",
    animationPrefix: "character-ruder",
    description: "Caballero equilibrado",
  },
  amy: {
    id: "amy",
    name: "Amy",
    textureKey: "character-amy",
    animationPrefix: "character-amy",
    description: "Guardiana veloz",
  },
  dunel: {
    id: "dunel",
    name: "Dunel",
    textureKey: "character-dunel",
    animationPrefix: "character-dunel",
    description: "Defensor resistente",
  },
  sarix: {
    id: "sarix",
    name: "Sarix",
    textureKey: "character-sarix",
    animationPrefix: "character-sarix",
    description: "Espadachin agresivo",
  },
};

export const playableCharacters = Object.values(characterDefinitions);

export function getCharacterDefinition(characterId: CharacterId | undefined): CharacterDefinition {
  return characterDefinitions[characterId ?? "ruder"] ?? characterDefinitions.ruder;
}
