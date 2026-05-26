import { createServerSupabaseClient } from "@/lib/server/supabase";
import { getTranslationPayload, getTranslationPayloadMap } from "@/lib/contentTranslations";
import { listR2Objects } from "@/lib/r2";
import type { Lang } from "@/i18n";

export type RecipeStep = {
  order?: number | null;
  text?: string | null;
};

export type RecipeMediaAsset = {
  url?: string | null;
  path?: string | null;
  label?: string | null;
  kind?: string | null;
  name?: string | null;
};

export type RecipeLayoutJson = {
  assets?: RecipeMediaAsset[] | null;
  elements?: RecipeMediaAsset[] | null;
};

export type Recipe = {
  id: string;
  slug: string;
  asset_set_key: string | null;
  sticker_set_key: string | null;
  country_target_id: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  country: string | null;
  ingredients: string[] | null;
  fact: string | null;
  raccoon_caption: string | null;
  cooking_time: string | null;
  cooking_steps: RecipeStep[] | null;
  raccoon_advice: string | null;
  serving_instructions: string | null;
  laplapla_interaction_caption: string | null;
  hashtags: string[] | null;
  publish_date: string | null;
  exported_image_urls: Partial<Record<Lang, string>> | null;
  layout_json: RecipeLayoutJson | null;
  gradient_from: string | null;
  gradient_to: string | null;
  is_active: boolean | null;
  updated_at: string | null;
  created_at: string | null;
};

const RECIPE_SELECT = [
  "id",
  "slug",
  "asset_set_key",
  "sticker_set_key",
  "country_target_id",
  "title",
  "description",
  "image_url",
  "country",
  "ingredients",
  "fact",
  "raccoon_caption",
  "cooking_time",
  "cooking_steps",
  "raccoon_advice",
  "serving_instructions",
  "laplapla_interaction_caption",
  "hashtags",
  "publish_date",
  "exported_image_urls",
  "layout_json",
  "gradient_from",
  "gradient_to",
  "is_active",
  "updated_at",
  "created_at",
].join(",");

const RECIPE_LIST_SELECT = [
  "id",
  "slug",
  "asset_set_key",
  "sticker_set_key",
  "country_target_id",
  "title",
  "description",
  "image_url",
  "country",
  "cooking_time",
  "publish_date",
  "exported_image_urls",
  "gradient_from",
  "gradient_to",
  "is_active",
  "updated_at",
  "created_at",
].join(",");

function normalizeRecipe(row: Record<string, unknown>): Recipe {
  return {
    id: String(row.id || ""),
    slug: String(row.slug || ""),
    asset_set_key: typeof row.asset_set_key === "string" ? row.asset_set_key : null,
    sticker_set_key: typeof row.sticker_set_key === "string" ? row.sticker_set_key : null,
    country_target_id: typeof row.country_target_id === "string" ? row.country_target_id : null,
    title: String(row.title || ""),
    description: typeof row.description === "string" ? row.description : null,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    country: typeof row.country === "string" ? row.country : null,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients.map(String) : null,
    fact: typeof row.fact === "string" ? row.fact : null,
    raccoon_caption: typeof row.raccoon_caption === "string" ? row.raccoon_caption : null,
    cooking_time: typeof row.cooking_time === "string" ? row.cooking_time : null,
    cooking_steps: Array.isArray(row.cooking_steps) ? (row.cooking_steps as RecipeStep[]) : null,
    raccoon_advice: typeof row.raccoon_advice === "string" ? row.raccoon_advice : null,
    serving_instructions: typeof row.serving_instructions === "string" ? row.serving_instructions : null,
    laplapla_interaction_caption:
      typeof row.laplapla_interaction_caption === "string" ? row.laplapla_interaction_caption : null,
    hashtags: Array.isArray(row.hashtags) ? row.hashtags.map(String) : null,
    publish_date: typeof row.publish_date === "string" ? row.publish_date : null,
    exported_image_urls:
      row.exported_image_urls && typeof row.exported_image_urls === "object"
        ? (row.exported_image_urls as Partial<Record<Lang, string>>)
        : null,
    layout_json:
      row.layout_json && typeof row.layout_json === "object"
        ? (row.layout_json as RecipeLayoutJson)
        : null,
    gradient_from: typeof row.gradient_from === "string" ? row.gradient_from : null,
    gradient_to: typeof row.gradient_to === "string" ? row.gradient_to : null,
    is_active: typeof row.is_active === "boolean" ? row.is_active : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
  };
}

export function getRecipeCardImage(recipe: Pick<Recipe, "exported_image_urls" | "image_url">, lang: Lang) {
  return getRecipeExportImage(recipe, lang) || recipe.image_url || null;
}

export function getRecipeExportImage(recipe: Pick<Recipe, "exported_image_urls">, lang: Lang) {
  return recipe.exported_image_urls?.[lang] || recipe.exported_image_urls?.ru || null;
}

export function getRecipeRaccoonImages(recipe: Recipe) {
  return getRecipeRaccoonStickerAssets(recipe).map((asset) => asset.url);
}

export function getRecipeRaccoonStickerAssets(recipe: Recipe) {
  const candidates = [
    ...(recipe.layout_json?.assets || []),
    ...(recipe.layout_json?.elements || []),
  ];
  const seen = new Set<string>();

  return candidates
    .filter((asset) => {
      const assetName = getRecipeAssetName(asset).toLowerCase();
      return assetName.includes("raccoon");
    })
    .filter((asset): asset is RecipeMediaAsset & { url: string } => Boolean(asset.url && !seen.has(asset.url) && seen.add(asset.url)));
}

