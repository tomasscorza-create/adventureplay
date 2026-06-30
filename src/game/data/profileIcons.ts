import icon1Url from "../../assets/ui/profile-icons/profile-1.png";
import icon2Url from "../../assets/ui/profile-icons/profile-2.png";
import icon3Url from "../../assets/ui/profile-icons/profile-3.png";
import icon4Url from "../../assets/ui/profile-icons/profile-4.png";
import icon5Url from "../../assets/ui/profile-icons/profile-5.png";
import icon6Url from "../../assets/ui/profile-icons/profile-6.png";
import icon7Url from "../../assets/ui/profile-icons/profile-7.png";
import icon8Url from "../../assets/ui/profile-icons/profile-8.png";
import icon9Url from "../../assets/ui/profile-icons/profile-9.png";
import type { ProfileIconId } from "../../shared/types/game";

export interface ProfileIconDefinition {
  id: ProfileIconId;
  imageUrl: string;
}

export const profileIconDefinitions: ProfileIconDefinition[] = [
  { id: "icon-1", imageUrl: icon1Url },
  { id: "icon-2", imageUrl: icon2Url },
  { id: "icon-3", imageUrl: icon3Url },
  { id: "icon-4", imageUrl: icon4Url },
  { id: "icon-5", imageUrl: icon5Url },
  { id: "icon-6", imageUrl: icon6Url },
  { id: "icon-7", imageUrl: icon7Url },
  { id: "icon-8", imageUrl: icon8Url },
  { id: "icon-9", imageUrl: icon9Url },
];

export function getProfileIconDefinition(profileIconId: ProfileIconId): ProfileIconDefinition {
  return profileIconDefinitions.find((icon) => icon.id === profileIconId) ?? profileIconDefinitions[0];
}
