const PUBLIC_MEDIA_ORIGIN = "https://media.laplapla.com";
const BANNER_BASE = `${PUBLIC_MEDIA_ORIGIN}/quests/sound-case-001/banners/sound-case-001-banners`;
const SHOP_PREVIEW_BASE = `${PUBLIC_MEDIA_ORIGIN}/quests/sound-case-001/banners/shop-preview`;
const SHOP_PREVIEW_REVISION = "20261009-195611";
const STICKER_BASE = `${PUBLIC_MEDIA_ORIGIN}/stickers/singing-dune-stickers`;
const shopPreviewUrl = (filename: string) =>
  `${SHOP_PREVIEW_BASE}/${filename}?v=${SHOP_PREVIEW_REVISION}`;

export const SOUND_CASE_PROMO_MEDIA = {
  banners: {
    horizontal: `${BANNER_BASE}/banner-horizontal.webp`,
    square: `${BANNER_BASE}/banner-square.webp`,
    vertical: `${BANNER_BASE}/banner-vertical.webp`,
  },
  shopPreview: {
    personalizedA4Pages: shopPreviewUrl("Personalized-A4-pages.webp"),
    adventureStages: shopPreviewUrl("8-adventure-stages.webp"),
    printableCardsAndClues: shopPreviewUrl("Printable-cards-and-clues.webp"),
    qrInteractiveActivities: shopPreviewUrl("QR-codes-for-interactive-activities.webp"),
    soundMiniGames: shopPreviewUrl("Sound-mini-games-and-experiments.webp"),
    collectibleCards: shopPreviewUrl("Cards_Asset.webp"),
  },
  stickers: {
    parrotWithSandBag: `${STICKER_BASE}/1-sticker-1.webp`,
    singingGrains: `${STICKER_BASE}/singing-dune-stickers-sticker-4.webp`,
    singingDune: `${STICKER_BASE}/singing-dune-stickers-sticker-13.webp`,
  },
} as const;

export const SOUND_CASE_PRODUCT_INCLUDED_MEDIA = [
  SOUND_CASE_PROMO_MEDIA.shopPreview.personalizedA4Pages,
  SOUND_CASE_PROMO_MEDIA.shopPreview.adventureStages,
  SOUND_CASE_PROMO_MEDIA.shopPreview.printableCardsAndClues,
  SOUND_CASE_PROMO_MEDIA.shopPreview.qrInteractiveActivities,
  SOUND_CASE_PROMO_MEDIA.shopPreview.soundMiniGames,
  SOUND_CASE_PROMO_MEDIA.shopPreview.collectibleCards,
] as const;
