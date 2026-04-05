import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { withApiHandler } from "@/utils/apiHandler";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const path = typeof req.query.path === "string" ? req.query.path.trim() : "";
  if (!path) {
    return res.status(400).json({ error: "Path is required" });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.storage
      .from("map-data")
      .download(path);

    if (error || !data) {
      return res.status(404).json({ error: "Map not found" });
    }

    const svg = await data.text();
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    return res.status(200).send(svg);
  } catch (error) {
    console.error("Failed to load map svg:", error);
    return res.status(500).json({ error: "Failed to load map svg" });
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET"],
      limit: 30,
      keyPrefix: "map-svg",
    },
    cacheControl: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  },
  handler,
);
