import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

import CorePageLinks from "@/components/CorePageLinks";
import SEO from "@/components/SEO";
import { dictionaries, type Lang } from "../i18n";
import { VideoSection } from "../components/video/VideoSection";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useResponsiveViewport } from "@/hooks/useResponsiveViewport";
import { BASE_URL } from "@/lib/config";
import { GEO_PROFILES, buildHomeGeoJsonLd } from "@/lib/geo";
import type { HomepageRetentionData } from "@/lib/homeRetention";

const HOME_ALTERNATES = [
  { hrefLang: "ru", href: BASE_URL },
  { hrefLang: "en", href: `${BASE_URL}/en` },
  { hrefLang: "he", href: `${BASE_URL}/he` },
  { hrefLang: "x-default", href: BASE_URL },
];

const RETENTION_UI: Record<Lang, {
  title: string;
  recipe: string;
  dogs: string;
  bedtime: string;
  empty: string;
  recipeBadge: string;
  lessonBadge: string;
  openRecipe: string;
  openLesson: string;
  bedtimeSoon: string;
  recipeArchive: string;
  drawingArchive: string;
  bedtimeArchive: string;
}> = {
  ru: {
    title: "✨ Новинки от LapLapLa",
    recipe: "Рецепт недели",
    dogs: "Пёсики нарисуют",
    bedtime: "Сказки на ночь",
    empty: "Скоро появится",
    recipeBadge: "Новый рецепт каждую пятницу",
    lessonBadge: "Урок дня",
    openRecipe: "Открыть рецепт",
    openLesson: "Начать рисовать",
    bedtimeSoon: "Здесь скоро поселятся вечерние истории.",
    recipeArchive: "Архив рецептов",
    drawingArchive: "Все уроки рисования",
    bedtimeArchive: "Архив сказок",
  },
  en: {
    title: "✨ New From LapLapLa",
    recipe: "Recipe of the week",
    dogs: "Dogs Draw",
    bedtime: "Bedtime stories",
    empty: "Coming soon",
    recipeBadge: "New recipe every Friday",
    lessonBadge: "Lesson of the day",
    openRecipe: "Open recipe",
    openLesson: "Start drawing",
    bedtimeSoon: "Evening stories will live here soon.",
    recipeArchive: "Recipe archive",
    drawingArchive: "All drawing lessons",
    bedtimeArchive: "Story archive",
  },
  he: {
    title: "✨ חדש ב-LapLapLa",
    recipe: "מתכון השבוע",
    dogs: "כלבלבים מציירים",
    bedtime: "סיפורים לפני השינה",
    empty: "בקרוב",
    recipeBadge: "מתכון חדש בכל יום שישי",
    lessonBadge: "שיעור היום",
    openRecipe: "לפתוח מתכון",
    openLesson: "להתחיל לצייר",
    bedtimeSoon: "בקרוב יהיו כאן סיפורי ערב.",
    recipeArchive: "ארכיון מתכונים",
    drawingArchive: "כל שיעורי הציור",
    bedtimeArchive: "ארכיון סיפורים",
  },
};

