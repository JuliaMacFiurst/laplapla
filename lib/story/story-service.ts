import { extractSlideKeywords } from "@/hooks/useBook";
import { supabase } from "@/lib/supabase";

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
};

type LooseRecord = Record<string, unknown>;

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
};

export type StoryPathValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

const STEP_KEY_ALIASES: Record<StoryStepKey, string[]> = {
  narration: ["narration", "intro_narration", "scene_narration"],
  intro: ["intro", "beginning", "start"],
  journey: ["journey", "adventure", "travel", "quest"],
  problem: ["problem", "conflict", "challenge"],
  solution: ["solution", "resolve", "fix", "answer"],
  ending: ["ending", "finale", "end", "finish"],
};

const isRecord = (value: unknown): value is LooseRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const toText = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = toText(value);
    if (text) {
      return text;
    }
  }

  return "";
};

const normalizeChoiceIndex = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
};

const resolveStepKey = (row: LooseRecord, index: number): StoryStepKey => {
  const rawKey = firstText(
    row.step_key,
    row.key,
    row.slug,
    row.step,
    row.name,
    row.type,
  ).toLowerCase();

  const matchedEntry = Object.entries(STEP_KEY_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => rawKey.includes(alias)),
  );
  if (matchedEntry) {
    return matchedEntry[0] as StoryStepKey;
  }

  return STORY_STEP_KEYS[index] || "ending";
};

const resolveChoiceFragments = (choice: LooseRecord, step: LooseRecord, linkedFragments: LooseRecord[]) => {
  const embeddedFragments = [
    ...asArray(choice.fragments),
    ...asArray(choice.story_fragments),
    ...asArray(choice.options),
  ];

  const texts = [
    ...embeddedFragments.map((item) =>
      isRecord(item)
        ? firstText(item.text, item.content, item.fragment_text, item.body, item.value)
        : toText(item)),
    ...linkedFragments.map((fragment) =>
      firstText(fragment.text, fragment.content, fragment.fragment_text, fragment.body, fragment.value)),
    firstText(choice.fragment, choice.content, choice.description),
    firstText(step.fragment, step.content_variant),
  ].filter(Boolean);

  return texts.length ? texts : [firstText(choice.text, choice.title, choice.label)].filter(Boolean);
};

const emptyStep = (key: StoryStepKey): NormalizedStep => ({
  id: key,
  key,
  title: key,
  choices: [],
});

const isDev = () => process.env.NODE_ENV === "development";

const logDev = (title: string, payload: unknown) => {
  if (!isDev()) {
    return;
  }

  console.log(title, payload);
};

export function createDefaultStoryPath(): StoryPath {
  return {
    narration: 0,
    intro: 0,
    journey: 0,
    problem: 0,
    solution: 0,
    ending: 0,
  };
}

async function selectByCandidateColumn(table: string, value: string, columns: string[]) {
  for (const column of columns) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(column, value);

    if (!error) {
      return data || [];
    }
  }

  return [];
}

const collectNestedRows = (template: LooseRecord, keys: string[]) => {
  for (const key of keys) {
    const rows = asArray(template[key]);
    if (rows.length) {
      return rows.filter(isRecord);
    }
  }

  return [] as LooseRecord[];
};

export async function loadStoryTemplateSummaries(): Promise<StoryTemplateSummary[]> {
  const { data, error } = await supabase
    .from("story_templates")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => {
    const record = row as LooseRecord;
    return {
      id: String(record.id),
      title: firstText(record.title, record.name, record.hero_name, record.hero, record.character_name) || "Story hero",
      heroName: firstText(record.hero_name, record.hero, record.character_name, record.title, record.name) || "Capybara",
    };
  });
}

