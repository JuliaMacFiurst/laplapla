// pages/raccoons.tsx
import type { GetStaticProps } from "next";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import CorePageLinks from "@/components/CorePageLinks";
import SEO from "@/components/SEO";
import MapWrapper from "@/components/Raccoons/MapWrapper";
import MapTabs from "@/components/Raccoons/MapTabs";
import { RaccoonGuide } from "@/components/Raccoons/RaccoonGuide";
import { QuestSection } from "@/components/Raccoons/QuestSection";
import type { Quest } from "@/components/Raccoons/QuestSection";
import { quests } from "@/utils/quests.config";
import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedHref, DEFAULT_LANG, getCurrentLang, isLang } from "@/lib/i18n/routing";
import { useIsMobile } from "@/hooks/useIsMobile";
import MobileMapScreen from "@/components/Raccoons/MobileMapScreen";
import MobileQuestSelectScreen from "@/components/Raccoons/MobileQuestSelectScreen";
import type { EntitySearchResult } from "@/components/Raccoons/types";

type MapTab = "country" | "river" | "sea" | "physic" | "flag" | "animal" | "culture" | "weather" | "food";

const SEARCH_UI = {
  ru: {
    placeholder: "Куда отправимся?",
    button: "Найти",
    clear: "Очистить",
    showMore: "Показать ещё",
    empty: "Ничего не найдено.",
    error: "Поиск сейчас недоступен.",
  },
  en: {
    placeholder: "Where shall we go?",
    button: "Search",
    clear: "Clear",
    showMore: "Show more",
    empty: "Nothing found.",
    error: "Search is unavailable right now.",
  },
  he: {
    placeholder: "לאן נצא?",
    button: "חיפוש",
    clear: "נקה",
    showMore: "להציג עוד",
    empty: "לא נמצאו תוצאות.",
    error: "החיפוש אינו זמין כרגע.",
  },
} as const;

const SEARCH_RESULTS_PAGE_SIZE = 12;
const visuallyHiddenStyle = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap" as const,
  border: 0,
};

