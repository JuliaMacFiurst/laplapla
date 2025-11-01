import React from "react";

type MapTabsProps = {
  selectedTab: "country" | "river" | "sea" | "physic" | "flag" | "animal" | "culture" | "weather" | "food";
  setSelectedTab: (
    tab: "country" | "river" | "sea" | "physic" | "flag" | "animal" | "culture" | "weather" | "food"
  ) => void;
};

const MapTabs = ({ selectedTab, setSelectedTab }: MapTabsProps) => {
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
          <img src="/icons/map-icons/countries.webp" alt="Страны" className="map-tab-icon" />
          Страны
        </button>
        <button
          onClick={() => setSelectedTab("river")}
          className={`map-tab ${selectedTab === "river" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/rivers.webp" alt="Реки" className="map-tab-icon" />
          Реки
        </button>
        <button
          onClick={() => setSelectedTab("sea")}
          className={`map-tab ${selectedTab === "sea" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/sea.webp" alt="Моря" className="map-tab-icon" />
          Моря
        </button>
        <button
          onClick={() => setSelectedTab("physic")}
          className={`map-tab ${selectedTab === "physic" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/mountaines.webp" alt="Горы" className="map-tab-icon" />
          Рельеф
        </button>
        <button
          onClick={() => setSelectedTab("flag")}
          className={`map-tab ${selectedTab === "flag" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/flags.webp" alt="Флаги" className="map-tab-icon" />
          Флаги
        </button>
        <button
          onClick={() => setSelectedTab("animal")}
          className={`map-tab ${selectedTab === "animal" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/animals.webp" alt="Животные" className="map-tab-icon" />
          Животные
        </button>
        <button
          onClick={() => setSelectedTab("culture")}
          className={`map-tab ${selectedTab === "culture" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/culture.webp" alt="Культура" className="map-tab-icon" />
          Культура
        </button>
        <button
          onClick={() => setSelectedTab("weather")}
          className={`map-tab ${selectedTab === "weather" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/weather.webp" alt="Погода" className="map-tab-icon" />
          Погода
        </button>
        <button
          onClick={() => setSelectedTab("food")}
          className={`map-tab ${selectedTab === "food" ? "active" : ""}`}
        >
          <img src="/icons/map-icons/food.webp" alt="Еда" className="map-tab-icon" />
          Еда
        </button>
      </div>
    </div>
  );
};

export default MapTabs;