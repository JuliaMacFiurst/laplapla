import type { NextApiRequest, NextApiResponse } from "next";
import { searchPexelsVideos } from "@/lib/pexelsVideo";
import { withApiHandler } from "@/utils/apiHandler";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "16kb",
    },
  },
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

export default withApiHandler(
  {
    guard: {
      methods: ["POST"],
      limit: 25,
      maxBodyBytes: 16 * 1024,
      keyPrefix: "search-pexels-video",
    },
  },
  handler,
);
