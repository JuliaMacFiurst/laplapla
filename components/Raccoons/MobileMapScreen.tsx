import { useEffect, useRef, useState, type FormEvent, type TouchEvent } from "react";
import MapWrapper from "@/components/Raccoons/MapWrapper";
import { dictionaries, type Lang } from "@/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { EntitySearchResult } from "@/components/Raccoons/types";
import { LapLapLaSpinner } from "@/components/LoadingSpinner";

type MapTab = "country" | "river" | "sea" | "physic" | "flag" | "animal" | "culture" | "weather" | "food";

type MobileMapScreenProps = {
  lang: Lang;
  activeTab: MapTab;
  onTabChange: (nextTab: MapTab) => void;
  previewSelectedId: string | null;
  onMapUserSelect: (selectedId: string) => void;
  onGoHome: () => void;
  onOpenQuests: () => void;
  query: string;
  onQueryChange: (nextQuery: string) => void;
  searchUi: {
    placeholder: string;
    button: string;
    clear: string;
    showMore: string;
  };
  searchLoading: boolean;
  searchMessage: string | null;
  results: EntitySearchResult[];
  hasMoreResults: boolean;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onClearSearch: () => void;
  onShowMoreResults: () => void;
  onResultOpen: (result: EntitySearchResult) => void;
};

const TAB_ORDER: MapTab[] = [
  "country",
  "river",
  "sea",
  "physic",
  "flag",
  "animal",
  "culture",
  "weather",
  "food",
];

const ONBOARDING_DISMISSED_KEY = "laplapla:raccoons-onboarding-dismissed";
const ONBOARDING_SWIPE_THRESHOLD = 40;

