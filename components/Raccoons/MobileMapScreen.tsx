import MapWrapper from "@/components/Raccoons/MapWrapper";
import { dictionaries, type Lang } from "@/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type MapTab = "country" | "river" | "sea" | "physic" | "flag" | "animal" | "culture" | "weather" | "food";

type MobileMapScreenProps = {
  lang: Lang;
  activeTab: MapTab;
  onTabChange: (nextTab: MapTab) => void;
  previewSelectedId: string | null;
  onMapUserSelect: (selectedId: string) => void;
  onOpenQuests: () => void;
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
}: MobileMapScreenProps) {
  const t = dictionaries[lang].raccoons;

  return (
    <main className="raccoons-mobile-screen" dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="raccoons-mobile-floating-controls">
        <LanguageSwitcher />
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