export async function loadStoryTemplate(templateId: string): Promise<NormalizedStoryTemplate> {
  const { data: template, error } = await supabase
    .from("story_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (error) {
    throw error;
  }

  const templateRecord = (template || {}) as LooseRecord;
  const nestedSteps = collectNestedRows(templateRecord, ["steps", "story_steps"]);
  const steps = nestedSteps.length
    ? nestedSteps
    : await selectByCandidateColumn("story_steps", templateId, ["template_id", "story_template_id"]);

  const stepRecords = (steps || []).filter(isRecord);
  const stepIds = stepRecords.map((row) => String(row.id)).filter(Boolean);

  const nestedChoices = collectNestedRows(templateRecord, ["choices", "story_choices"]);
  const nestedFragments = collectNestedRows(templateRecord, ["fragments", "story_fragments"]);
  const nestedTwists = collectNestedRows(templateRecord, ["twists", "story_twists"]);

  const choices = nestedChoices.length
    ? nestedChoices
    : (await Promise.all(stepIds.map((stepId) =>
      selectByCandidateColumn("story_choices", stepId, ["step_id", "story_step_id"]))))
      .flat()
      .filter(isRecord);

  const choiceIds = choices.map((row) => String((row as LooseRecord).id)).filter(Boolean);
  const fragments = nestedFragments.length
    ? nestedFragments
    : (await Promise.all([
      ...stepIds.map((stepId) => selectByCandidateColumn("story_fragments", stepId, ["step_id", "story_step_id"])),
      ...choiceIds.map((choiceId) => selectByCandidateColumn("story_fragments", choiceId, ["choice_id", "story_choice_id"])),
    ])).flat().filter(isRecord);

  const twists = nestedTwists.length
    ? nestedTwists
    : (await Promise.all(stepIds.map((stepId) =>
      selectByCandidateColumn("story_twists", stepId, ["step_id", "story_step_id"]))))
      .flat()
      .filter(isRecord);

  const normalizedSteps = STORY_STEP_KEYS.reduce<Record<StoryStepKey, NormalizedStep>>((acc, key) => {
    acc[key] = emptyStep(key);
    return acc;
  }, {} as Record<StoryStepKey, NormalizedStep>);

  stepRecords.forEach((stepRecord, stepIndex) => {
    const key = resolveStepKey(stepRecord, stepIndex);
    const stepId = String(stepRecord.id ?? key);
    const ownChoices = choices.filter((choice) => {
      const choiceRecord = choice as LooseRecord;
      return [choiceRecord.step_id, choiceRecord.story_step_id].some((value) => String(value ?? "") === stepId);
    });

    const embeddedChoices = [
      ...asArray(stepRecord.choices),
      ...asArray(stepRecord.story_choices),
    ].filter(isRecord);

    const choicesPool = ownChoices.length ? ownChoices : embeddedChoices;
    const normalizedChoices = choicesPool
      .map((choiceRecord, choiceIndex) => {
        const linkedFragments = fragments.filter((fragment) => {
          const fragmentRecord = fragment as LooseRecord;
          return [fragmentRecord.choice_id, fragmentRecord.story_choice_id].some((value) =>
            String(value ?? "") === String(choiceRecord.id ?? ""),
          );
        });

        const text = firstText(choiceRecord.text, choiceRecord.title, choiceRecord.label, choiceRecord.content)
          || `Option ${choiceIndex + 1}`;

        return {
          id: String(choiceRecord.id ?? `${stepId}-${choiceIndex}`),
          index: normalizeChoiceIndex(choiceRecord.choice_index ?? choiceRecord.position ?? choiceRecord.sort_order) ?? choiceIndex,
          text,
          fragments: resolveChoiceFragments(choiceRecord, stepRecord, linkedFragments),
        };
      })
      .sort((left, right) => left.index - right.index)
      .slice(0, 3);

    const stepTwist = twists.find((twist) => {
      const twistRecord = twist as LooseRecord;
      return [twistRecord.step_id, twistRecord.story_step_id].some((value) => String(value ?? "") === stepId);
    }) as LooseRecord | undefined;

    normalizedSteps[key] = {
      id: stepId,
      key,
      title: firstText(stepRecord.title, stepRecord.name, stepRecord.prompt, key) || key,
      narration: firstText(
        stepRecord.narration,
        stepRecord.text,
        stepRecord.content,
        stepTwist?.text,
        stepTwist?.content,
      ),
      choices: normalizedChoices,
    };
  });

  return {
    id: String(templateRecord.id ?? templateId),
    title: firstText(templateRecord.title, templateRecord.name, templateRecord.hero_name, templateRecord.hero) || "Story",
    heroName: firstText(templateRecord.hero_name, templateRecord.hero, templateRecord.character_name, templateRecord.title) || "Capybara",
    steps: normalizedSteps,
  };
}

