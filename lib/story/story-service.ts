import { getTranslationPayload, getTranslationPayloadMap } from "@/lib/contentTranslations";
import { supabase } from "@/lib/supabase";
import type { Lang } from "@/i18n";
import {
  STORY_BLOCK_ORDER,
  STORY_STEP_KEYS,
  splitTextToSlides,
  type NormalizedStoryTemplate,
  type StoryBlock,
  type StoryBlockStepKey,
  type StoryChoiceIndex,
  type StoryHeroOption,
  type StoryPath,
  type StorySlide,
  type StoryStepKey,
  type StoryTemplateSummary,
} from "@/lib/story/story-shared";

type LooseRecord = Record<string, unknown>;

type NormalizedStep = {
  id: string;
  key: StoryStepKey;
  title: string;
  narration?: string;
  choices: NormalizedStoryTemplate["steps"][StoryStepKey]["choices"];
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

const normalizeTranslationStepKey = (value: unknown): StoryStepKey | null => {
  const rawKey = firstText(value).toLowerCase();
  if (!rawKey) {
    return null;
  }

  const matchedEntry = Object.entries(STEP_KEY_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => rawKey.includes(alias)),
  );
  return matchedEntry ? matchedEntry[0] as StoryStepKey : null;
};

const getStoryTemplateStepTranslation = (translation: LooseRecord | null, stepKey: StoryStepKey) =>
  asArray(translation?.steps)
    .map((item) => (isRecord(item) ? item : null))
    .find((step) => normalizeTranslationStepKey(step?.key ?? step?.step ?? step?.slug ?? step?.name) === stepKey) || null;

const applyStoryTemplateTranslation = (
  template: NormalizedStoryTemplate,
  translation: unknown,
): NormalizedStoryTemplate => {
  const record = isRecord(translation) ? translation : null;
  if (!record) {
    return {
      ...template,
      translated: false,
    };
  }

  const steps = STORY_STEP_KEYS.reduce<Record<StoryStepKey, NormalizedStep>>((acc, stepKey) => {
    const baseStep = template.steps[stepKey];
    const translatedStep = getStoryTemplateStepTranslation(record, stepKey);
    const translatedChoices = baseStep.choices.map((choice, index) => {
      const translatedChoicesPool = asArray(translatedStep?.choices)
        .map((item) => (isRecord(item) ? item : null))
        .filter((item): item is LooseRecord => Boolean(item));
      const translatedChoice = translatedChoicesPool.find((item) =>
        normalizeChoiceIndex(item.choice_index ?? item.index ?? item.position) === choice.index,
      ) || translatedChoicesPool[index] || null;
      const translatedFragments = asArray(translatedChoice?.fragments)
        .map((item) => {
          if (isRecord(item)) {
            return firstText(item.text, item.content, item.fragment_text, item.body, item.value);
          }
          return firstText(item);
        })
        .filter(Boolean);

      return {
        ...choice,
        text: firstText(translatedChoice?.text, translatedChoice?.title, translatedChoice?.label) || choice.text,
        fragments: translatedFragments.length ? translatedFragments : choice.fragments,
      };
    });

    acc[stepKey] = {
      ...baseStep,
      title: firstText(translatedStep?.title, translatedStep?.name, translatedStep?.prompt) || baseStep.title,
      narration: firstText(translatedStep?.narration, translatedStep?.text, translatedStep?.content) || baseStep.narration,
      choices: translatedChoices,
    };
    return acc;
  }, {} as Record<StoryStepKey, NormalizedStep>);

  return {
    ...template,
    title: firstText(record.title, record.name) || template.title,
    heroName: firstText(record.hero_name, record.hero, record.character_name, record.title) || template.heroName,
    steps,
    translated: true,
  };
};

export async function loadStoryTemplateSummaries(lang: Lang = "ru"): Promise<StoryTemplateSummary[]> {
  const { data, error } = await supabase
    .from("story_templates")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const baseTemplates = (data || []).map((row) => {
    const record = row as LooseRecord;
    return {
      id: String(record.id),
      title: firstText(record.title, record.name, record.hero_name, record.hero, record.character_name) || "Story hero",
      heroName: firstText(record.hero_name, record.hero, record.character_name, record.title, record.name) || "Capybara",
    };
  });

  if (lang === "ru" || baseTemplates.length === 0) {
    return baseTemplates.map((item) => ({ ...item, translated: true }));
  }

  const translationMap = await getTranslationPayloadMap("story_template", baseTemplates.map((item) => item.id), lang);
  return baseTemplates.map((item) => {
    const translation = translationMap.get(item.id);
    const record = isRecord(translation) ? translation : null;

    return {
      ...item,
      title: firstText(record?.title, record?.name, record?.hero_name) || item.title,
      heroName: firstText(record?.hero_name, record?.hero, record?.character_name, record?.title) || item.heroName,
      translated: Boolean(record),
    };
  });
}

