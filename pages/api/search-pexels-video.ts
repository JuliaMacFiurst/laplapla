import type { NextApiRequest, NextApiResponse } from "next";
import { searchPexelsVideos } from "@/lib/pexelsVideo";
import { applyApiGuard } from "@/utils/rateLimit";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "16kb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!applyApiGuard(req, res, {
    methods: ["POST"],
    limit: 25,
    maxBodyBytes: 16 * 1024,
    keyPrefix: "search-pexels-video",
  })) {
    return;
  }

  const { query } = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing query" });
  }

  try {
    const videos = await searchPexelsVideos(query);

    if (!videos || videos.length === 0) {
      return res.status(200).json({ videos: [] });
    }

    return res.status(200).json({ videos });
  } catch (error) {
    console.error("Pexels video search error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
