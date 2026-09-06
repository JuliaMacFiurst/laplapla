import type { GroupedStories, SeoEntityType } from "@/components/SeoEntityPage";
import type { Lang } from "@/i18n";
import { getStoryTypesForCanonicalRoute, getCanonicalRouteForStoryType, resolveCanonicalSlug } from "@/lib/mapEntityRouting";
import {
  MAP_ELIGIBILITY_LANGS,
  evaluateMapContentEligibility,
  getEligibleMapLocales,
  type MapEligibilityResult,
  type MapEligibilityStory,
} from "@/lib/seo/contentEligibility";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { MapPopupContent, MapPopupType } from "@/types/mapPopup";

type StoryRow = {
  id: string | number;
  type: MapPopupType;
  target_id: string;
  language: string;
  content: string | null;
  is_approved: boolean | null;
  story_status: string | null;
  needs_rewrite: boolean | null;
};

type SlideRow = {
  story_id: string | number;
  slide_order: number | null;
  text: string | null;
};

type TranslationRow = {
  content_id: string | number;
  language: string;
  translation: unknown;
};

export type EligibleMapRoute = {
  type: SeoEntityType;
  slug: string;
  eligibleLocales: Lang[];
  eligibility: Record<Lang, MapEligibilityResult>;
};

const PAGE_SIZE = 1000;
const STORY_TYPES: MapPopupType[] = ["country", "culture", "food", "animal", "weather", "river", "sea", "physic"];

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function getTranslationTextUnits(value: unknown) {
  const translation = parseRecord(value);
  if (!translation) return [];
  const slideTexts = Array.isArray(translation.slides)
    ? translation.slides.flatMap((item) => {
        const slide = parseRecord(item);
        return typeof slide?.text === "string" && slide.text.trim() ? [slide.text.trim()] : [];
      })
    : [];
  if (slideTexts.length > 0) return slideTexts;
  return typeof translation.content === "string" && translation.content.trim()
    ? [translation.content.trim()]
    : [];
}

function toEligibilityStory(
  row: StoryRow,
  textUnits: string[],
  nativeLocale: boolean,
  hasFallback: boolean,
): MapEligibilityStory {
  return {
    textUnits,
    nativeLocale,
    hasFallback,
    isApproved: row.is_approved === true,
    storyStatus: row.story_status,
    needsRewrite: row.needs_rewrite === true,
  };
}

function contentTextUnits(story: MapPopupContent) {
  const slideTexts = story.slides.map((slide) => slide.text.trim()).filter(Boolean);
  if (slideTexts.length > 0) return slideTexts;
  return typeof story.rawContent === "string" && story.rawContent.trim() ? [story.rawContent.trim()] : [];
}

export function evaluateGroupedMapStories(groupedStories: GroupedStories) {
  const stories = Object.values(groupedStories).flat().map((story) => toEligibilityStory(
    {
      id: story.storyId ?? "",
      type: story.type,
      target_id: story.targetId,
      language: story.lang,
      content: story.rawContent ?? null,
      is_approved: story.publication?.isApproved ?? false,
      story_status: story.publication?.storyStatus ?? null,
      needs_rewrite: story.publication?.needsRewrite ?? true,
    },
    contentTextUnits(story),
    story.translation?.native === true,
    story.translation?.hasRussianFallback === true,
  ));
  return evaluateMapContentEligibility(stories);
}