export function getRecipeAssetName(asset: RecipeMediaAsset) {
  const source = asset.name || asset.label || asset.path || asset.url || "";
  try {
    const pathname = source.startsWith("http") ? new URL(source).pathname : source;
    return pathname.split("/").filter(Boolean).pop() || source;
  } catch {
    return source.split("/").filter(Boolean).pop() || source;
  }
}

export function getRecipeDownloadTargetId(recipe: Pick<Recipe, "country_target_id" | "asset_set_key" | "slug">) {
  return recipe.country_target_id || recipe.asset_set_key || recipe.slug;
}

export function getRecipeStickerPackFileName(recipe: Pick<Recipe, "country_target_id" | "asset_set_key" | "slug">) {
  const targetId = getRecipeDownloadTargetId(recipe)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${targetId || "recipe"}_raccoons_laplapla`;
}

const isRaccoonAssetName = (value: string) =>
  value.split("/").filter(Boolean).pop()?.toLowerCase().includes("raccoon") ?? false;

export async function loadRecipeRaccoonStickerUrls(recipe: Recipe) {
  const stickerSetKey = recipe.sticker_set_key?.trim();
  const fallbackUrls = getRecipeRaccoonStickerAssets(recipe)
    .map((asset) => asset.url)
    .filter((url): url is string => Boolean(url));

  if (!stickerSetKey) {
    return fallbackUrls;
  }

  try {
    const objects = await listR2Objects(`stickers/raccoon-stickers/${stickerSetKey}/`);
    const urls = objects
      .filter((item) => isRaccoonAssetName(item.key))
      .map((item) => item.url)
      .filter(Boolean);

    return urls.length > 0 ? urls : fallbackUrls;
  } catch (error) {
    console.error("[recipes] failed to list R2 sticker pack", error);
    return fallbackUrls;
  }
}

function applyRecipeTranslation(recipe: Recipe, translation: unknown): Recipe {
  const payload = translation && typeof translation === "object" && !Array.isArray(translation)
    ? translation as Partial<Recipe>
    : null;

  if (!payload) {
    return recipe;
  }

  return {
    ...recipe,
    title: typeof payload.title === "string" && payload.title.trim() ? payload.title : recipe.title,
    description: typeof payload.description === "string" && payload.description.trim() ? payload.description : recipe.description,
    country: typeof payload.country === "string" && payload.country.trim() ? payload.country : recipe.country,
    ingredients: Array.isArray(payload.ingredients) ? payload.ingredients.map(String) : recipe.ingredients,
    fact: typeof payload.fact === "string" && payload.fact.trim() ? payload.fact : recipe.fact,
    raccoon_caption:
      typeof payload.raccoon_caption === "string" && payload.raccoon_caption.trim()
        ? payload.raccoon_caption
        : recipe.raccoon_caption,
    cooking_time:
      typeof payload.cooking_time === "string" && payload.cooking_time.trim()
        ? payload.cooking_time
        : recipe.cooking_time,
    cooking_steps: Array.isArray(payload.cooking_steps) ? payload.cooking_steps as RecipeStep[] : recipe.cooking_steps,
    raccoon_advice:
      typeof payload.raccoon_advice === "string" && payload.raccoon_advice.trim()
        ? payload.raccoon_advice
        : recipe.raccoon_advice,
    serving_instructions:
      typeof payload.serving_instructions === "string" && payload.serving_instructions.trim()
        ? payload.serving_instructions
        : recipe.serving_instructions,
    laplapla_interaction_caption:
      typeof payload.laplapla_interaction_caption === "string" && payload.laplapla_interaction_caption.trim()
        ? payload.laplapla_interaction_caption
        : recipe.laplapla_interaction_caption,
    hashtags: Array.isArray(payload.hashtags) ? payload.hashtags.map(String) : recipe.hashtags,
  };
}

export async function translateRecipeForLang(recipe: Recipe, lang: Lang) {
  if (lang === "ru") {
    return recipe;
  }

  const translation = await getTranslationPayload("recipe", recipe.id, lang);
  return applyRecipeTranslation(recipe, translation);
}

export async function translateRecipesForLang(recipes: Recipe[], lang: Lang) {
  if (lang === "ru" || recipes.length === 0) {
    return recipes;
  }

  const translationMap = await getTranslationPayloadMap("recipe", recipes.map((recipe) => recipe.id), lang);
  return recipes.map((recipe) => applyRecipeTranslation(recipe, translationMap.get(String(recipe.id))));
}

export async function loadActiveRecipes(limit = 24, lang: Lang = "ru") {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_LIST_SELECT)
    .eq("is_active", true)
    .order("publish_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const recipes = (data || []).map((row) => normalizeRecipe(row as unknown as Record<string, unknown>));
  return translateRecipesForLang(recipes, lang);
}

export async function loadRecipeBySlug(slug: string, lang: Lang = "ru") {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? translateRecipeForLang(normalizeRecipe(data as unknown as Record<string, unknown>), lang) : null;
}

export async function loadRecipeSitemapPaths() {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("recipes")
    .select("slug")
    .eq("is_active", true)
    .order("publish_date", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[sitemap] failed to load recipes", error);
    return [];
  }

  return (data || [])
    .map((row) => (typeof row.slug === "string" ? row.slug.trim() : ""))
    .filter(Boolean)
    .map((slug) => `/raccoons/kitchen/${slug}`);
}
