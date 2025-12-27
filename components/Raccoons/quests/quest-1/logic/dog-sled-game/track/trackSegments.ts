import { TrackSegment } from "./trackTypes";


export const TRACK_SEGMENTS: TrackSegment[] = [
  {
    id: "straight-1",
    type: "straight",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/track_straight.webp",
    widthScreens: 1.5,
    yUpper: 280,
    yLower: 440,
    obstacles: [
      {
        id: "obs-tree-1",
        type: "tree",
        segmentId: "straight-1",
        x: 900,
        lane: "upper",
      },
    ],
  },
  {
    id: "split-1",
    type: "split",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/track_split.webp",
    widthScreens: 1.8,
    yUpper: 240,
    yLower: 480,
    obstacles: [
      {
        id: "obs-snowdrift-1",
        type: "snowdrift",
        segmentId: "split-1",
        x: 600,
        lane: "lower",
      },
    ],
  },
  {
    id: "double-track",
    type: "split",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/double_track.webp",
    widthScreens: 1.8,
    yUpper: 240,
    yLower: 480,
  },
  {
    id: "merge-1",
    type: "merge",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/track_merge.webp",
    widthScreens: 1.8,
    yUpper: 240,
    yLower: 480,
  },
  {
    id: "curve-up-1",
    type: "curve-up",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/track_curve_up.webp",
    widthScreens: 1.8,
    yUpper: 240,
    yLower: 480,
  },
  {
    id: "curve-down-1",
    type: "curve-down",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/track_curve_down.webp",
    widthScreens: 1.8,
    yUpper: 240,
    yLower: 480,
  },
];