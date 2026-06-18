import Link from "next/link";
import Image from "next/image";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useEffect, useRef, type CSSProperties } from "react";
import CorePageLinks from "@/components/CorePageLinks";
import SEO from "@/components/SEO";
import { BASE_URL } from "@/lib/config";
import { buildLocalizedPublicPath, isLang } from "@/lib/i18n/routing";
import { dictionaries, type Lang } from "@/i18n";
import { trackEvent } from "@/lib/analytics/client";
import {
  getRecipeExportImage,
  getRecipeRaccoonImages,
  getRecipeStickerPackFileName,
  loadRecipeBySlug,
  loadRecipeRaccoonStickerUrls,
  type Recipe,
  type RecipeStep,
} from "@/lib/recipes";

type Props = {
  lang: Lang;
  recipe: Recipe;
  raccoonImages: string[];
  stickerDownloadHref: string | null;
  stickerDownloadName: string;
  collageImage: string | null;
};

const RECIPE_UI: Record<Lang, {
  back: string;
  ingredients: string;
  steps: string;
  fact: string;
  advice: string;
  serving: string;
  time: string;
  country: string;
  raccoonGallery: string;
  downloadStickers: string;
  collageTitle: string;
  openCollage: string;
  closeCollage: string;
  kitchen: string;
}> = {
  ru: {
    back: "Назад в Кухню Енотиков",
    ingredients: "Ингредиенты",
    steps: "Как готовить",
    fact: "Факт",
    advice: "Совет енотика",
    serving: "Как подать",
    time: "Время",
    country: "Страна",
    raccoonGallery: "Енотики-путешественники",
    downloadStickers: "Скачать стикерпак с енотиками",
    collageTitle: "Коллаж рецепта",
    openCollage: "Открыть коллаж на весь экран",
    closeCollage: "Закрыть просмотр",
    kitchen: "Кухня Енотиков",
  },
  en: {
    back: "Back to Raccoon Kitchen",
    ingredients: "Ingredients",
    steps: "Method",
    fact: "Fact",
    advice: "Raccoon advice",
    serving: "Serving",
    time: "Time",
    country: "Country",
    raccoonGallery: "Traveler raccoons",
    downloadStickers: "Download the raccoon sticker pack",
    collageTitle: "Recipe collage",
    openCollage: "Open collage full screen",
    closeCollage: "Close viewer",
    kitchen: "Raccoon Kitchen",
  },
  he: {
    back: "חזרה למטבח הדביבונים",
    ingredients: "מרכיבים",
    steps: "איך מכינים",
    fact: "עובדה",
    advice: "עצת הדביבון",
    serving: "הגשה",
    time: "זמן",
    country: "מדינה",
    raccoonGallery: "דביבונים מטיילים",
    downloadStickers: "להוריד חבילת מדבקות דביבונים",
    collageTitle: "קולאז' המתכון",
    openCollage: "לפתוח קולאז' במסך מלא",
    closeCollage: "לסגור תצוגה",
    kitchen: "מטבח הדביבונים",
  },
};

function getIsoDuration(value: string | null) {
  if (!value) {
    return undefined;
  }

  const minutes = value.match(/(\d+)\s*(?:мин|minutes?|דק)/i)?.[1];
  if (!minutes) {
    return undefined;
  }

  return `PT${minutes}M`;
}

function getStepText(step: RecipeStep | string) {
  return typeof step === "string" ? step : step.text || "";
}

function getStepOrder(step: RecipeStep | string, index: number) {
  return typeof step === "string" || !step.order ? index + 1 : step.order;
}

