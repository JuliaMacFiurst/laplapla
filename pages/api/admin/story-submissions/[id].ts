import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    const { data: slides, error: slidesError } = await supabase
      .from("user_story_slides")
      .select("*")
      .eq("submission_id", submissionId)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("slide_index", { ascending: true });

    if (slidesError) {
      return res.status(500).json({ error: slidesError.message });
    }

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
