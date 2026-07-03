import type { LevelDefinition } from "../../shared/types/game";
import { activeVolcanoLevelDefinitions } from "./levels/activeVolcano.ts";
import { enchantedLevelDefinitions } from "./levels/enchantedForest.ts";
import { verdantLevelDefinitions } from "./levels/verdantFrontier.ts";

export { getPathCoinTarget } from "./levels/levelHelpers.ts";

export const levelDefinitions: Record<string, LevelDefinition> = {
  ...verdantLevelDefinitions,
  ...enchantedLevelDefinitions,
  ...activeVolcanoLevelDefinitions,
};
