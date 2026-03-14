import type { NextApiRequest, NextApiResponse } from "next";
import { fetchCapybaraImages, getMediaQuery } from "@/lib/capybaraMedia";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const keywords = typeof req.query.keywords === "string" ? req.query.keywords.split(",") : [];
    const mood = typeof req.query.mood === "string" ? req.query.mood : undefined;
    const images = await fetchCapybaraImages(getMediaQuery(keywords, mood));
    res.status(200).json(images);
  } catch (error) {
    console.error("Failed to fetch images from Pexels:", error);
    res.status(500).json({ error: "Failed to fetch images" });
  }
}
