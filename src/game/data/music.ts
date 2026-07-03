export type MusicTrackId = "menu" | "levels-calm" | "levels-rising" | "levels-intense";

export interface MusicTrackDefinition {
  id: MusicTrackId;
  title: string;
  source: string;
  volume: number;
}

export const musicTracks: Record<MusicTrackId, MusicTrackDefinition> = {
  menu: {
    id: "menu",
    title: "The Bard's Tale",
    source: "/music/menu-bards-tale.ogg",
    volume: 0.52,
  },
  "levels-calm": {
    id: "levels-calm",
    title: "Once Upon a Time",
    source: "/music/levels-calm.ogg",
    volume: 0.56,
  },
  "levels-rising": {
    id: "levels-rising",
    title: "Raiders March",
    source: "/music/levels-rising.ogg",
    volume: 0.5,
  },
  "levels-intense": {
    id: "levels-intense",
    title: "The March of Devils Dome",
    source: "/music/levels-intense.ogg",
    volume: 0.54,
  },
};

export function getLevelMusicTrack(stageNumber: number): MusicTrackId {
  if (stageNumber <= 3) {
    return "levels-calm";
  }

  if (stageNumber <= 6) {
    return "levels-rising";
  }

  return "levels-intense";
}
