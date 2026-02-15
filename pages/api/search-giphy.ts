

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, offset = 0 } = req.body;

  if (!query || typeof query !== "string") {
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
      q: query,
      limit: "50",
      offset: String(offset),
      rating: "g",
    });

    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?${searchParams.toString()}`
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
    const nextOffset = offset + count;

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