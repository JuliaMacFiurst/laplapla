export interface BackgroundLayer {
  id: string;
  src: string;
  speedMultiplier: number; // относительно скорости заезда
  zIndex: number;
}

export const BACKGROUND_LAYERS: BackgroundLayer[] = [
  {
    id: "sky",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/sky.webp",
    speedMultiplier: 0.1,
    zIndex: 1,
  },
  {
    id: "mountains",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/mountains.webp",
    speedMultiplier: 0.3,
    zIndex: 2,
  },
  {
    id: "hills",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/hills.webp",
    speedMultiplier: 0.6,
    zIndex: 3,
  },
  {
    id: "front",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/front.webp",
    speedMultiplier: 1,
    zIndex: 4,
  },
];