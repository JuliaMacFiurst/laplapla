import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestLang } from "@/lib/i18n/routing";
import { loadApprovedUserStory } from "@/lib/story/story-service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const submissionId = typeof req.query.id === "string" ? req.query.id.trim() : "";
  if (!submissionId) {
    return res.status(400).json({ error: "Submission id is required" });
  }

  try {
    const story = await loadApprovedUserStory(submissionId, getRequestLang(req));
    return res.status(200).json(story);
  } catch (error) {
    console.error("Failed to load user story:", error);
    return res.status(500).json({ error: "Failed to load user story" });
  }
}
