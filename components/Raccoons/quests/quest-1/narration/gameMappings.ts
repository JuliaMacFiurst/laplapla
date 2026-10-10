import type { SledPart } from "../logic/dog-sled-game/PreparationPopup";
import type { NarrationBlockId } from "./catalog";

export const DAY_1_BLOCKS = [
  "svalbard.day01.intro.01",
  "svalbard.day01.intro.02",
  "svalbard.day01.intro.03",
  "svalbard.day01.intro.04",
  "svalbard.day01.intro.05",
  "svalbard.day01.intro.06",
  "svalbard.day01.intro.07",
] as const satisfies readonly NarrationBlockId[];

export const DAY_2_BLOCKS = [
  "svalbard.day02.departure.01",
  "svalbard.day02.departure.02",
  "svalbard.day02.departure.03",
  "svalbard.day02.departure.04",
  "svalbard.day02.departure.05",
  "svalbard.day02.departure.06",
] as const satisfies readonly NarrationBlockId[];

export const DAY_2_CHOICE_BLOCK = "svalbard.day02.transport-choice.01" as NarrationBlockId;

export const FLIGHT_STATIC_BLOCKS = [
  "svalbard.day03.flight.intro.01",
  "svalbard.day03.flight.route-explanation.01",
  "svalbard.day03.flight.quiz-instruction.01",
] as const satisfies readonly NarrationBlockId[];

export const SAIL_STATIC_BLOCKS = [
  "svalbard.day03.sail.intro.01",
  "svalbard.day03.sail.route-explanation.01",
  "svalbard.day03.sail.quiz-instruction.01",
  "svalbard.day03.sail.draw-route.01",
] as const satisfies readonly NarrationBlockId[];

export const TAKEOFF_STORY_BLOCKS = [
  "svalbard.day04.takeoff.01",
  "svalbard.day04.takeoff.02",
  "svalbard.day04.takeoff.03",
] as const satisfies readonly NarrationBlockId[];

export const STARS_INTRO_BLOCKS = [
  "svalbard.day04.stars.intro.01",
  "svalbard.day04.stars.intro.02",
] as const satisfies readonly NarrationBlockId[];

export const STARS_ARRIVAL_BLOCK = "svalbard.day04.stars.arrival.01" as NarrationBlockId;

export const STATION_BLOCKS = [
  "svalbard.day05.station.intro.01",
  "svalbard.day05.station.intro.02",
  "svalbard.day05.station.intro.03",
  "svalbard.day05.station.intro.04",
] as const satisfies readonly NarrationBlockId[];

export const DAY_6_BLOCKS = [
  "svalbard.day06.expedition.01",
  "svalbard.day06.expedition.02",
  "svalbard.day06.expedition.03",
  "svalbard.day06.expedition.04",
] as const satisfies readonly NarrationBlockId[];

export const GARAGE_INTRO_BLOCK = "svalbard.day05.garage.intro.01" as NarrationBlockId;
export const LAB_INSTRUCTION_BLOCK = "svalbard.day05.lab.instruction.01" as NarrationBlockId;
export const DAY_7_ENDING_BLOCK = "svalbard.day07.ending.01" as NarrationBlockId;

const FLIGHT_DIALOG_BLOCKS: Record<string, NarrationBlockId> = {
  straight_1: "svalbard.day03.flight-dialogue.straight-1",
  straight_2: "svalbard.day03.flight-dialogue.straight-1",
  straight_3: "svalbard.day03.flight-dialogue.straight-3",
  straight_4: "svalbard.day03.flight-dialogue.straight-3",
  // The manifest block combines straight_5 and arc_1 from mutually exclusive choices.
  // It remains unavailable until production splits the recording.
  arc_2: "svalbard.day03.flight-dialogue.arc-2",
  arc_3: "svalbard.day03.flight-dialogue.arc-2",
  zigzag_1: "svalbard.day03.flight-dialogue.zigzag-1",
  zigzag_2: "svalbard.day03.flight-dialogue.zigzag-1",
  // The remaining source lines are either grouped across different states or never rendered.
};

const SEA_DIALOG_BLOCKS: Record<string, NarrationBlockId> = {
  intro_1: "svalbard.day03.sail-dialogue.intro-1",
  intro_2: "svalbard.day03.sail-dialogue.intro-1",
  ice_1: "svalbard.day03.sail-dialogue.ice-1",
  ice_2: "svalbard.day03.sail-dialogue.ice-1",
  ice_3: "svalbard.day03.sail-dialogue.ice-3",
  ice_4: "svalbard.day03.sail-dialogue.ice-3",
  current_1: "svalbard.day03.sail-dialogue.current-1",
  current_2: "svalbard.day03.sail-dialogue.current-1",
  current_3: "svalbard.day03.sail-dialogue.current-3",
  current_4: "svalbard.day03.sail-dialogue.current-3",
  storm_1: "svalbard.day03.sail-dialogue.storm-1",
  storm_2: "svalbard.day03.sail-dialogue.storm-1",
  storm_3: "svalbard.day03.sail-dialogue.storm-3",
  storm_4: "svalbard.day03.sail-dialogue.storm-3",
  depth_1: "svalbard.day03.sail-dialogue.depth-1",
  depth_2: "svalbard.day03.sail-dialogue.depth-1",
  final_1: "svalbard.day03.sail-dialogue.final-1",
  final_2: "svalbard.day03.sail-dialogue.final-1",
  final_3: "svalbard.day03.sail-dialogue.final-3",
};

