import { useState, type FormEvent } from "react";
import MapWrapper from "@/components/Raccoons/MapWrapper";
import { dictionaries, type Lang } from "@/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { EntitySearchResult } from "@/components/Raccoons/types";

type MapTab = "country" | "river" | "sea" | "physic" | "flag" | "animal" | "culture" | "weather" | "food";

type MobileMapScreenProps = {
  lang: Lang;
  activeTab: MapTab;
  onTabChange: (nextTab: MapTab) => void;
  previewSelectedId: string | null;
  onMapUserSelect: (selectedId: string) => void;
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

export default function MobileMapScreen({
  lang,
  activeTab,
  onTabChange,
  previewSelectedId,
  onMapUserSelect,
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

  return (
    <main className="raccoons-mobile-screen" dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="raccoons-mobile-floating-controls">
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
          {t.quests.playQuest}
        </button>
      </div>

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
              <div className="raccoons-mobile-search-results search-results-panel">
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
                      <button type="button" className="search-button" onClick={onShowMoreResults}>
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
