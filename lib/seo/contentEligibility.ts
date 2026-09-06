import type { Lang } from "@/i18n";

export type ContentEligibility = {
  indexEligible: boolean;
  sitemapEligible: boolean;
  localeEligible: boolean;
  adsEligible: boolean;
};

export type MapEligibilityStory = {
  textUnits: string[];
  nativeLocale: boolean;
  hasFallback: boolean;
  isApproved: boolean;
  storyStatus: string | null;
  needsRewrite: boolean;
};

export type MapEligibilityResult = ContentEligibility & {
  reason: "eligible" | "fallback-locale" | "empty-content" | "incomplete-content";
};

export const MAP_ELIGIBILITY_LANGS: readonly Lang[] = ["ru", "en", "he"];

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

function isStructurallyComplete(stories: MapEligibilityStory[]) {
  if (stories.length === 0) return false;

  const normalizedUnits = stories.flatMap((story) => story.textUnits.map(normalizeText).filter(Boolean));
  const combinedText = normalizedUnits.join(" ");
  const sentenceCount = combinedText
    .split(/[.!?。！？]+(?:\s|$)/u)
    .map(normalizeText)
    .filter(Boolean).length;

  const publicationStateIsComplete = stories.every((story) =>
    story.isApproved &&
    story.needsRewrite === false &&
    story.storyStatus?.trim().toLowerCase() === "ready",
  );

  // Length is deliberately only a secondary guard. Eligibility also requires
  // native locale content, an explicit completed publication state, and enough
  // structure to form a standalone page rather than an isolated fragment.
  return publicationStateIsComplete &&
    combinedText.length >= 800 &&
    (normalizedUnits.length >= 4 || sentenceCount >= 4);
}

export function evaluateMapContentEligibility(stories: MapEligibilityStory[]): MapEligibilityResult {
  const localeEligible = stories.length > 0 && stories.every(
    (story) => story.nativeLocale && !story.hasFallback,
  );
  const hasContent = stories.some((story) => story.textUnits.some((unit) => normalizeText(unit).length > 0));
  const contentComplete = hasContent && isStructurallyComplete(stories);
  const eligible = localeEligible && contentComplete;

  const reason: MapEligibilityResult["reason"] = !localeEligible
    ? "fallback-locale"
    : !hasContent
      ? "empty-content"
      : !contentComplete
        ? "incomplete-content"
        : "eligible";

  return {
    indexEligible: eligible,
    sitemapEligible: eligible,
    localeEligible,
    adsEligible: eligible,
    reason,
  };
}

export function getEligibleMapLocales(results: Record<Lang, MapEligibilityResult>) {
  return MAP_ELIGIBILITY_LANGS.filter((lang) => results[lang].localeEligible && results[lang].indexEligible);
}

export function isActiveRecipeEligible(active: boolean): ContentEligibility {
  return {
    indexEligible: active,
    sitemapEligible: active,
    localeEligible: true,
    adsEligible: active,
  };
}
