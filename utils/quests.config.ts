import { buildSupabaseStorageUrl } from "@/lib/publicAssetUrls";

export const COMING_SOON_IMAGES = [
  buildSupabaseStorageUrl("quests/1_quest/images/coming-soon-winter.webp"),
  buildSupabaseStorageUrl("quests/1_quest/images/coming-soon-summer.webp"),
];

export const quests = {
  featured: {
    id: 'quest-1',
    title: 'К северным берегам',
    subtitle: 'Первый большой квест',
    image:
      buildSupabaseStorageUrl("quests/1_quest/images/first-quest-afisha.webp"),
    status: 'active' as const,
  },

  upcoming: [
    { id: 'south', status: 'coming_soon' as const },
    { id: 'ocean', status: 'coming_soon' as const },
  ].map((quest, index) => ({
    ...quest,
    image: COMING_SOON_IMAGES[index % COMING_SOON_IMAGES.length],
  })),
};
