import type { NextApiRequest, NextApiResponse } from "next";
import { captureAndAlertServerError } from "@/lib/monitoring/captureAndAlertServerError";
import { getRequestLang } from "@/lib/i18n/routing";
import { loadApprovedUserStories, loadStoryTemplateSummaries } from "@/lib/story/story-service";
import type { StoryHeroOption } from "@/lib/story/story-shared";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const lang = getRequestLang(req);

  try {
    const [templates, userStories] = await Promise.all([
      loadStoryTemplateSummaries(lang),
      loadApprovedUserStories(lang),
    ]);

    const payload: StoryHeroOption[] = [
      ...templates.map((item) => ({
        type: "template" as const,
        id: item.id,
        title: item.title,
        heroName: item.heroName,
        translated: item.translated,
      })),
      ...userStories,
    ];

    return res.status(200).json(payload);
  } catch (error) {
    await captureAndAlertServerError(error, {
      route: req.url || "/api/story/heroes",
      method: req.method || "GET",
      runtime: "server",
      statusCode: 500,
    });
    console.error("Failed to load story heroes:", error);
    return res.status(500).json({ error: "Failed to load story heroes" });
  }
}
