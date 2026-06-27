import type { CharacterDefinition, CharacterId } from "../../shared/types/game";
import amyPortraitUrl from "../../assets/characters/portraits/amy.webp";
import dunelPortraitUrl from "../../assets/characters/portraits/dunel.webp";
import ruderPortraitUrl from "../../assets/characters/portraits/ruder.webp";
import sarixPortraitUrl from "../../assets/characters/portraits/sarix.webp";

export const characterDefinitions: Record<CharacterId, CharacterDefinition> = {
  ruder: {
    id: "ruder",
    name: "Ruder",
    textureKey: "character-ruder",
    animationPrefix: "character-ruder",
    portraitUrl: ruderPortraitUrl,
    description: "Caballero equilibrado",
  },
  amy: {
    id: "amy",
    name: "Amy",
    textureKey: "character-amy",
    animationPrefix: "character-amy",
    portraitUrl: amyPortraitUrl,
    description: "Guardiana veloz",
  },
  dunel: {
    id: "dunel",
    name: "Dunel",
    textureKey: "character-dunel",
    animationPrefix: "character-dunel",
    portraitUrl: dunelPortraitUrl,
    description: "Defensor resistente",
  },
  sarix: {
    id: "sarix",
    name: "Sarix",
    textureKey: "character-sarix",
    animationPrefix: "character-sarix",
    portraitUrl: sarixPortraitUrl,
    description: "Espadachin agresivo",
  },
};

export const playableCharacters = Object.values(characterDefinitions);

export function getCharacterDefinition(characterId: CharacterId | undefined): CharacterDefinition {
  return characterDefinitions[characterId ?? "ruder"] ?? characterDefinitions.ruder;
}