export default function MobileMapScreen({
  lang,
  activeTab,
  onTabChange,
  previewSelectedId,
  onMapUserSelect,
  onGoHome,
  onOpenQuests,
  query,
  onQueryChange,
  searchUi,
  searchLoading,
  searchMessage,
  results,
  hasMoreResults,
  onSearchSubmit,
  onClearSearch,
  onShowMoreResults,
  onResultOpen,
}: MobileMapScreenProps) {
  const t = dictionaries[lang].raccoons;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const onboardingTouchStartX = useRef<number | null>(null);
  const exploreLabel = lang === "ru" ? "Исследовать" : lang === "he" ? "לחקור" : "Explore";

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(ONBOARDING_DISMISSED_KEY) === "1") {
        setIsOnboardingOpen(false);
      }
    } catch {
      // Storage can be unavailable in privacy modes; the guide remains usable.
    }
  }, []);

  const closeOnboarding = () => {
    setIsOnboardingOpen(false);
    try {
      window.sessionStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
    } catch {
      // Closing the guide must still work when storage is unavailable.
    }
  };

  const reopenOnboarding = () => {
    setIsOnboardingOpen(true);
    try {
      window.sessionStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    } catch {
      // Reopening the guide must not depend on storage.
    }
  };

  const handleOnboardingTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    onboardingTouchStartX.current = event.touches[0]?.clientX ?? null;
    event.stopPropagation();
  };

  const handleOnboardingTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startX = onboardingTouchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    onboardingTouchStartX.current = null;
    event.stopPropagation();
    if (startX == null || endX == null) return;

    const deltaX = startX - endX;
    if (Math.abs(deltaX) < ONBOARDING_SWIPE_THRESHOLD) return;
    setOnboardingStep((current) => (
      deltaX > 0
        ? Math.min(current + 1, t.onboarding.steps.length - 1)
        : Math.max(current - 1, 0)
    ));
  };

  return (
    <main className="raccoons-mobile-screen" dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="raccoons-mobile-floating-controls">
        <button
          type="button"
          className="capybara-mobile-topbar-button raccoons-mobile-home-button"
          onClick={onGoHome}
          aria-label={lang === "ru" ? "На главную" : lang === "he" ? "חזרה למסך הראשי" : "Go to home screen"}
        >
          <span aria-hidden="true">×</span>
        </button>
        <LanguageSwitcher />
        <button
          type="button"
          className="capybara-mobile-topbar-button raccoons-mobile-search-toggle"
          onClick={() => setIsSearchOpen(true)}
          aria-label={searchUi.placeholder}
        >
          <span className="search-toggle-button-icon" aria-hidden="true">⌕</span>
        </button>
        <button
          type="button"
          className="raccoons-mobile-quest-button"
          onClick={onOpenQuests}
        >
          {exploreLabel}
        </button>
      </div>

      {isOnboardingOpen ? (
        <header
          className="raccoons-mobile-semantic-header raccoons-mobile-onboarding"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="raccoons-mobile-onboarding-title-row">
            <h1>{t.page.title}</h1>
            <button
              type="button"
              className="raccoons-mobile-onboarding-close"
              onClick={closeOnboarding}
              aria-label={t.onboarding.close}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div
            className="raccoons-mobile-onboarding-viewport"
            onTouchStart={handleOnboardingTouchStart}
            onTouchMove={(event) => event.stopPropagation()}
            onTouchEnd={handleOnboardingTouchEnd}
          >
            <div
              className="raccoons-mobile-onboarding-track"
              style={{ transform: `translateX(-${onboardingStep * 100}%)` }}
            >
              {t.onboarding.steps.map((step, index) => (
                <section
                  key={step.title}
                  className="raccoons-mobile-onboarding-step"
                  dir={lang === "he" ? "rtl" : "ltr"}
                  data-onboarding-step={index + 1}
                >
                  <h2>{step.title}</h2>
                  <p>{step.body}</p>
                </section>
              ))}
            </div>
          </div>
          <div className="raccoons-mobile-onboarding-dots" dir="ltr">
            {t.onboarding.steps.map((step, index) => (
              <button
                key={step.title}
                type="button"
                className={`raccoons-mobile-onboarding-dot ${index === onboardingStep ? "is-active" : ""}`}
                onClick={() => setOnboardingStep(index)}
                aria-label={`${t.onboarding.stepLabel} ${index + 1}: ${step.title}`}
                aria-current={index === onboardingStep ? "step" : undefined}
              >
                <span aria-hidden="true" />
              </button>
            ))}
          </div>
        </header>
      ) : (
        <button
          type="button"
          className="raccoons-mobile-onboarding-reopen"
          onClick={reopenOnboarding}
          aria-label={t.onboarding.reopen}
        >
          <span aria-hidden="true">?</span>
        </button>
      )}

      <div className="raccoons-mobile-map-area">
        <MapWrapper
          type={activeTab}
          previewSelectedId={previewSelectedId}
          onUserSelect={onMapUserSelect}
        />
      </div>

      {isSearchOpen ? (
        <div className="raccoons-mobile-search-layer" onClick={() => setIsSearchOpen(false)}>
          <div className="raccoons-mobile-search-panel" onClick={(event) => event.stopPropagation()}>
            <form className="search-form-expanded raccoons-mobile-search-form" onSubmit={onSearchSubmit}>
              <input
                type="text"
                className="search-input search-input-expanded"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={searchUi.placeholder}
                aria-label={searchUi.placeholder}
                autoFocus
              />
              {query ? (
                <button
                  type="button"
                  className="search-clear-button"
                  onClick={onClearSearch}
                  aria-label={searchUi.clear}
                >
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
              <button type="submit" className="search-button" disabled={searchLoading}>
                {searchUi.button}
              </button>
            </form>

            {searchLoading ? (
              <div className="raccoons-mobile-search-results search-results-panel laplapla-loading-stack" role="status" aria-live="polite">
                <LapLapLaSpinner size="sm" decorative />
                <div className="search-results-status">{searchUi.button}...</div>
              </div>
            ) : null}

            {!searchLoading && (searchMessage || results.length > 0) ? (
              <div className="raccoons-mobile-search-results search-results-panel">
                {searchMessage ? (
                  <div className="search-results-status">{searchMessage}</div>
                ) : null}

                {results.length > 0 ? (
                  <div className="search-results-list">
                    {results.map((result) => (
                      <button
                        key={`${result.route}:${result.slug}`}
                        type="button"
                        className="search-result-card raccoons-mobile-search-result-card"
                        onClick={() => {
                          setIsSearchOpen(false);
                          onResultOpen(result);
                        }}
                      >
                        {result.title}
                      </button>
                    ))}
                    {hasMoreResults ? (
                      <button
                        type="button"
                        className="search-button raccoons-mobile-search-more-button"
                        onClick={onShowMoreResults}
                      >
                        {searchUi.showMore}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="raccoons-mobile-bottom-controls">
        <div className="raccoons-mobile-tab-strip" role="tablist" aria-label={t.page.title}>
          {TAB_ORDER.map((tab) => (
            <button
              key={tab}
              data-map-tab={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`raccoons-mobile-tab ${activeTab === tab ? "is-active" : ""}`}
              onClick={() => onTabChange(tab)}
            >
              {t.tabs[tab]}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