function HomepageRetentionBlocks({
  lang,
  retention,
}: {
  lang: Lang;
  retention?: HomepageRetentionData | null;
}) {
  const ui = RETENTION_UI[lang];
  const recipe = retention?.recipe || null;
  const dogLesson = retention?.dogLesson || null;
  const raccoonChefUrl = "https://media.laplapla.com/stickers/raccoon-stickers/raccoon-chief.png";

  return (
    <section className="home-retention-section" aria-labelledby="home-retention-title">
      <h2 id="home-retention-title" className="home-retention-title page-title">{ui.title}</h2>
      <div className="home-retention-feed">
        <Link
          className={`home-retention-card home-retention-recipe-card ${recipe ? "" : "is-empty"}`}
          href={recipe ? buildLocalizedPublicPath(`/raccoons/kitchen/${recipe.slug}`, lang) : buildLocalizedPublicPath("/raccoons", lang)}
        >
          <span className="home-retention-card-label">{ui.recipeBadge}</span>
          {recipe ? (
            <>
              <span className="home-retention-recipe-media">
                <span className="home-retention-raccoon-chef">
                  <Image
                    src={raccoonChefUrl}
                    alt=""
                    fill
                    sizes="220px"
                    loading="eager"
                    unoptimized
                  />
                </span>
                <Image
                  className="home-retention-recipe-image"
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  fill
                  sizes="(max-width: 767px) 76vw, 350px"
                  loading="eager"
                  unoptimized
                />
              </span>
              <span className="home-retention-country">
                {recipe.flagUrl ? (
                  <Image
                    src={recipe.flagUrl}
                    alt={recipe.countryName || recipe.targetId || ""}
                    width={24}
                    height={18}
                    unoptimized
                  />
                ) : null}
                {recipe.countryName}
              </span>
              <span className="home-retention-card-title">{recipe.title}</span>
              <span className="home-retention-card-action">{ui.openRecipe}</span>
            </>
          ) : (
            <span className="home-retention-placeholder">{ui.empty}</span>
          )}
        </Link>

        <Link
          className={`home-retention-card home-retention-dog-card ${dogLesson ? "" : "is-empty"}`}
          href={
            dogLesson
              ? buildLocalizedPublicPath(`/dog/lessons/${dogLesson.slug}`, lang)
              : buildLocalizedPublicPath("/dog/lessons", lang)
          }
        >
          <span className="home-retention-card-label">{ui.dogs}</span>
          <span className="home-retention-card-badge">{ui.lessonBadge}</span>
          {dogLesson?.previewUrl ? (
            <span className="home-retention-dog-media">
              <span className="home-retention-lesson-preview">
                <Image
                  src={dogLesson.previewUrl}
                  alt={dogLesson.title}
                  fill
                  sizes="(max-width: 767px) 62vw, 287px"
                  loading="eager"
                  unoptimized
                />
              </span>
              {dogLesson.dogImageUrl ? (
                <span className="home-retention-frank">
                  <Image
                    src={dogLesson.dogImageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 34vw, 160px"
                    loading="eager"
                    unoptimized
                  />
                </span>
              ) : null}
            </span>
          ) : (
            <span className="home-retention-placeholder">{ui.empty}</span>
          )}
          {dogLesson ? (
            <>
              <span className="home-retention-card-title">{dogLesson.title}</span>
              <span className="home-retention-card-action">{ui.openLesson}</span>
            </>
          ) : null}
        </Link>

        <div className="home-retention-card home-retention-bedtime-card is-empty">
          <span className="home-retention-card-label">{ui.bedtime}</span>
          <span className="home-retention-placeholder">{ui.empty}</span>
          <span className="home-retention-card-note">{ui.bedtimeSoon}</span>
        </div>
      </div>
      <nav className="home-retention-links" aria-label={ui.title}>
        <Link href={buildLocalizedPublicPath("/raccoons", lang)}>{ui.recipeArchive}</Link>
        <Link href={buildLocalizedPublicPath("/dog/lessons", lang)}>{ui.drawingArchive}</Link>
        <span aria-disabled="true">{ui.bedtimeArchive}</span>
      </nav>
    </section>
  );
}

export default function Home({ lang, retention }: { lang?: Lang; retention?: HomepageRetentionData | null }) {
  const router = useRouter();
  const resolvedLang = lang ?? getCurrentLang(router);
  const isMobile = useIsMobile(767);
  const responsiveViewport = useResponsiveViewport();
  const usesTouchHomeLayout = isMobile || responsiveViewport.deviceClass === "tablet";

  const t = useMemo(() => dictionaries[resolvedLang].home, [resolvedLang]);
  const seo = dictionaries[resolvedLang].seo.home;
  const geoJsonLd = useMemo(() => buildHomeGeoJsonLd(resolvedLang), [resolvedLang]);
  const geoProfile = GEO_PROFILES[resolvedLang];
  const localizedHomePath = buildLocalizedPublicPath("/", resolvedLang);
  const homeCanonicalUrl = `${BASE_URL}${localizedHomePath === "/" ? "" : localizedHomePath}`;

  // Optional: set RTL for Hebrew without touching global layout yet
  const dir = resolvedLang === "he" ? "rtl" : "ltr";

  return (
    <>
      <SEO
        title={seo.title}
        description={seo.description}
        path="/"
        lang={resolvedLang}
        canonicalOverride={homeCanonicalUrl}
        alternates={HOME_ALTERNATES}
        jsonLd={geoJsonLd}
      />
      <div className={`home-wrapper ${isMobile ? "home-wrapper-mobile" : ""}`} dir={dir}>
        <div className={isMobile ? "home-mobile-snap-shell" : undefined}>
          <section className={isMobile ? "home-mobile-screen home-mobile-screen-menu" : undefined}>
            <header className="site-header">
              <div className="header-text">
                <h1 className="page-title">{t.title}</h1>
                <h2 className="page-subtitle">
                  {isMobile ? t.mobileHelper : t.subtitle}
                </h2>
                <CorePageLinks
                  current="home"
                  lang={resolvedLang}
                  related={["cats", "dog", "book", "parrots", "raccoons"]}
                />
              </div>
            </header>

            <div className={`grid ${isMobile ? "grid-mobile-menu" : ""}`}>
              <Link
                className="card"
                href={buildLocalizedPublicPath("/cats", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Image
                  src="/images/cat.webp"
                  alt={t.sections.cats}
                  width={320}
                  height={320}
                  priority
                  loading="eager"
                />
                <div className="label">{t.sections.cats}</div>
              </Link>

              <Link
                className="card"
                href={buildLocalizedPublicPath("/dog", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Image src="/images/dog.webp" alt={t.sections.dogs} width={320} height={320} />
                <div className="label">{t.sections.dogs}</div>
              </Link>

              <Link
                className="card"
                href={buildLocalizedPublicPath("/capybara", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Image src="/images/capybara.webp" alt={t.sections.capybaras} width={320} height={320} />
                <div className="label">{t.sections.capybaras}</div>
              </Link>

              <Link
                className="card"
                href={buildLocalizedPublicPath("/parrots", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Image src="/images/parrot.webp" alt={t.sections.parrots} width={320} height={320} />
                <div className="label">{t.sections.parrots}</div>
              </Link>

              <Link
                className="card"
                href={buildLocalizedPublicPath("/raccoons", resolvedLang)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Image src="/images/raccoon.webp" alt={t.sections.raccoons} width={320} height={320} />
                <div className="label">{t.sections.raccoons}</div>
              </Link>

              <div className="card mystery-card">
                <div className="mystery-container">
                  <Image src="/images/paw.webp" alt="" className="paw" width={160} height={160} />
                  <Image src="/images/mystery.webp" alt="" className="curtain" width={320} height={320} />
                </div>
                <div className="label">{t.sections.comingSoon}</div>
              </div>
            </div>
          </section>

          <section className="home-brand-overview" aria-labelledby="laplapla-brand-heading">
            <h2 id="laplapla-brand-heading">{t.brand.heading}</h2>
            <p>{t.brand.intro}</p>
            <p>{t.brand.audience}</p>
            <nav className="home-brand-links" aria-label={t.brand.sectionsTitle}>
              {geoProfile.pages.map((page) => (
                <Link key={page.path} href={buildLocalizedPublicPath(page.path, resolvedLang)}>
                  <strong>{page.name}</strong>
                  <span>{page.description}</span>
                </Link>
              ))}
            </nav>
            <div className="home-brand-meta-links">
              <Link href={buildLocalizedPublicPath("/about", resolvedLang)}>
                {t.brand.aboutLink}
              </Link>
            </div>
          </section>

          <HomepageRetentionBlocks lang={resolvedLang} retention={retention} />

          <section className={isMobile ? "home-mobile-screen home-mobile-screen-video" : undefined}>
            <VideoSection lang={resolvedLang} mobileMode={usesTouchHomeLayout ? "shorts" : undefined} />
          </section>

          {usesTouchHomeLayout ? (
            <section className="home-mobile-screen home-mobile-screen-video home-mobile-screen-video-gallery">
              <VideoSection lang={resolvedLang} mobileMode="videos" />
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
