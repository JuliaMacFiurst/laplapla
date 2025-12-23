export const COMING_SOON_IMAGES = [
  'https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/coming-soon-winter.webp',
  'https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/coming-soon-summer.webp',
];

export const quests = {
  featured: {
    id: 'north',
    title: 'К северным берегам',
    subtitle: 'Первый большой квест',
    image:
      'https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/first-quest-afisha.webp',
    status: 'active',
  },

  upcoming: [
    { id: 'south', status: 'coming_soon' },
    { id: 'ocean', status: 'coming_soon' },
  ].map((quest, index) => ({
    ...quest,
    image: COMING_SOON_IMAGES[index % COMING_SOON_IMAGES.length],
  })),
};