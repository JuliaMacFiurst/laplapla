"use client";

import type { PageId } from "../QuestEngine";
import MiniTest from "../logic/MiniTest";
import { useQuest1I18n } from "../i18n";
import { getSailQuestions } from "../i18n/tests";

export default function SailMiniTest({ go }: { go: (id: PageId) => void }) {
  const { lang, t } = useQuest1I18n();
  const sailQuestions = getSailQuestions(lang);
  return (
    <MiniTest
      questions={sailQuestions}
      finishTitle={t.day3Sail.finishTitle}
      finishButtonText={t.day3Sail.finishButton}
      onFinish={() => go("day4_sail")}
    />
  );
}
