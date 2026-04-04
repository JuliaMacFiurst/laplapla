import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestLang } from "@/lib/i18n/routing";
import { loadStoryTemplate } from "@/lib/story/story-service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const templateId = typeof req.query.id === "string" ? req.query.id.trim() : "";
  if (!templateId) {
    return res.status(400).json({ error: "Template id is required" });
  }

  try {
    const template = await loadStoryTemplate(templateId, getRequestLang(req));
    return res.status(200).json(template);
  } catch (error) {
    console.error("Failed to load story template:", error);
    return res.status(500).json({ error: "Failed to load story template" });
  }
}
