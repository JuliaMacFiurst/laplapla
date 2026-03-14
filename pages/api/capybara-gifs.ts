import type { NextApiRequest, NextApiResponse } from "next";
import { fetchCapybaraGifs, getMediaQuery } from "@/lib/capybaraMedia";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!process.env.GIPHY_API_KEY) {
    return res.status(500).json({ error: "GIPHY_API_KEY not set" });
  }

  try {
    const keywords = typeof req.query.keywords === "string" ? req.query.keywords.split(",") : [];
    const mood = typeof req.query.mood === "string" ? req.query.mood : undefined;
    const gifs = await fetchCapybaraGifs(getMediaQuery(keywords, mood));
    res.status(200).json(gifs);
  } catch (error) {
    console.error("Ошибка при обращении к Giphy API:", error);
    res.status(500).json({ error: "Ошибка при получении гифок с капибарами" });
  }
}
