import type { NextApiRequest, NextApiResponse } from "next";
import {
  buildStory,
  ensureFullStoryPath,
  loadStoryTemplate,
  validateStoryPath,
} from "@/lib/story/story-service";
import { getRequestLang } from "@/lib/i18n/routing";
import type { StoryChoiceIndex } from "@/lib/story/story-shared";

const isChoiceIndex = (value: unknown): value is StoryChoiceIndex =>
  value === 0 || value === 1 || value === 2;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lang = getRequestLang(req);
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const templateId = typeof req.body?.templateId === "string" ? req.body.templateId.trim() : "";
  const rawIntroChoiceIndex = Number(req.body?.introChoiceIndex);

  if (!templateId || !isChoiceIndex(rawIntroChoiceIndex)) {
    return res.status(400).json({ error: "Invalid templateId or introChoiceIndex" });
  }

  try {
    const template = await loadStoryTemplate(templateId, lang);
    const path = ensureFullStoryPath(template, { intro: rawIntroChoiceIndex });
    const validation = validateStoryPath(template, path);
    const story = buildStory(template, path);

    return res.status(200).json({
      templateId,
      path,
      story,
      warnings: validation.warnings,
      errors: validation.errors,
    });
  } catch (error) {
    console.error("Failed to preview story:", error);
    return res.status(500).json({ error: "Failed to preview story" });
  }
}
