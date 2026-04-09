// pages/raccoons.tsx
import { useState, type FormEvent } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import MapWrapper from "@/components/Raccoons/MapWrapper";
import MapTabs from "@/components/Raccoons/MapTabs";
import { RaccoonGuide } from "@/components/Raccoons/RaccoonGuide";
import { QuestSection } from "@/components/Raccoons/QuestSection";
import type { Quest } from "@/components/Raccoons/QuestSection";
import { quests } from "@/utils/quests.config";
import { dictionaries } from "@/i18n";
import { buildLocalizedHref, getCurrentLang } from "@/lib/i18n/routing";
import MobileDesktopNotice from "@/components/MobileDesktopNotice";
import { useIsMobile } from "@/hooks/useIsMobile";

type EntitySearchResult = {
  route: "country" | "animal" | "river" | "sea" | "biome";
  slug: string;
  href: string;
  title: string;
  targetId: string;
};

const SEARCH_UI = {
  ru: {
    placeholder: "Куда отправимся?",
    button: "Найти",
    clear: "Очистить",
    empty: "Ничего не найдено.",
    error: "Поиск сейчас недоступен.",
  },
  en: {
    placeholder: "Where shall we go?",
    button: "Search",
    clear: "Clear",
    empty: "Nothing found.",
    error: "Search is unavailable right now.",
  },
  he: {
    placeholder: "לאן נצא?",
    button: "חיפוש",
    clear: "נקה",
    empty: "לא נמצאו תוצאות.",
    error: "החיפוש אינו זמין כרגע.",
  },
} as const;

export default function RaccoonsPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const t = dictionaries[lang].raccoons;
  const searchUi = SEARCH_UI[lang];
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<
    "country" | "river" | "sea" | "physic" | "flag" | "animal" | "culture" | "weather" | "food"
  >("country");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntitySearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [hoveredResultTargetId, setHoveredResultTargetId] = useState<string | null>(null);
  const localizedQuests: Quest[] = [
    {
      ...quests.featured,
      title: t.quests.featuredTitle,
      subtitle: t.quests.featuredSubtitle,
    },
    ...quests.upcoming.map((quest) => ({
      ...quest,
      title: t.quests.upcomingTitle,
      subtitle: t.quests.upcomingSubtitle,
    })),
  ];

  const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setSearchMessage(null);
      return;
    }

    setSearchLoading(true);
    setSearchMessage(null);

    try {
      const response = await fetch(`/api/search/entities?q=${encodeURIComponent(trimmedQuery)}&lang=${lang}`);
      if (!response.ok) {
        throw new Error(searchUi.error);
      }

      const nextResults = (await response.json()) as EntitySearchResult[];
      setResults(nextResults);
      setSearchMessage(nextResults.length === 0 ? searchUi.empty : null);
    } catch (error) {
      console.error("[raccoons-search] failed", error);
      setResults([]);
      setSearchMessage(searchUi.error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleResultOpen = async (href: string) => {
    await router.push(buildLocalizedHref(href, lang), undefined, { locale: lang });
  };

  const activeRouteForTab: EntitySearchResult["route"] | null =
    activeTab === "country" || activeTab === "culture" || activeTab === "food"
      ? "country"
      : activeTab === "animal" || activeTab === "weather"
        ? "animal"
        : activeTab === "river"
          ? "river"
          : activeTab === "sea"
            ? "sea"
            : activeTab === "physic"
              ? "biome"
            : null;

  const firstPreviewResult = activeRouteForTab
    ? results.find((result) => result.route === activeRouteForTab) || null
    : null;
  const previewSelectedId = hoveredResultTargetId || firstPreviewResult?.targetId || null;

  if (isMobile) {
    return <MobileDesktopNotice lang={lang} />;
  }

  return (
    <>
      <Head>
        <title>{t.page.headTitle}</title>
        <meta name="description" content={t.page.metaDescription} />
      </Head>

      <main className="min-h-screen">
        <div className="raccoons-home-wrapper">
          <div className="raccoons-header-container">
            <div className="raccoons-title-with-raccoon">
              <div className="raccoon-guide-block">
                <RaccoonGuide wiggle={false} raccoonLine="" alt={t.page.guideAlt} />
              </div>

              <div className="raccoon-text-block">
                <h1 className="page-title">{t.page.title}</h1>
                <p className="page-subtitle">{t.page.subtitle}</p>
              </div>
            </div>
            <MapTabs selectedTab={activeTab} setSelectedTab={setActiveTab} />
            {lang !== "ru" && t.page.slidesTranslationNotice && (
              <p className="raccoons-map-translation-note" dir={lang === "he" ? "rtl" : "ltr"}>
                {t.page.slidesTranslationNotice}
              </p>
            )}
          </div>
          <div className="raccoons-search-block">
            <form className="search-form raccoons-search-form" onSubmit={handleSearchSubmit}>
              <div className="search-input-wrapper">
                <input
                  type="search"
                  className="search-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchUi.placeholder}
                  aria-label={searchUi.placeholder}
                />
                {query ? (
                  <button
                    type="button"
                    className="search-clear-button"
                    aria-label={searchUi.clear}
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                      setSearchMessage(null);
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <button type="submit" className="search-button" disabled={searchLoading}>
                {searchUi.button}
              </button>
            </form>

            {searchLoading ? (
              <div className="raccoons-search-results search-results-panel">
                <div className="search-results-status">{searchUi.button}...</div>
              </div>
            ) : null}

            {!searchLoading && (searchMessage || results.length > 0) ? (
              <div className="raccoons-search-results search-results-panel">
                {searchMessage ? (
                  <div className="search-results-status">{searchMessage}</div>
                ) : null}

                {results.length > 0 ? (
                  <div className="search-results-list">
                    {results.map((result) => (
                      <button
                        key={`${result.route}:${result.slug}`}
                        type="button"
                        className="search-result-card raccoons-search-result-card"
                        onClick={() => void handleResultOpen(result.href)}
                        onMouseEnter={() => setHoveredResultTargetId(result.targetId)}
                        onMouseLeave={() => setHoveredResultTargetId(null)}
                        onFocus={() => setHoveredResultTargetId(result.targetId)}
                        onBlur={() => setHoveredResultTargetId(null)}
                      >
                        {result.title}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <MapWrapper type={activeTab} previewSelectedId={previewSelectedId} />
          <QuestSection quests={localizedQuests} />
        </div>
      </main>
    </>
  );
}
