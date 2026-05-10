import Image from "next/image";
import { useRouter } from "next/router";
import { dictionaries } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";

type MapTabId =
  | "country"
  | "river"
  | "sea"
  | "physic"
  | "flag"
  | "animal"
  | "culture"
  | "weather"
  | "food";

type MapTabsProps = {
  selectedTab: MapTabId;
  setSelectedTab: (tab: MapTabId) => void;
};

const TAB_ICONS: Record<MapTabId, string> = {
  country: "/icons/map-icons/countries.webp",
  river: "/icons/map-icons/rivers.webp",
  sea: "/icons/map-icons/sea.webp",
  physic: "/icons/map-icons/mountaines.webp",
  flag: "/icons/map-icons/flags.webp",
  animal: "/icons/map-icons/animals.webp",
  culture: "/icons/map-icons/culture.webp",
  weather: "/icons/map-icons/weather.webp",
  food: "/icons/map-icons/food.webp",
};

const MapTabs = ({ selectedTab, setSelectedTab }: MapTabsProps) => {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const t = dictionaries[lang].raccoons.tabs;
  const tabs: Array<{ id: MapTabId; label: string }> = [
    { id: "country", label: t.country },
    { id: "river", label: t.river },
    { id: "sea", label: t.sea },
    { id: "physic", label: t.physic },
    { id: "flag", label: t.flag },
    { id: "animal", label: t.animal },
    { id: "culture", label: t.culture },
    { id: "weather", label: t.weather },
    { id: "food", label: t.food },
  ];

  return (
    <div className="map-tabs">
      {/* Фоновый бар под вкладками */}
      <div className="map-tabs-background-bar" />

      {/* Вкладки */}
      <div className="map-tab-wrapper">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`map-tab ${selectedTab === tab.id ? "active" : ""}`}
          >
            <Image
              src={TAB_ICONS[tab.id]}
              alt={tab.label}
              width={30}
              height={30}
              className="map-tab-icon"
              unoptimized
            />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MapTabs;
