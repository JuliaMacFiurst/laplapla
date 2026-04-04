import { useRouter } from "next/router";
import type { Lang } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import { en } from "./en";
import { he } from "./he";
import { ru } from "./ru";

export type Quest1Dictionary = {
  engine: {
    confirmExit: string;
    homeButton: string;
    prevButton: string;
    nextButton: string;
  };
  miniTest: {
    question: string;
    check: string;
    next: string;
  };
  day1: {
    title: string;
    startButton: string;
    nextButton: string;
    blocks: string[][];
  };
  day2: {
    question: string;
    flightOption: string;
    sailOption: string;
    blocks: string[][];
  };
  day3Flight: {
    title: string;
    introBlocks: string[][];
    tips: string[];
    routeButtons: {
      straight: string;
      arc: string;
      zigzag: string;
    };
    speech: {
      selectType: string;
      flyingOver: string;
      overCountries: string;
      overOcean: string;
      drawRoute: string;
    };
    finishTitle: string;
    finishButton: string;
  };
  day3Sail: {
    title: string;
    introBlocks: string[][];
    tips: string[];
    mapSpeech: {
      startPrompt: string;
      landError: string;
      rebuildRoute: string;
      routeComplete: string;
      continueRoute: string;
      guideToSpitsbergen: string;
      routeTooShort: string;
      routeThroughSeas: string;
      resetPrompt: string;
    };
    finishTitle: string;
    finishButton: string;
  };
  day4Takeoff: {
    title: string;
    introBlocks: string[][];
    unmuteButton: string;
    nextButton: string;
  };
  day4StarsNav: {
    title: string;
    introBlocks: string[][];
    defaultSpeech: string;
    videoTitle: string;
    arrivalBlock: string[];
    nextButton: string;
    mapTranslationNotice?: string;
  };
  day5Spitsbergen: {
    title: string;
    stationImageAlt: string;
    blocks: string[][];
    labels: {
      heat: string;
      lab: string;
      labAria: string;
      garage: string;
    };
    nextButton: string;
  };
  day5Heat: {
    title: string;
    backButton: string;
    loadingCharacters: string;
    characterCounter: string;
  };
  day5Garage: {
    title: string;
    subtitle: string;
    startRide: string;
    warningTitle: string;
    warningText: string;
    warningBack: string;
    warningRisk: string;
    backButton: string;
    stats: {
      lowRisk: string;
      highRisk: string;
      stability: string;
      stamina: string;
      speed: string;
    };
    popup: {
      close: string;
      parts: Record<"reins" | "harness" | "water" | "food" | "brake" | "skids" | "loads" | "dogs", string>;
      descriptions: Record<"reins" | "harness" | "water" | "food" | "brake" | "skids" | "loads" | "dogs", string>;
      choices: Record<
        "reins" | "harness" | "water" | "food" | "brake" | "skids" | "loads" | "dogs",
        [string, string]
      >;
    };
  };
  day5Lab: {
    title: string;
    subtitle: string;
    backButton: string;
    scoreLabel: string;
    gameStart: {
      title: string;
      caption: string;
      button: string;
    };
    gameFinal: {
      scoreTitle: string;
      backpackCaption: string;
      restartButton: string;
    };
  };
  day6: {
    title: string;
    nextButton: string;
    blocks: string[][];
  };
  day7: {
    title: string;
    videoTitle: string;
    backButton: string;
    blocks: string[][];
    videoTranslationNotice?: string;
  };
};

export const quest1Dictionaries: Record<Lang, Quest1Dictionary> = {
  ru,
  en,
  he,
};

export function useQuest1I18n() {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;
  return {
    lang,
    t: quest1Dictionaries[lang] ?? quest1Dictionaries.ru,
  };
}
