export const ADS_ENABLED: boolean = false;

export const AD_PREVIEW_ENABLED =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_AD_PREVIEW === "true";

type AdPlacementConfig = {
  enabled: boolean;
  slotId: string | null;
  policy: "safe" | "conditional" | "disabled";
};

export const AD_PLACEMENTS = {
  "cats-story-studio-bottom": { enabled: false, slotId: null, policy: "disabled" },
  "dogs-category-bottom": { enabled: false, slotId: null, policy: "disabled" },
  "dogs-lessons-bottom": { enabled: false, slotId: null, policy: "disabled" },
  "capybara-library-bottom": { enabled: false, slotId: null, policy: "disabled" },
  "capybara-book-content": { enabled: false, slotId: null, policy: "conditional" },
  "capybara-story-create-bottom": { enabled: false, slotId: null, policy: "disabled" },
  "parrots-style-bottom": { enabled: false, slotId: null, policy: "disabled" },
  "parrots-mixer-bottom": { enabled: false, slotId: null, policy: "disabled" },
  "raccoon-kitchen-bottom": { enabled: false, slotId: null, policy: "disabled" },
  "raccoon-recipe-bottom": { enabled: true, slotId: null, policy: "safe" },
  "raccoon-quests-bottom": { enabled: false, slotId: null, policy: "disabled" },
  "raccoon-article-content": { enabled: false, slotId: null, policy: "conditional" },
  "raccoon-article-bottom": { enabled: false, slotId: null, policy: "conditional" },
  "applab-bottom": { enabled: false, slotId: null, policy: "disabled" },
} as const satisfies Record<string, AdPlacementConfig>;

export type AdPlacement = keyof typeof AD_PLACEMENTS;

export function isAdPlacementEligible(placement: AdPlacement, pageAdsEligible: boolean) {
  const config = AD_PLACEMENTS[placement];
  return config.enabled && config.policy === "safe" && pageAdsEligible;
}

export function canRenderAdPlacement(placement: AdPlacement, pageAdsEligible: boolean) {
  return isAdPlacementEligible(placement, pageAdsEligible) && (ADS_ENABLED || AD_PREVIEW_ENABLED);
}
