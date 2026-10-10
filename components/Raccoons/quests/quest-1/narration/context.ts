import type { Quest1PageId } from "../progress";
import { isNarrationBlockId, type NarrationBlockId } from "./catalog";

const ids = <T extends readonly string[]>(...values: T) => {
  for (const value of values) {
    if (!isNarrationBlockId(value)) throw new Error(`Unknown Svalbard narration block: ${value}`);
  }
  return values as readonly NarrationBlockId[];
};

export const QUEST_1_INITIAL_NARRATION: Record<Quest1PageId, readonly NarrationBlockId[]> = {
  day1: ids(
    "svalbard.day01.intro.01",
    "svalbard.day01.intro.02",
    "svalbard.day01.intro.03",
    "svalbard.day01.intro.04",
    "svalbard.day01.intro.05",
    "svalbard.day01.intro.06",
    "svalbard.day01.intro.07",
  ),
  day2: ids(
    "svalbard.day02.departure.01",
    "svalbard.day02.departure.02",
    "svalbard.day02.departure.03",
    "svalbard.day02.departure.04",
    "svalbard.day02.departure.05",
    "svalbard.day02.departure.06",
    "svalbard.day02.transport-choice.01",
  ),
  day3flight: ids(
    "svalbard.day03.flight.intro.01",
    "svalbard.day03.flight.route-explanation.01",
    "svalbard.day03.flight.quiz-instruction.01",
  ),
  day3sail: ids(
    "svalbard.day03.sail.intro.01",
    "svalbard.day03.sail.route-explanation.01",
    "svalbard.day03.sail.quiz-instruction.01",
    "svalbard.day03.sail.draw-route.01",
  ),
  day4_takeoff: ids("svalbard.day04.takeoff.01"),
  day4_sail: ids("svalbard.day04.stars.intro.01", "svalbard.day04.stars.intro.02"),
  day5_spitsbergen: ids(
    "svalbard.day05.station.intro.01",
    "svalbard.day05.station.intro.02",
    "svalbard.day05.station.intro.03",
    "svalbard.day05.station.intro.04",
  ),
  day5_garage: ids("svalbard.day05.garage.intro.01"),
  day5_heat: ids(),
  day5_lab: ids("svalbard.day05.lab.instruction.01"),
  day6_expedition: ids(
    "svalbard.day06.expedition.01",
    "svalbard.day06.expedition.02",
    "svalbard.day06.expedition.03",
    "svalbard.day06.expedition.04",
  ),
  day7_treasure_of_times: ids("svalbard.day07.ending.01"),
};

export function normalizeAvailableNarrationBlocks(blockIds: readonly string[]) {
  return Array.from(new Set(blockIds)).filter(isNarrationBlockId);
}
export function selectNarrationBlock(
  available: readonly NarrationBlockId[],
  current: NarrationBlockId | null,
) {
  return current && available.includes(current) ? current : (available[0] ?? null);
}

export function adjacentNarrationBlock(
  available: readonly NarrationBlockId[],
  current: NarrationBlockId | null,
  direction: -1 | 1,
) {
  const index = current ? available.indexOf(current) : -1;
  if (index < 0) return direction === 1 ? (available[0] ?? null) : null;
  return available[index + direction] ?? null;
}
