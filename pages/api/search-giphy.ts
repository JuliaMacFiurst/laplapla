
import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from "@/utils/apiHandler";
import { fetchWithTimeout } from "@/lib/server/security/fetchWithTimeout";

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
  const { query, offset = 0 } = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing search query" });
  }
  const normalizedQuery = query.trim().replace(/\s+/g, " ").slice(0, 160);
  const normalizedOffset = Math.min(5_000, Math.max(0, Number(offset) || 0));
  if (!normalizedQuery) {
    return res.status(400).json({ error: "Missing search query" });
  }

  const apiKey = process.env.GIPHY_API_KEY;

  if (!apiKey) {
    console.error("GIPHY_API_KEY is not set");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const searchParams = new URLSearchParams({
      api_key: apiKey,
      q: normalizedQuery,
      limit: "24",
      offset: String(normalizedOffset),
      rating: "g",
    });

    const response = await fetchWithTimeout(
      `https://api.giphy.com/v1/gifs/search?${searchParams.toString()}`,
      {},
      6_000,
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to fetch from GIPHY",
      });
    }

    const data = await response.json();

    const gifs: string[] = data?.data
      ?.map((gif: any) => gif?.images?.original?.url)
      ?.filter(Boolean) || [];

    const totalCount = data?.pagination?.total_count ?? 0;
    const count = data?.pagination?.count ?? 0;
    const nextOffset = normalizedOffset + count;

    return res.status(200).json({
      gifs,
      pagination: {
        totalCount,
        count,
        nextOffset,
      },
    });
  } catch (err) {
    console.error("GIPHY search error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["POST"],
      limit: 25,
      maxBodyBytes: 16 * 1024,
      keyPrefix: "search-giphy",
    },
  },
  handler,
);
