

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query } = req.body;

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
      limit: "24",
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

    return res.status(200).json({ gifs });
  } catch (err) {
    console.error("GIPHY search error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}