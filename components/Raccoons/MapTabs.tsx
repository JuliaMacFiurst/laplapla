
import { useRouter } from "next/router";
import { dictionaries } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";

type MapTabsProps = {
  selectedTab: "country" | "river" | "sea" | "physic" | "flag" | "animal" | "culture" | "weather" | "food";
  setSelectedTab: (
    tab: "country" | "river" | "sea" | "physic" | "flag" | "animal" | "culture" | "weather" | "food"
  ) => void;
};

const MapTabs = ({ selectedTab, setSelectedTab }: MapTabsProps) => {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const t = dictionaries[lang].raccoons.tabs;

  return (
    <div className="map-tabs">
      {/* Фоновый бар под вкладками */}
      <div className="map-tabs-background-bar" />

      {/* Вкладки */}
      <div className="map-tab-wrapper">
        <button
          onClick={() => setSelectedTab("country")}
          className={`map-tab ${selectedTab === "country" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/countries.webp" alt={t.country} className="map-tab-icon" />
          {t.country}
        </button>
        <button
          onClick={() => setSelectedTab("river")}
          className={`map-tab ${selectedTab === "river" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/rivers.webp" alt={t.river} className="map-tab-icon" />
          {t.river}
        </button>
        <button
          onClick={() => setSelectedTab("sea")}
          className={`map-tab ${selectedTab === "sea" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/sea.webp" alt={t.sea} className="map-tab-icon" />
          {t.sea}
        </button>
        <button
          onClick={() => setSelectedTab("physic")}
          className={`map-tab ${selectedTab === "physic" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/mountaines.webp" alt={t.physic} className="map-tab-icon" />
          {t.physic}
        </button>
        <button
          onClick={() => setSelectedTab("flag")}
          className={`map-tab ${selectedTab === "flag" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/flags.webp" alt={t.flag} className="map-tab-icon" />
          {t.flag}
        </button>
        <button
          onClick={() => setSelectedTab("animal")}
          className={`map-tab ${selectedTab === "animal" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/animals.webp" alt={t.animal} className="map-tab-icon" />
          {t.animal}
        </button>
        <button
          onClick={() => setSelectedTab("culture")}
          className={`map-tab ${selectedTab === "culture" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/culture.webp" alt={t.culture} className="map-tab-icon" />
          {t.culture}
        </button>
        <button
          onClick={() => setSelectedTab("weather")}
          className={`map-tab ${selectedTab === "weather" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/weather.webp" alt={t.weather} className="map-tab-icon" />
          {t.weather}
        </button>
        <button
          onClick={() => setSelectedTab("food")}
          className={`map-tab ${selectedTab === "food" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/food.webp" alt={t.food} className="map-tab-icon" />
          {t.food}
        </button>
      </div>
    </div>
  );
};

export default MapTabs;