function RecipeInfoPill({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <span className="recipe-info-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const slug = typeof context.params?.slug === "string" ? context.params.slug : "";
  const lang = isLang(context.locale) ? context.locale : isLang(context.query.lang) ? context.query.lang : "ru";
  const recipe = await loadRecipeBySlug(slug, lang);

  if (!recipe) {
    return { notFound: true };
  }

  const stickerUrls = await loadRecipeRaccoonStickerUrls(recipe);
  const raccoonImages = stickerUrls.length > 0 ? stickerUrls : getRecipeRaccoonImages(recipe);

  return {
    props: {
      lang,
      recipe: {
        ...recipe,
        layout_json: null,
      },
      raccoonImages,
      stickerDownloadHref: stickerUrls.length > 0 ? `/api/recipes/${encodeURIComponent(recipe.slug)}/raccoon-stickers` : null,
      stickerDownloadName: `${getRecipeStickerPackFileName(recipe)}.zip`,
      collageImage: getRecipeExportImage(recipe, lang),
    },
  };
};

export default function RaccoonRecipePage({
  lang,
  recipe,
  raccoonImages,
  stickerDownloadHref,
  stickerDownloadName,
  collageImage,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const dict = dictionaries[lang] || dictionaries.ru;
  const ui = RECIPE_UI[lang];
  const seoTitle = `${recipe.title} — ${ui.kitchen}`;
  const seoDescription = recipe.description || dict.seo.raccoons.index.description;
  const recipePath = `/raccoons/kitchen/${recipe.slug}`;
  const canonicalUrl = `${BASE_URL}${buildLocalizedPublicPath(recipePath, lang)}`;
  const steps = (recipe.cooking_steps || []).filter((step) => getStepText(step).trim());
  const stepsPanelRef = useRef<HTMLElement | null>(null);
  const completionMarkerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    trackEvent({
      eventName: "recipe_opened",
      entityType: "recipe",
      entityId: recipe.slug,
      entityTitle: recipe.title,
      page: recipePath,
      lang,
      properties: {
        section: "recipes",
        content_id: recipe.slug,
        content_slug: recipe.slug,
        content_title: recipe.title,
        language: lang,
        total_steps: steps.length,
        country: recipe.country || null,
        hasCollage: Boolean(collageImage),
      },
    });
  }, [collageImage, lang, recipe.country, recipe.slug, recipe.title, recipePath, steps.length]);

  useEffect(() => {
    const target = stepsPanelRef.current;
    if (!target || steps.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    let tracked = false;
    const observer = new IntersectionObserver((entries) => {
      if (tracked || !entries.some((entry) => entry.isIntersecting)) {
        return;
      }

      tracked = true;
      trackEvent("recipe_steps_viewed", {
        section: "recipes",
        content_id: recipe.slug,
        content_slug: recipe.slug,
        content_title: recipe.title,
        language: lang,
        completion_percent: 50,
        total_steps: steps.length,
      });
      observer.disconnect();
    }, { threshold: 0.35 });

    observer.observe(target);
    return () => observer.disconnect();
  }, [lang, recipe.slug, recipe.title, steps.length]);

  useEffect(() => {
    const target = completionMarkerRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      return;
    }

    let tracked = false;
    const observer = new IntersectionObserver((entries) => {
      if (tracked || !entries.some((entry) => entry.isIntersecting)) {
        return;
      }

      tracked = true;
      trackEvent("content_complete", {
        section: "recipes",
        content_id: recipe.slug,
        content_slug: recipe.slug,
        content_title: recipe.title,
        language: lang,
        completion_percent: 100,
        total_steps: steps.length || null,
      });
      observer.disconnect();
    }, { threshold: 0.25 });

    observer.observe(target);
    return () => observer.disconnect();
  }, [lang, recipe.slug, recipe.title, steps.length]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "@id": `${canonicalUrl}#recipe`,
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
    name: recipe.title,
    description: seoDescription,
    image: recipe.image_url ? [recipe.image_url] : undefined,
    author: {
      "@type": "Organization",
      name: "LapLapLa",
      url: BASE_URL,
    },
    datePublished: recipe.publish_date || undefined,
    keywords: recipe.hashtags?.map((tag) => tag.replace(/^#/, "")).join(", ") || undefined,
    inLanguage: lang,
    recipeCuisine: recipe.country || undefined,
    totalTime: getIsoDuration(recipe.cooking_time),
    recipeIngredient: recipe.ingredients || undefined,
    recipeInstructions: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: getStepOrder(step, index),
      text: getStepText(step),
    })),
  };

  return (
    <>
      <SEO title={seoTitle} description={seoDescription} path={recipePath} type="article" jsonLd={jsonLd} />
      <main
        className="raccoon-recipe-page"
        dir={lang === "he" ? "rtl" : "ltr"}
        style={{
          "--recipe-gradient-from": recipe.gradient_from || "#fff3bf",
          "--recipe-gradient-to": recipe.gradient_to || "#ffd8a8",
        } as CSSProperties}
      >
        <nav className="recipe-top-nav" aria-label="breadcrumb">
          <Link href={`${buildLocalizedPublicPath("/raccoons", lang)}#kitchen`} className="recipe-back-link">
            {ui.back}
          </Link>
        </nav>

        <article className="recipe-article">
          <header className="recipe-hero">
            <div className="recipe-hero-copy">
              <p className="recipe-kicker">{ui.kitchen}</p>
              <h1>{recipe.title}</h1>
              {recipe.description ? <p className="recipe-description">{recipe.description}</p> : null}
              <div className="recipe-info-row">
                <RecipeInfoPill label={ui.country} value={recipe.country} />
                <RecipeInfoPill label={ui.time} value={recipe.cooking_time} />
              </div>
            </div>
            {recipe.image_url ? (
              <figure className="recipe-photo">
                <Image
                  src={recipe.image_url}
                  alt={recipe.title}
                  width={720}
                  height={720}
                  sizes="(max-width: 767px) 86vw, (max-width: 900px) 390px, 42vw"
                  priority
                  unoptimized
                />
                {recipe.raccoon_caption ? <figcaption>{recipe.raccoon_caption}</figcaption> : null}
              </figure>
            ) : null}
          </header>

          <div className="recipe-content-grid">
            <section className="recipe-panel">
              <h2>{ui.ingredients}</h2>
              <ul className="recipe-ingredient-list">
                {(recipe.ingredients || []).map((ingredient) => (
                  <li key={ingredient}>{ingredient}</li>
                ))}
              </ul>
            </section>

            <section ref={stepsPanelRef} className="recipe-panel recipe-steps-panel">
              <h2>{ui.steps}</h2>
              <ol className="recipe-step-list">
                {steps.map((step, index) => (
                  <li key={`${getStepOrder(step, index)}-${getStepText(step)}`}>
                    <span>{getStepText(step)}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="recipe-note-grid">
            {recipe.fact ? (
              <section className="recipe-note">
                <h2>{ui.fact}</h2>
                <p>{recipe.fact}</p>
              </section>
            ) : null}
            {recipe.raccoon_advice ? (
              <section className="recipe-note">
                <h2>{ui.advice}</h2>
                <p>{recipe.raccoon_advice}</p>
              </section>
            ) : null}
            {recipe.serving_instructions ? (
              <section className="recipe-note">
                <h2>{ui.serving}</h2>
                <p>{recipe.serving_instructions}</p>
              </section>
            ) : null}
          </div>

          {raccoonImages.length > 0 ? (
            <section className="recipe-raccoon-gallery" aria-labelledby="recipe-raccoon-gallery-title">
              <div className="recipe-section-heading-row">
                <h2 id="recipe-raccoon-gallery-title">{ui.raccoonGallery}</h2>
                {stickerDownloadHref ? (
                  <a
                    className="recipe-sticker-download-button"
                    href={stickerDownloadHref}
                    download={stickerDownloadName}
                  >
                    {ui.downloadStickers}
                  </a>
                ) : null}
              </div>
              <div className="recipe-raccoon-sticker-grid">
                {raccoonImages.map((url) => (
                  <span key={url} className="recipe-raccoon-sticker-frame">
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="130px"
                      unoptimized
                    />
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {recipe.laplapla_interaction_caption ? (
            <p className="recipe-outro">{recipe.laplapla_interaction_caption}</p>
          ) : null}

          {collageImage ? (
            <section className="recipe-collage-viewer" aria-labelledby="recipe-collage-title">
              <div className="recipe-section-heading-row">
                <h2 id="recipe-collage-title">{ui.collageTitle}</h2>
                <a className="recipe-sticker-download-button" href="#recipe-collage-fullscreen">
                  {ui.openCollage}
                </a>
              </div>
              <a className="recipe-collage-preview" href="#recipe-collage-fullscreen" aria-label={ui.openCollage}>
                <Image
                  src={collageImage}
                  alt={recipe.title}
                  width={900}
                  height={1200}
                  sizes="(max-width: 767px) 92vw, 520px"
                  unoptimized
                />
              </a>
              <div id="recipe-collage-fullscreen" className="recipe-collage-fullscreen" role="dialog" aria-modal="true" aria-label={ui.collageTitle}>
                <a className="recipe-collage-fullscreen-backdrop" href="#recipe-collage-title" aria-label={ui.closeCollage} />
                <div className="recipe-collage-fullscreen-content">
                  <a className="recipe-collage-close" href="#recipe-collage-title" aria-label={ui.closeCollage}>
                    ×
                  </a>
                  <Image
                    src={collageImage}
                    alt={recipe.title}
                    width={1200}
                    height={1600}
                    sizes="96vw"
                    unoptimized
                  />
                </div>
              </div>
            </section>
          ) : null}

          <section className="recipe-hidden-seo">
            <CorePageLinks current="raccoons" lang={lang} related={["home", "cats", "book"]} />
          </section>
          <div ref={completionMarkerRef} aria-hidden="true" />
        </article>
      </main>
    </>
  );
}
