"use client";

import type { PageId } from "../QuestEngine";
import MiniTest from "../logic/MiniTest";
import sailTestQuestions from "@/utils/sailTestQuestions";

export default function SailMiniTest({ go }: { go: (id: PageId) => void }) {
  return (
    <MiniTest
      questions={sailTestQuestions}
      finishTitle="Ты — настоящий мореплаватель! 🌊🧭"
      finishButtonText="Вперёд к приключениям! ⏭️"
      onFinish={() => go("day4_sail")}
    />
  );
}