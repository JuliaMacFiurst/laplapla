import type { NextApiRequest, NextApiResponse } from "next";
import { fetchCapybaraImages, getMediaQuery } from "@/lib/capybaraMedia";
import { withApiHandler } from "@/utils/apiHandler";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const keywords = typeof req.query.keywords === "string" ? req.query.keywords.split(",") : [];
  const mood = typeof req.query.mood === "string" ? req.query.mood : undefined;
  const images = await fetchCapybaraImages(getMediaQuery(keywords, mood));
  res.status(200).json(images);
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET"],
      limit: 25,
      keyPrefix: "capybara-images",
    },
    cacheControl: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    onError: (error, _req, res) => {
      console.error("Failed to fetch images from Pexels:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to fetch images" });
      }
    },
  },
  handler,
);
