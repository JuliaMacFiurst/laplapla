import type { NextApiRequest, NextApiResponse } from "next";
import { fetchCapybaraVideos, getMediaQuery } from "@/lib/capybaraMedia";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  try {
    const keywords = typeof req.query.keywords === "string" ? req.query.keywords.split(",") : [];
    const mood = typeof req.query.mood === "string" ? req.query.mood : undefined;
    const videos = await fetchCapybaraVideos(getMediaQuery(keywords, mood));
    res.status(200).json(videos);
  } catch (error) {
    console.error("Ошибка загрузки видео с капибарами:", error);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
}
