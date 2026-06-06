import type { NextApiRequest, NextApiResponse } from "next";
import { generateSitemapXml } from "@/lib/sitemapXml";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string | { error: string }>,
) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const xml = await generateSitemapXml();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).send(req.method === "HEAD" ? "" : xml);
  } catch (error) {
    console.error("[sitemap] failed to generate sitemap", error);
    res.status(500).json({ error: "Failed to generate sitemap" });
  }
}
