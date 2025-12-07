import { useState, useEffect } from "react";
import { useRouter } from "next/router";

import Day1 from "./pages/Day1";
import Day2 from "./pages/Day2";
import Day3Flight from "./pages/Day3Flight";
import Day3Sail from "./pages/Day3Sail";
import Day4Takeoff from "./pages/Day4Takeoff";
import Day4StarsNav from "./pages/Day4StarsNav"; 
import Day5Spitsbergen from "./pages/Day5Spitsbergen"; 

// дальше добавляем по мере создания

const PAGES = {
  day1: Day1,
  day2: Day2,
  day3flight: Day3Flight,
  day3sail: Day3Sail,
  day4_takeoff: Day4Takeoff,
  day4_sail: Day4StarsNav,
  day5_spitsbergen: Day5Spitsbergen,
  
};

const PAGE_ORDER: PageId[] = [
  "day1",
  "day2",
  "day3flight",
  "day3sail",
  "day4_takeoff",
  "day4_sail",
  "day5_spitsbergen",
];

export type PageId = keyof typeof PAGES;

export default function QuestEngine() {
  const router = useRouter();
  const [pageId, setPageId] = useState<PageId>("day1");
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDevMode(window.location.search.includes("dev=1"));
    }
  }, []);

  const Page = PAGES[pageId];

  return (
    <div>
      <Page go={setPageId} />
      <div
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          fontSize: "24px",
          cursor: "pointer",
          zIndex: 10000,
          background: "rgba(255,255,255,0.9)",
          padding: "6px 10px",
          borderRadius: "8px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        }}
        onClick={() => {
          const confirmed = window.confirm(
            "Твой прогресс в квесте сейчас не сохранён.\nЕсли ты выйдешь, придётся начинать сначала. Выйти из квеста?"
          );
          if (confirmed) {
            router.push("/raccoons");
          }
        }}
      >
        🏠 Домой
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
            ← Назад
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
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}