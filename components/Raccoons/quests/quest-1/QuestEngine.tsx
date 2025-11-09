import { useState } from "react";

import Day1 from "./pages/Day1";
import Day2 from "./pages/Day2";
// дальше добавляем по мере создания

const PAGES = {
  day1: Day1,
  day2: Day2,
};

export type PageId = keyof typeof PAGES;

export default function QuestEngine() {
  const [pageId, setPageId] = useState<PageId>("day1");

  const Page = PAGES[pageId];

  return <Page go={setPageId} />;
}