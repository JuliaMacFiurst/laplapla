export const ADS_ENABLED: boolean = false;

export const AD_PREVIEW_ENABLED =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_AD_PREVIEW === "true";

type AdPlacementConfig = {
  enabled: boolean;
  slotId: string | null;
};

export const AD_PLACEMENTS = {
  "cats-story-studio-bottom": { enabled: true, slotId: null },
  "dogs-category-bottom": { enabled: true, slotId: null },
  "dogs-lessons-bottom": { enabled: true, slotId: null },
  "capybara-library-bottom": { enabled: true, slotId: null },
  "capybara-book-content": { enabled: true, slotId: null },
  "capybara-story-create-bottom": { enabled: true, slotId: null },
  "parrots-style-bottom": { enabled: true, slotId: null },
  "parrots-mixer-bottom": { enabled: true, slotId: null },
  "raccoon-kitchen-bottom": { enabled: true, slotId: null },
  "raccoon-recipe-bottom": { enabled: true, slotId: null },
  "raccoon-quests-bottom": { enabled: true, slotId: null },
  "raccoon-article-content": { enabled: true, slotId: null },
  "raccoon-article-bottom": { enabled: true, slotId: null },
  "applab-bottom": { enabled: true, slotId: null },
} as const satisfies Record<string, AdPlacementConfig>;

export type AdPlacement = keyof typeof AD_PLACEMENTS;

export function canRenderAdPlacement(placement: AdPlacement) {
  const config = AD_PLACEMENTS[placement];
  return config.enabled && (ADS_ENABLED || AD_PREVIEW_ENABLED);
}
