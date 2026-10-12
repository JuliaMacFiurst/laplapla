import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { withApiHandler } from "@/utils/apiHandler";
import { sanitizeSvg } from "@/lib/security/sanitize";

const SAFE_STORAGE_PATH_PATTERN = /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.svg$/;
const ENGLISH_STAR_MAP_KEY = "quests/quest-1/maps/north-stars-en.svg";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const path = typeof req.query.path === "string" ? req.query.path.trim() : "";
  const source = req.query.source === "r2" ? "r2" : "supabase";
  if (!path || path.length > 240 || !SAFE_STORAGE_PATH_PATTERN.test(path) || path.includes("..")) {
    return res.status(400).json({ error: "Invalid map path" });
  }
  if (source === "r2" && path !== ENGLISH_STAR_MAP_KEY) {
    return res.status(400).json({ error: "Invalid R2 map path" });
  }

  try {
    let original: string;
    if (source === "r2") {
      const origin = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
      if (!origin || new URL(origin).protocol !== "https:") {
        return res.status(503).json({ error: "R2 map origin is not configured" });
      }
      const response = await fetch(`${origin}/${ENGLISH_STAR_MAP_KEY}`);
      if (!response.ok) return res.status(404).json({ error: "Map not found" });
      original = await response.text();
    } else {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.storage.from("map-data").download(path);
      if (error || !data) return res.status(404).json({ error: "Map not found" });
      original = await data.text();
    }
    const svg = sanitizeSvg(original);
    if (!svg) {
      return res.status(422).json({ error: "Invalid map asset" });
    }
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
