const PUBLIC_MEDIA_ORIGIN = "https://media.laplapla.com";
const BANNER_BASE = `${PUBLIC_MEDIA_ORIGIN}/quests/sound-case-001/banners/sound-case-001-banners`;
const STICKER_BASE = `${PUBLIC_MEDIA_ORIGIN}/stickers/singing-dune-stickers`;

export const SOUND_CASE_PROMO_MEDIA = {
  banners: {
    horizontal: `${BANNER_BASE}/banner-horizontal.webp`,
    square: `${BANNER_BASE}/banner-square.webp`,
    vertical: `${BANNER_BASE}/banner-vertical.webp`,
  },
  stickers: {
    parrotWithSandBag: `${STICKER_BASE}/1-sticker-1.webp`,
    singingGrains: `${STICKER_BASE}/singing-dune-stickers-sticker-4.webp`,
    singingDune: `${STICKER_BASE}/singing-dune-stickers-sticker-13.webp`,
  },
} as const;