async function loadAllStories(): Promise<StoryRow[]> {
  const supabase = createServerSupabaseClient();
  const rows: StoryRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("map_stories")
      .select("id, type, target_id, language, content, is_approved, story_status, needs_rewrite")
      .in("type", STORY_TYPES)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data || []) as StoryRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function loadAllSlides(): Promise<SlideRow[]> {
  const supabase = createServerSupabaseClient();
  const rows: SlideRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("map_story_slides")
      .select("story_id, slide_order, text")
      .order("story_id", { ascending: true })
      .order("slide_order", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data || []) as SlideRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function loadAllTranslations(): Promise<TranslationRow[]> {
  const supabase = createServerSupabaseClient();
  const rows: TranslationRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("content_translations")
      .select("content_id, language, translation")
      .eq("content_type", "map_story")
      .in("language", ["en", "he"])
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data || []) as TranslationRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

function evaluateRouteLocales(
  stories: StoryRow[],
  slidesByStory: Map<string, string[]>,
  translations: TranslationRow[],
) {
  const translationByKey = new Map(
    translations.map((row) => [`${row.language}:${String(row.content_id)}`, row.translation]),
  );
  const results = {} as Record<Lang, MapEligibilityResult>;

  for (const lang of MAP_ELIGIBILITY_LANGS) {
    const byType = new Map<MapPopupType, StoryRow>();
    for (const row of stories) {
      const current = byType.get(row.type);
      if (!current || (row.language === lang && current.language !== lang)) byType.set(row.type, row);
    }

    const inputs = Array.from(byType.values()).map((row) => {
      const nativeRow = row.language === lang;
      const baseUnits = slidesByStory.get(String(row.id)) || (row.content?.trim() ? [row.content.trim()] : []);
      if (nativeRow) return toEligibilityStory(row, baseUnits, true, false);
      const translated = translationByKey.get(`${lang}:${String(row.id)}`) ??
        translationByKey.get(`${lang}:${row.target_id}`);
      const translatedUnits = getTranslationTextUnits(translated);
      return toEligibilityStory(row, translatedUnits.length > 0 ? translatedUnits : baseUnits, translatedUnits.length > 0, translatedUnits.length === 0);
    });
    results[lang] = evaluateMapContentEligibility(inputs);
  }
  return results;
}

export async function loadEligibleMapRoutes(): Promise<EligibleMapRoute[]> {
  const [stories, slides, translations] = await Promise.all([
    loadAllStories(),
    loadAllSlides(),
    loadAllTranslations(),
  ]);
  const slidesByStory = new Map<string, string[]>();
  for (const slide of slides) {
    const key = String(slide.story_id);
    const list = slidesByStory.get(key) || [];
    if (typeof slide.text === "string" && slide.text.trim()) list.push(slide.text.trim());
    slidesByStory.set(key, list);
  }

  const grouped = new Map<string, { type: SeoEntityType; slug: string; stories: StoryRow[] }>();
  for (const story of stories) {
    const type = getCanonicalRouteForStoryType(story.type);
    const slug = resolveCanonicalSlug(story.type, story.target_id);
    if (!type || !slug || slug === "none" || slug === "__none") continue;
    const key = `${type}:${slug}`;
    const item = grouped.get(key) || { type, slug, stories: [] };
    item.stories.push(story);
    grouped.set(key, item);
  }

  return Array.from(grouped.values()).map(({ type, slug, stories: routeStories }) => {
    const eligibility = evaluateRouteLocales(routeStories, slidesByStory, translations);
    return { type, slug, eligibility, eligibleLocales: [...getEligibleMapLocales(eligibility)] };
  });
}

export async function loadMapRouteLocaleEligibility(entityType: SeoEntityType, rawTargetId: string) {
  const supabase = createServerSupabaseClient();
  const routeTypes = getStoryTypesForCanonicalRoute(entityType);
  const { data, error } = await supabase
    .from("map_stories")
    .select("id, type, target_id, language, content, is_approved, story_status, needs_rewrite")
    .in("type", routeTypes)
    .eq("target_id", rawTargetId);
  if (error) throw error;
  const stories = (data || []) as StoryRow[];
  const ids = stories.map((story) => story.id);
  const translationIds = [...ids, rawTargetId];
  const [slideResult, translationResult] = await Promise.all([
    ids.length > 0
      ? supabase.from("map_story_slides").select("story_id, slide_order, text").in("story_id", ids).order("slide_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    translationIds.length > 0
      ? supabase.from("content_translations").select("content_id, language, translation").eq("content_type", "map_story").in("language", ["en", "he"]).in("content_id", translationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (slideResult.error) throw slideResult.error;
  if (translationResult.error) throw translationResult.error;
  const slidesByStory = new Map<string, string[]>();
  for (const slide of (slideResult.data || []) as SlideRow[]) {
    const key = String(slide.story_id);
    const list = slidesByStory.get(key) || [];
    if (slide.text?.trim()) list.push(slide.text.trim());
    slidesByStory.set(key, list);
  }
  const eligibility = evaluateRouteLocales(stories, slidesByStory, (translationResult.data || []) as TranslationRow[]);
  return { eligibility, eligibleLocales: [...getEligibleMapLocales(eligibility)] };
}
