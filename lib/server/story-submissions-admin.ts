const CANONICAL_STEPS = [
  "narration",
  "intro",
  "journey",
  "problem",
  "solution",
  "ending",
] as const;

export type CanonicalStoryStepKey = (typeof CANONICAL_STEPS)[number];

export type AdminStorySlide = {
  id?: string;
  step_key?: string | null;
  slide_index?: number | null;
  sort_order?: number | null;
  text?: string | null;
  keywords?: string[] | null;
  media_url?: string | null;
};

export type AdminAssembledStoryStep = {
  step?: string | null;
  text?: string | null;
  slides?: string[] | null;
  keywords?: string[] | null;
};

export type AdminStorySubmissionRecord = {
  id?: string;
  hero_name?: string | null;
  mode?: "template" | "custom" | null;
  user_input?: Record<string, unknown> | null;
  assembled_story?: {
    heroName?: string | null;
    mode?: "template" | "custom" | null;
    templateId?: string | null;
    steps?: AdminAssembledStoryStep[] | null;
  } | null;
};

type SlidesByStep = Partial<Record<CanonicalStoryStepKey | string, AdminStorySlide[]>>;
type StepsByKey = Partial<Record<CanonicalStoryStepKey | string, AdminAssembledStoryStep>>;

export function groupSlidesByStep(slides: AdminStorySlide[] | null | undefined): SlidesByStep {
  const map: SlidesByStep = {};

  for (const slide of slides || []) {
    if (!slide?.step_key) continue;

    if (!map[slide.step_key]) {
      map[slide.step_key] = [];
    }

    map[slide.step_key]!.push(slide);
  }

  return map;
}

export function getPrimarySlide(slides: AdminStorySlide[] | null | undefined): AdminStorySlide | null {
  if (!Array.isArray(slides) || slides.length === 0) {
    return null;
  }

  return slides
    .slice()
    .sort((a, b) => {
      const sortOrderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);

      if (sortOrderDiff !== 0) {
        return sortOrderDiff;
      }

      return (a.slide_index ?? 0) - (b.slide_index ?? 0);
    })[0] ?? null;
}

export function mapSteps(steps: AdminAssembledStoryStep[] | null | undefined): StepsByKey {
  const map: StepsByKey = {};

  for (const step of steps || []) {
    if (!step?.step) continue;
    map[step.step] = step;
  }

  return map;
}

export function getStepEditorText(
  stepKey: CanonicalStoryStepKey,
  slidesGrouped: SlidesByStep,
  assembledStepsMap: StepsByKey,
): string {
  return (
    getPrimarySlide(slidesGrouped[stepKey])?.text
    ?? assembledStepsMap[stepKey]?.text
    ?? ""
  );
}

export function buildAdminStoryEditorState(
  submission: AdminStorySubmissionRecord | null | undefined,
  slides: AdminStorySlide[] | null | undefined,
) {
  const slidesGrouped = groupSlidesByStep(slides);
  const assembledStepsMap = mapSteps(submission?.assembled_story?.steps);

  if (process.env.NODE_ENV === "development") {
    console.log("[ADMIN SLIDES]", slides ?? []);
    console.log("[ADMIN GROUPED]", slidesGrouped);
  }

  return {
    slidesGrouped,
    assembledStepsMap,
    narrationText: getStepEditorText("narration", slidesGrouped, assembledStepsMap),
    introText: getStepEditorText("intro", slidesGrouped, assembledStepsMap),
    journeyText: getStepEditorText("journey", slidesGrouped, assembledStepsMap),
    problemText: getStepEditorText("problem", slidesGrouped, assembledStepsMap),
    solutionText: getStepEditorText("solution", slidesGrouped, assembledStepsMap),
    endingText: getStepEditorText("ending", slidesGrouped, assembledStepsMap),
  };
}

export function getCanonicalStorySteps(): readonly CanonicalStoryStepKey[] {
  return CANONICAL_STEPS;
}
