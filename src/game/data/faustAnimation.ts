import animationData from "../../assets/characters/faust-animation.json";
import type { PlayerState, WeaponAttachmentFrame } from "../../shared/types/game";

type FaustAnimationState = Exclude<PlayerState, "spin">;

export interface FaustAnimationRange {
  start: number;
  end: number;
  frameRate: number;
  repeat: number;
}

export const faustAnimationRanges = animationData.animations as Record<
  FaustAnimationState,
  FaustAnimationRange
>;

export const faustWeaponAttachmentFrames = animationData.weaponFrames as WeaponAttachmentFrame[];
