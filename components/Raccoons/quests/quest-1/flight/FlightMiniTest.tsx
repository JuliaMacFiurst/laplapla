import type { PageId } from "../QuestEngine";
import flightTestQuestions from "@/utils/flightTestQuestions";
import MiniTest from "../logic/MiniTest";

export default function FlightMiniTest({ go }: { go: (id: PageId) => void }) {
  return (
    <MiniTest
      questions={flightTestQuestions}
      finishTitle="Ты — будущий пилот! 🚀"
      finishButtonText="Идём на взлёт!✈️💨 ⏭️"
      onFinish={() => go("day4_takeoff")}
    />
  );
}