export async function loadApprovedUserStories(lang: Lang = "ru"): Promise<Extract<StoryHeroOption, { type: "user_story" }>[]> {
  const { data, error } = await supabase
    .from("user_story_submissions")
    .select("id, hero_name")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const baseStories = (data || []).map((row) => {
    const record = row as LooseRecord;
    return {
      type: "user_story" as const,
      id: String(record.id),
      heroName: firstText(record.hero_name, record.hero, record.character_name, record.title, record.name) || "Capybara",
    };
  });

  if (lang === "ru" || baseStories.length === 0) {
    return baseStories.map((item) => ({ ...item, translated: true }));
  }

  const translationMap = await getTranslationPayloadMap("story_submission", baseStories.map((item) => item.id), lang);
  return baseStories.map((item) => {
    const translation = translationMap.get(item.id);
    const record = isRecord(translation) ? translation : null;

    return {
      ...item,
      heroName: firstText(record?.hero_name, record?.title) || item.heroName,
      translated: Boolean(record),
    };
  });
}

type ApprovedUserStoryRecord = {
  heroName: string;
  slides: StorySlide[];
  translated: boolean;
};

export async function loadApprovedUserStory(submissionId: string, lang: Lang = "ru"): Promise<ApprovedUserStoryRecord> {
  const { data, error } = await supabase
    .from("user_story_submissions")
    .select("hero_name, assembled_story")
    .eq("id", submissionId)
    .eq("status", "approved")
    .single();

  if (error) {
    throw error;
  }

  const record = (data || {}) as LooseRecord;
  const translation = lang !== "ru" ? await getTranslationPayload("story_submission", submissionId, lang) : null;
  const translationRecord = isRecord(translation) ? translation : null;
  const assembledStory = isRecord(translationRecord?.assembled_story)
    ? translationRecord.assembled_story
    : isRecord(record.assembled_story)
      ? record.assembled_story
      : null;

  return {
    heroName: firstText(
      translationRecord?.hero_name,
      record.hero_name,
      assembledStory?.heroName,
      assembledStory?.hero_name,
    ) || "Capybara",
    slides: parseUserStoryToSlides(assembledStory),
    translated: lang === "ru" ? true : Boolean(translationRecord),
  };
}

export async function loadStoryTemplate(templateId: string, lang: Lang = "ru"): Promise<NormalizedStoryTemplate> {
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

  const normalizedTemplate = {
    id: String(templateRecord.id ?? templateId),
    title: firstText(templateRecord.title, templateRecord.name, templateRecord.hero_name, templateRecord.hero) || "Story",
    heroName: firstText(templateRecord.hero_name, templateRecord.hero, templateRecord.character_name, templateRecord.title) || "Capybara",
    steps: normalizedSteps,
  };

  if (lang === "ru") {
    return {
      ...normalizedTemplate,
      translated: true,
    };
  }

  const translation = await getTranslationPayload("story_template", templateId, lang);
  return applyStoryTemplateTranslation(normalizedTemplate, translation);
}

const clampChoiceIndex = (value: number | undefined): StoryChoiceIndex => {
  if (value === 1 || value === 2) {
    return value;
  }

  return 0;
};

const STEP_FRAGMENT_SUFFIX = "_fragment";

const toFragmentStepKey = (stepKey: Exclude<StoryStepKey, "narration">): StoryBlockStepKey =>
  `${stepKey}${STEP_FRAGMENT_SUFFIX}` as StoryBlockStepKey;

export function parseUserStoryToSlides(assembledStory: unknown): StorySlide[] {
  if (!isRecord(assembledStory) || !Array.isArray(assembledStory.steps)) {
    return [];
  }

  return assembledStory.steps
    .filter(isRecord)
    .flatMap((stepRecord, index) => {
      const step = resolveStepKey(stepRecord, index);
      const stepText = firstText(stepRecord.text, stepRecord.content, stepRecord.body);
      if (!stepText) {
        return [];
      }

      const stepKeywords = asArray(stepRecord.keywords).map(toText).filter(Boolean);
      const sentences = splitTextToSlides(stepText);

      return sentences.map((text) => ({
        step,
        text,
        slides: [text],
        keywords: stepKeywords,
        mediaUrl: undefined,
      }));
    });
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
    keywords: block.keywords,
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