const STAR_DIALOG_BLOCKS: Record<string, NarrationBlockId> = {
  intro_1: "svalbard.day04.stars-dialogue.intro-1",
  intro_2: "svalbard.day04.stars-dialogue.intro-1",
  intro_3: "svalbard.day04.stars-dialogue.intro-3",
  intro_4: "svalbard.day04.stars-dialogue.intro-3",
  merak_1: "svalbard.day04.stars-dialogue.merak-1",
  dubhe_1: "svalbard.day04.stars-dialogue.merak-1",
  polaris_1: "svalbard.day04.stars-dialogue.polaris-1",
  finish_1: "svalbard.day04.stars-dialogue.polaris-1",
  finish_2: "svalbard.day04.stars-dialogue.finish-2",
};

const GARAGE_BLOCKS: Record<SledPart, NarrationBlockId> = {
  reins: "svalbard.day05.garage.part-reins.01",
  harness: "svalbard.day05.garage.part-harness.01",
  water: "svalbard.day05.garage.part-water.01",
  food: "svalbard.day05.garage.part-food.01",
  brake: "svalbard.day05.garage.part-brake.01",
  skids: "svalbard.day05.garage.part-skids.01",
  loads: "svalbard.day05.garage.part-loads.01",
  dogs: "svalbard.day05.garage.part-dogs.01",
};

export const QUEST_1_UNAVAILABLE_BLOCKS: Partial<Record<NarrationBlockId, string>> = {
  "svalbard.day03.flight-dialogue.straight-5":
    "One recording combines straight_5 and arc_1 from mutually exclusive route choices.",
  "svalbard.day03.flight-dialogue.zigzag-3":
    "One recording combines visible zigzag_3 with afterCorrect_1, which the game never renders.",
  "svalbard.day03.flight-dialogue.afterCorrect-2":
    "The source dialogue condition afterCorrect is never mounted by the current flight game.",
};

const TAKEOFF_HINT_BLOCKS = Array.from(
  { length: 14 },
  (_, index) => `svalbard.day04.takeoff.hint-${String(index + 1).padStart(2, "0")}` as NarrationBlockId,
);

export const QUEST_1_INTEGRATED_BLOCKS = Array.from(new Set<NarrationBlockId>([
  ...DAY_1_BLOCKS,
  ...DAY_2_BLOCKS,
  DAY_2_CHOICE_BLOCK,
  ...FLIGHT_STATIC_BLOCKS,
  ...Object.values(FLIGHT_DIALOG_BLOCKS),
  "svalbard.day03.flight.mercator-explanation.01",
  ...SAIL_STATIC_BLOCKS,
  ...Object.values(SEA_DIALOG_BLOCKS),
  ...TAKEOFF_STORY_BLOCKS,
  ...TAKEOFF_HINT_BLOCKS,
  ...STARS_INTRO_BLOCKS,
  ...Object.values(STAR_DIALOG_BLOCKS),
  STARS_ARRIVAL_BLOCK,
  ...STATION_BLOCKS,
  GARAGE_INTRO_BLOCK,
  ...Object.values(GARAGE_BLOCKS),
  LAB_INSTRUCTION_BLOCK,
  ...DAY_6_BLOCKS,
  DAY_7_ENDING_BLOCK,
]));

export function flightDialogueBlockId(dialogId: string | undefined) {
  return dialogId ? FLIGHT_DIALOG_BLOCKS[dialogId] ?? null : null;
}

export function seaDialogueBlockId(dialogId: string | undefined) {
  return dialogId ? SEA_DIALOG_BLOCKS[dialogId] ?? null : null;
}

export function starDialogueBlockId(dialogId: string | undefined) {
  return dialogId ? STAR_DIALOG_BLOCKS[dialogId] ?? null : null;
}

export function takeoffHintBlockId(switchId: string | null) {
  if (!switchId?.startsWith("switcher-on-")) return null;
  const index = Number(switchId.slice("switcher-on-".length));
  if (!Number.isInteger(index) || index < 1 || index > 14) return null;
  return `svalbard.day04.takeoff.hint-${String(index).padStart(2, "0")}` as NarrationBlockId;
}

export function garagePartBlockId(part: SledPart | null) {
  return part ? GARAGE_BLOCKS[part] : null;
}
