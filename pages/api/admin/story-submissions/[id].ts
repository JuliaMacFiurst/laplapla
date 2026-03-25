import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type SubmissionStep = {
  step?: string;
  text?: string;
  keywords?: string[];
};

type SubmissionRecord = {
  assembled_story?: {
    steps?: SubmissionStep[];
  } | null;
};

const deriveSlidesFromSubmission = (submission: SubmissionRecord) => {
  const steps = Array.isArray(submission.assembled_story?.steps)
    ? submission.assembled_story.steps
    : [];

  return steps
    .filter((step) => typeof step?.step === "string" && typeof step?.text === "string")
    .map((step, index) => ({
      submission_id: null,
      step_key: step.step as string,
      slide_index: index,
      text: (step.text as string).trim(),
      keywords: Array.isArray(step.keywords) ? step.keywords : [],
      media_url: null,
    }));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Supabase server env is not configured" });
  }

  const submissionId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

  if (!submissionId) {
    return res.status(400).json({ error: "Missing submission id" });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: submission, error: submissionError } = await supabase
      .from("user_story_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (submissionError || !submission) {
      return res.status(404).json({ error: submissionError?.message || "Submission not found" });
    }

    console.warn("[DEPRECATED] user_story_slides usage detected");
    const slides = deriveSlidesFromSubmission(submission as SubmissionRecord);

    if (process.env.NODE_ENV === "development") {
      console.log("[ADMIN LOAD SLIDES]", slides ?? []);
    }

    return res.status(200).json({
      submission,
      slides: slides ?? [],
    });
  } catch (error) {
    console.error("[ADMIN STORY SUBMISSION LOAD ERROR]", error);
    return res.status(500).json({ error: "Internal error" });
  }
}
