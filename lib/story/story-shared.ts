import { extractSlideKeywords } from "@/hooks/useBook";

export const STORY_STEP_KEYS = [
  "narration",
  "intro",
  "journey",
  "problem",
  "solution",
  "ending",
] as const;

export type StoryStepKey = (typeof STORY_STEP_KEYS)[number];
export type StoryChoiceIndex = 0 | 1 | 2;

export type StoryPath = {
  narration: StoryChoiceIndex;
  intro: StoryChoiceIndex;
  journey: StoryChoiceIndex;
  problem: StoryChoiceIndex;
  solution: StoryChoiceIndex;
  ending: StoryChoiceIndex;
};

export const STORY_BLOCK_ORDER = [
  "narration",
  "intro",
  "intro_fragment",
  "journey",
  "journey_fragment",
  "problem",
  "problem_fragment",
  "solution",
  "solution_fragment",
  "ending",
  "ending_fragment",
] as const;

export type StoryBlockStepKey = (typeof STORY_BLOCK_ORDER)[number];

export type StoryBlock = {
  step: StoryBlockStepKey;
  text: string;
  slides: string[];
  keywords: string[];
  mediaUrl?: string;
};

export type StorySlide = StoryBlock;

export type StoryTemplateSummary = {
  id: string;
  title: string;
  heroName: string;
  translated?: boolean;
};

export type StoryHeroOption =
  | {
      type: "template";
      id: string;
      title: string;
      heroName: string;
      translated?: boolean;
    }
  | {
      type: "user_story";
      id: string;
      heroName: string;
      translated?: boolean;
    };

type NormalizedChoice = {
  id: string;
  index: number;
  text: string;
  fragments: string[];
};

type NormalizedStep = {
  id: string;
  key: StoryStepKey;
  title: string;
  narration?: string;
  choices: NormalizedChoice[];
};

export type NormalizedStoryTemplate = {
  id: string;
  title: string;
  heroName: string;
  steps: Record<StoryStepKey, NormalizedStep>;
  translated?: boolean;
};

const makeKeywords = (text: string) => extractSlideKeywords(text);

export function splitTextToSlides(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function blocksToSlides(blocks: StoryBlock[]): StorySlide[] {
  return blocks.flatMap((block) => {
    const slides = block.slides.length ? block.slides : splitTextToSlides(block.text);

    return slides.map((text) => ({
      ...block,
      text,
      slides: [text],
      keywords: block.keywords.length ? block.keywords : makeKeywords(text),
    }));
  });
}