const clampChoiceIndex = (value: number | undefined): StoryChoiceIndex => {
  if (value === 1 || value === 2) {
    return value;
  }

  return 0;
};

const makeKeywords = (text: string) => extractSlideKeywords(text);

const STEP_FRAGMENT_SUFFIX = "_fragment";

const toFragmentStepKey = (stepKey: Exclude<StoryStepKey, "narration">): StoryBlockStepKey =>
  `${stepKey}${STEP_FRAGMENT_SUFFIX}` as StoryBlockStepKey;

export function splitTextToSlides(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

type StoryPathResolutionContext = {
  template: NormalizedStoryTemplate;
  introChoiceIndex: StoryChoiceIndex;
  path: Partial<StoryPath>;
};

export function resolveStepIndex(
  stepKey: Exclude<StoryStepKey, "narration" | "intro">,
  previousIndex: StoryChoiceIndex,
  _context: StoryPathResolutionContext,
): StoryChoiceIndex {
  void stepKey;
  return previousIndex;
}

export function resolveStoryPathFromIntro(
  template: NormalizedStoryTemplate,
  introChoiceIndex: StoryChoiceIndex,
): StoryPath {
  const context: StoryPathResolutionContext = {
    template,
    introChoiceIndex,
    path: { intro: introChoiceIndex },
  };

  const path: StoryPath = {
    narration: 0,
    intro: introChoiceIndex,
    journey: resolveStepIndex("journey", introChoiceIndex, context),
    problem: resolveStepIndex("problem", introChoiceIndex, context),
    solution: resolveStepIndex("solution", introChoiceIndex, context),
    ending: resolveStepIndex("ending", introChoiceIndex, context),
  };

  logDev("[STORY PATH RESOLVED]", {
    introIndex: introChoiceIndex,
    fullPath: path,
  });

  return path;
}

export function ensureFullStoryPath(
  template: NormalizedStoryTemplate,
  partialPath: Partial<StoryPath>,
): StoryPath {
  const defaultPath = createDefaultStoryPath();
  const introChoiceIndex = clampChoiceIndex(partialPath.intro);
  const resolvedPath = resolveStoryPathFromIntro(template, introChoiceIndex);

  const fullPath: StoryPath = {
    ...defaultPath,
    ...resolvedPath,
  };

  for (const stepKey of STORY_STEP_KEYS) {
    const value = partialPath[stepKey];
    if (value == null) {
      continue;
    }

    fullPath[stepKey] = clampChoiceIndex(value);
  }

  fullPath.narration = 0;
  return fullPath;
}

export function validateStoryPath(
  template: NormalizedStoryTemplate,
  path: StoryPath,
): StoryPathValidationResult {
  const errors: string[] = [];

  for (const stepKey of STORY_STEP_KEYS) {
    const step = template.steps[stepKey];
    if (!step) {
      errors.push(`Missing step: ${stepKey}`);
      continue;
    }

    const index = path[stepKey];
    if (![0, 1, 2].includes(index)) {
      errors.push(`Invalid index for ${stepKey}: ${String(index)}`);
      continue;
    }

    if (stepKey === "narration") {
      if (!firstText(step.narration, step.choices[0]?.fragments[0])) {
        errors.push(`Missing narration text for ${stepKey}`);
      }
      continue;
    }

    const choice = step.choices[index];
    if (!choice) {
      errors.push(`Missing choice for ${stepKey} at index ${index}`);
      continue;
    }

    if (!firstText(choice.text, choice.fragments[0])) {
      errors.push(`Missing text for ${stepKey} at index ${index}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

const getRequiredStoryText = (
  template: NormalizedStoryTemplate,
  stepKey: StoryStepKey,
  choiceIndex: StoryChoiceIndex,
) => {
  const step = template.steps[stepKey] || emptyStep(stepKey);

  if (stepKey === "narration") {
    const narrationText = firstText(step.narration, step.choices[0]?.fragments[0]);
    if (narrationText) {
      return narrationText;
    }

    throw new Error(`Missing narration text for ${stepKey}`);
  }

  const selectedChoice = step.choices[choiceIndex] || step.choices[0];
  if (!selectedChoice) {
    throw new Error(`Missing choice for ${stepKey} at index ${choiceIndex}`);
  }

  const selectedText = firstText(selectedChoice.text, selectedChoice.fragments[0]);
  if (selectedText) {
    return selectedText;
  }

  throw new Error(`Missing text for ${stepKey} at index ${choiceIndex}`);
};

const getOptionalFragmentText = (
  template: NormalizedStoryTemplate,
  stepKey: Exclude<StoryStepKey, "narration">,
  choiceIndex: StoryChoiceIndex,
) => {
  const step = template.steps[stepKey] || emptyStep(stepKey);
  const selectedChoice = step.choices[choiceIndex] || step.choices[0];

  if (!selectedChoice) {
    return null;
  }

  return firstText(selectedChoice.fragments[0]);
};

const hasExactStoryOrder = (blocks: StoryBlock[]) =>
  blocks.every((block, index, items) => {
    if (block.step.endsWith(STEP_FRAGMENT_SUFFIX)) {
      const previousStep = items[index - 1]?.step;
      return previousStep === block.step.slice(0, -STEP_FRAGMENT_SUFFIX.length);
    }

    return STORY_BLOCK_ORDER.includes(block.step);
  });

export function buildStory(template: NormalizedStoryTemplate, path: Partial<StoryPath>): StoryBlock[] {
  const fullPath = ensureFullStoryPath(template, path);
  const validation = validateStoryPath(template, fullPath);
  if (!validation.valid) {
    throw new Error(validation.errors.join("\n"));
  }

  const blocks: StoryBlock[] = [
    {
      step: "narration",
      text: getRequiredStoryText(template, "narration", fullPath.narration),
      slides: [],
      keywords: [],
    },
  ];

  for (const stepKey of STORY_STEP_KEYS) {
    if (stepKey === "narration") {
      continue;
    }

    const choiceIndex = fullPath[stepKey];
    const stepText = getRequiredStoryText(template, stepKey, choiceIndex);
    const fragmentText = getOptionalFragmentText(template, stepKey, choiceIndex);

    blocks.push(
      {
        step: stepKey,
        text: stepText,
        slides: [],
        keywords: [],
      },
    );

    if (fragmentText) {
      blocks.push({
        step: toFragmentStepKey(stepKey),
        text: fragmentText,
        slides: [],
        keywords: [],
      });
    }
  }

  const normalizedBlocks = blocks.map((block) => ({
    ...block,
    slides: splitTextToSlides(block.text),
    keywords: block.keywords.length ? block.keywords : makeKeywords(block.text),
  }));

  if (isDev() && !hasExactStoryOrder(normalizedBlocks)) {
    console.warn("[STORY ORDER INVALID]", normalizedBlocks.map((block) => block.step));
  }

  logDev("[STORY BUILD]", {
    stepsCount: normalizedBlocks.length,
    validationErrors: validation.errors,
  });

  return normalizedBlocks;
}

export function blocksToSlides(blocks: StoryBlock[]): StorySlide[] {
  return blocks.flatMap((block) => {
    const slides = block.slides.length ? block.slides : splitTextToSlides(block.text);

    return slides.map((text) => ({
      step: block.step,
      text,
      slides: [text],
      keywords: makeKeywords(text),
      mediaUrl: block.mediaUrl,
    }));
  });
}
