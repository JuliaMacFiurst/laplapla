import type { PageId } from "../QuestEngine";
import MiniTest from "../logic/MiniTest";
import { useQuest1I18n } from "../i18n";
import { getFlightQuestions } from "../i18n/tests";

export default function FlightMiniTest({ go }: { go: (id: PageId) => void }) {
  const { lang, t } = useQuest1I18n();
  const flightQuestions = getFlightQuestions(lang);
  return (
    <MiniTest
      questions={flightQuestions}
      finishTitle={t.day3Flight.finishTitle}
      finishButtonText={t.day3Flight.finishButton}
      onFinish={() => go("day4_takeoff")}
    />
  );
}
