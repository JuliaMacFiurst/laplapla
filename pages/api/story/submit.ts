import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type StorySubmitBody = {
  mode?: "template" | "custom" | null;
  templateId?: string | null;
  heroName?: string;
  userInput?: Record<string, unknown>;
  assembledStory?: {
    heroName?: string;
    mode?: "template" | "custom" | null;
    templateId?: string | null;
    steps?: Array<{
      step?: string;
      text?: string;
      slides?: string[];
      keywords?: string[];
    }>;
  };
  slides?: Array<{
    step?: string;
    text?: string;
    keywords?: string[];
    mediaUrl?: string | null;
  }>;
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Supabase server env is not configured" });
  }

  try {
    console.log("[API HIT]", req.body);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { mode, templateId, heroName, userInput, assembledStory, slides } = req.body as StorySubmitBody;

    if (!heroName || typeof heroName !== "string" || !assembledStory) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    if (process.env.NODE_ENV === "development") {
      const semanticMismatch =
        (mode === "template" && Array.isArray(userInput?.answers)) ||
        (mode === "custom" && !Array.isArray(userInput?.answers)) ||
        !Array.isArray(assembledStory.steps);

      if (semanticMismatch) {
        console.warn("[STORY SEMANTIC WARNING]", {
          mode,
          user_input: userInput,
          assembled_story: assembledStory,
        });
      }
    }

    console.log("[USER STORY SAVE]", {
      target: "user_story_submissions",
      payload: assembledStory,
    });

    if (Array.isArray(slides) && slides.length > 0) {
      console.warn("[DEPRECATED] user_story_slides usage detected");
    }

    const { data: submission, error: submissionError } = await supabase
      .from("user_story_submissions")
      .insert({
        mode: mode ?? null,
        template_id: templateId ?? null,
        hero_name: heroName.trim(),
        user_input: userInput ?? {},
        assembled_story: assembledStory,
        status: "pending",
      })
      .select("id")
      .single();

    if (submissionError || !submission) {
      console.error("[SUBMIT STORY INSERT ERROR]", submissionError);
      return res.status(500).json({ error: submissionError?.message || "Failed to create submission" });
    }

    if (!assembledStory || typeof assembledStory !== "object") {
      return res.status(500).json({ error: "Submission created without assembled_story" });
    }

    return res.status(200).json({
      ok: true,
      id: submission.id,
      assembledStoryPresent: true,
    });
  } catch (error) {
    console.error("[SUBMIT STORY INTERNAL ERROR]", error);
    return res.status(500).json({ error: "Internal error" });
  }
}
