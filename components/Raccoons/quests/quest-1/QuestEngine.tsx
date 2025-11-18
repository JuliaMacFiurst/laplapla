import { useState } from "react";

import Day1 from "./pages/Day1";
import Day2 from "./pages/Day2";
import Day3Flight from "./pages/Day3Flight";
import Day3Sail from "./pages/Day3Sail";
import Day4Takeoff from "./pages/Day4Takeoff";

// дальше добавляем по мере создания

const PAGES = {
  day1: Day1,
  day2: Day2,
  day3flight: Day3Flight,
  day3sail: Day3Sail,
  day4_takeoff: Day4Takeoff,
  
};

export type PageId = keyof typeof PAGES;

export default function QuestEngine() {
  const [pageId, setPageId] = useState<PageId>("day1");

  const Page = PAGES[pageId];

  return <Page go={setPageId} />;
}