import type { NextApiRequest, NextApiResponse } from "next";
import { fetchCapybaraGifs, getMediaQuery } from "@/lib/capybaraMedia";
import { withApiHandler } from "@/utils/apiHandler";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!process.env.GIPHY_API_KEY) {
    return res.status(500).json({ error: "GIPHY_API_KEY not set" });
  }

  const keywords = typeof req.query.keywords === "string" ? req.query.keywords.split(",") : [];
  const mood = typeof req.query.mood === "string" ? req.query.mood : undefined;
  const gifs = await fetchCapybaraGifs(getMediaQuery(keywords, mood));
  res.status(200).json(gifs);
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET"],
      limit: 25,
      keyPrefix: "capybara-gifs",
    },
    cacheControl: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    onError: (error, _req, res) => {
      console.error("Ошибка при обращении к Giphy API:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Ошибка при получении гифок с капибарами" });
      }
    },
  },
  handler,
);