export default function RaccoonsPage({ lang: providedLang }: { lang?: Lang }) {
  const router = useRouter();
  const lang = providedLang ?? getCurrentLang(router);
  const t = dictionaries[lang].raccoons;
  const seo = dictionaries[lang].seo.raccoons.index;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/raccoons";
  const searchUi = SEARCH_UI[lang];
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<MapTab>("country");
  const [deepLinkedPreviewId, setDeepLinkedPreviewId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntitySearchResult[]>([]);
  const [visibleResultsCount, setVisibleResultsCount] = useState(SEARCH_RESULTS_PAGE_SIZE);
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

  const clearMapDeepLinkState = () => {
    setDeepLinkedPreviewId(null);

    if (!router.isReady) {
      return;
    }

    const nextQuery = { ...router.query };
    delete nextQuery.tab;
    delete nextQuery.preview;

    void router.replace(
      {
        pathname: "/raccoons",
        query: nextQuery,
      },
      undefined,
      { shallow: true, scroll: false },
    );
  };

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const requestedTab = Array.isArray(router.query.tab) ? router.query.tab[0] : router.query.tab;
    const requestedPreview = Array.isArray(router.query.preview) ? router.query.preview[0] : router.query.preview;
    const normalizedTab: MapTab | null =
      requestedTab === "country" ||
      requestedTab === "river" ||
      requestedTab === "sea" ||
      requestedTab === "physic" ||
      requestedTab === "flag" ||
      requestedTab === "animal" ||
      requestedTab === "culture" ||
      requestedTab === "weather" ||
      requestedTab === "food"
        ? requestedTab
        : null;

    if (normalizedTab) {
      if (normalizedTab !== activeTab) {
        setActiveTab(normalizedTab);
      }
    }

    if (typeof requestedPreview === "string" && requestedPreview.trim()) {
      setDeepLinkedPreviewId(requestedPreview.trim());
    }
  }, [activeTab, router.isReady, router.query.preview, router.query.tab]);

  const handleMapTabChange = (nextTab: MapTab) => {
    clearMapDeepLinkState();
    setActiveTab(nextTab);
  };

  const handleMapUserSelect = (selectedId: string) => {
    if (!deepLinkedPreviewId) {
      return;
    }

    if (selectedId !== deepLinkedPreviewId) {
      clearMapDeepLinkState();
    }
  };

  const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setVisibleResultsCount(SEARCH_RESULTS_PAGE_SIZE);
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
      setVisibleResultsCount(SEARCH_RESULTS_PAGE_SIZE);
      setSearchMessage(nextResults.length === 0 ? searchUi.empty : null);
    } catch (error) {
      console.error("[raccoons-search] failed", error);
      setResults([]);
      setVisibleResultsCount(SEARCH_RESULTS_PAGE_SIZE);
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
  const previewSelectedId = hoveredResultTargetId || firstPreviewResult?.targetId || deepLinkedPreviewId || null;
  const visibleResults = results.slice(0, visibleResultsCount);
  const hasMoreResults = results.length > visibleResults.length;
  const mobileScreen = Array.isArray(router.query.screen) ? router.query.screen[0] : router.query.screen;
  const goToHomeScreen = () => {
    void router.push(buildLocalizedHref("/", lang), undefined, { locale: lang });
  };

  const openMobileQuestSelect = () => {
    void router.push(
      {
        pathname: "/raccoons",
        query: { ...router.query, screen: "quests" },
      },
      undefined,
      { shallow: true, scroll: false, locale: lang },
    );
  };

  const closeMobileQuestSelect = () => {
    const nextQuery = { ...router.query };
    delete nextQuery.screen;

    void router.push(
      {
        pathname: "/raccoons",
        query: nextQuery,
      },
      undefined,
      { shallow: true, scroll: false, locale: lang },
    );
  };

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (isMobile) {
      document.body.classList.add("raccoons-mobile-page");
      return () => {
        document.body.classList.remove("raccoons-mobile-page");
      };
    }

    document.body.classList.remove("raccoons-mobile-page");
    return undefined;
  }, [isMobile]);

  if (isMobile) {
    return (
      <>
        <SEO title={seo.title} description={seo.description} path={seoPath} />
        {mobileScreen === "quests" ? (
          <MobileQuestSelectScreen
            lang={lang}
            quests={localizedQuests}
            onBackToMap={closeMobileQuestSelect}
            onGoHome={goToHomeScreen}
          />
        ) : (
          <MobileMapScreen
            lang={lang}
            activeTab={activeTab}
            onTabChange={handleMapTabChange}
            previewSelectedId={previewSelectedId}
            onMapUserSelect={handleMapUserSelect}
            onGoHome={goToHomeScreen}
            onOpenQuests={openMobileQuestSelect}
            query={query}
            onQueryChange={setQuery}
            searchUi={searchUi}
            searchLoading={searchLoading}
            searchMessage={searchMessage}
            results={visibleResults}
            hasMoreResults={hasMoreResults}
            onSearchSubmit={handleSearchSubmit}
            onClearSearch={() => {
              setQuery("");
              setResults([]);
              setVisibleResultsCount(SEARCH_RESULTS_PAGE_SIZE);
              setSearchMessage(null);
            }}
            onShowMoreResults={() => setVisibleResultsCount((count) => count + SEARCH_RESULTS_PAGE_SIZE)}
            onResultOpen={(result) => void handleResultOpen(result.href)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <SEO title={seo.title} description={seo.description} path={seoPath} />

      <main className="min-h-screen">
        <div className="raccoons-home-wrapper">
          <div className="raccoons-header-container">
            <div className="raccoons-title-with-raccoon">
              <div className="raccoon-guide-block">
                <RaccoonGuide wiggle={false} raccoonLine="" alt={t.page.guideAlt} />
              </div>

              <div className="raccoon-text-block">
                <h1 className="page-title">{t.page.title}</h1>
                <p style={visuallyHiddenStyle}>
                  {seo.description}
                </p>
                <p className="page-subtitle">{t.page.subtitle}</p>
                <CorePageLinks current="raccoons" lang={lang} related={["home", "cats", "book"]} />
              </div>
            </div>
            <MapTabs selectedTab={activeTab} setSelectedTab={handleMapTabChange} />
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
                      setVisibleResultsCount(SEARCH_RESULTS_PAGE_SIZE);
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
                    {visibleResults.map((result) => (
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
                    {hasMoreResults ? (
                      <button
                        type="button"
                        className="search-button"
                        onClick={() => setVisibleResultsCount((count) => count + SEARCH_RESULTS_PAGE_SIZE)}
                      >
                        {searchUi.showMore}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <MapWrapper type={activeTab} previewSelectedId={previewSelectedId} onUserSelect={handleMapUserSelect} />
          <QuestSection quests={localizedQuests} />
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<{ lang: Lang }> = async ({ locale }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;

  return {
    props: {
      lang,
    },
  };
};
