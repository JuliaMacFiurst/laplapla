import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { buildLocalizedQuery } from "@/lib/i18n/routing";
import { useQuest1I18n } from "./i18n";

import Day1 from "./pages/Day1";
import Day2 from "./pages/Day2";
import Day3Flight from "./pages/Day3Flight";
import Day3Sail from "./pages/Day3Sail";
import Day4Takeoff from "./pages/Day4Takeoff";
import Day4StarsNav from "./pages/Day4StarsNav"; 
import Day5Spitsbergen from "./pages/Day5Spitsbergen";
import Day5Garage from "./pages/station-doors/Day5Garage";
import Day5Heat from "./pages/station-doors/Day5Heat";
import Day5Lab from "./pages/station-doors/Day5Lab";
import Day6Expedition from "./pages/Day6Expedition";
import Day7TreasureOfTimes from "./pages/Day7TreasureOfTimes";

// дальше добавляем по мере создания

const PAGES = {
  day1: Day1,
  day2: Day2,
  day3flight: Day3Flight,
  day3sail: Day3Sail,
  day4_takeoff: Day4Takeoff,
  day4_sail: Day4StarsNav,
  day5_spitsbergen: Day5Spitsbergen,
  day5_garage: Day5Garage,
  day5_heat: Day5Heat,
  day5_lab: Day5Lab,
  day6_expedition: Day6Expedition,
  day7_treasure_of_times: Day7TreasureOfTimes,
  
};

const PAGE_ORDER: PageId[] = [
  "day1",
  "day2",
  "day3flight",
  "day3sail",
  "day4_takeoff",
  "day4_sail",
  "day5_spitsbergen",
  "day5_garage",
  "day5_heat",
  "day5_lab",
  "day6_expedition",
  "day7_treasure_of_times",
];

export type PageId = keyof typeof PAGES;

export default function QuestEngine() {
  const router = useRouter();
  const { lang, t } = useQuest1I18n();
  const [pageId, setPageId] = useState<PageId>("day1");
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDevMode(window.location.search.includes("dev=1"));
    }
  }, []);

  const Page = PAGES[pageId];

  return (
    <div
      dir={lang === "he" ? "rtl" : "ltr"}
      className={lang === "he" ? "quest-1-hebrew-font" : undefined}
    >
      <Page go={setPageId} />
      <div
        className="quest-back-to-maps-button"
        onClick={() => {
          const confirmed = window.confirm(
            t.engine.confirmExit
          );
          if (confirmed) {
            router.push(
              { pathname: "/raccoons", query: buildLocalizedQuery(lang) },
              undefined,
              { locale: lang },
            );
          }
        }}
      >
        {t.engine.homeButton}
      </div>
      {devMode && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            display: "flex",
            gap: "10px",
            zIndex: 9999,
          }}
        >
          <button
            onClick={() => {
              const idx = PAGE_ORDER.indexOf(pageId);
              if (idx > 0) setPageId(PAGE_ORDER[idx - 1]);
            }}
            style={{
              padding: "6px 12px",
              background: "rgba(0,0,0,0.6)",
              color: "white",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            {t.engine.prevButton}
          </button>

          <button
            onClick={() => {
              const idx = PAGE_ORDER.indexOf(pageId);
              if (idx < PAGE_ORDER.length - 1) setPageId(PAGE_ORDER[idx + 1]);
            }}
            style={{
              padding: "6px 12px",
              background: "rgba(0,0,0,0.6)",
              color: "white",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            {t.engine.nextButton}
          </button>
        </div>
      )}
    </div>
  );
}
