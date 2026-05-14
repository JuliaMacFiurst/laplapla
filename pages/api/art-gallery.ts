import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestLang } from "@/lib/i18n/routing";
import { getTranslatedContent } from "@/lib/contentTranslations";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { withApiHandler } from "@/utils/apiHandler";

type Artwork = {
  id: string;
  title: string;
  description: string;
  image_url: string[] | string;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const categorySlug = typeof req.query.categorySlug === "string" ? req.query.categorySlug.trim() : "";
  const excludeIds = typeof req.query.excludeIds === "string"
    ? req.query.excludeIds.split(",").map((id) => id.trim()).filter(Boolean)
    : [];
  if (!categorySlug) {
    return res.status(400).json({ error: "categorySlug is required" });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("artworks")
      .select("id")
      .eq("category_slug", categorySlug);

    if (error) {
      throw error;
    }

    if (!data?.length) {
      return res.status(200).json({ artwork: null, translated: true });
    }

    const availableIds = data.map((item) => item.id);
    const filteredIds = availableIds.filter((id) => !excludeIds.includes(id));
    const lastViewedId = excludeIds[excludeIds.length - 1];
    const fallbackPool =
      filteredIds.length > 0
        ? filteredIds
        : availableIds.length > 1 && lastViewedId
          ? availableIds.filter((id) => id !== lastViewedId)
          : availableIds;
    const selectedArtworkId =
      fallbackPool[Math.floor(Math.random() * fallbackPool.length)];

    const selectedArtwork = { id: selectedArtworkId };
    const { content, translated } = await getTranslatedContent("artwork", selectedArtwork.id, getRequestLang(req));
    const artwork = content as Artwork;

    return res.status(200).json({
      translated,
      artwork: {
        ...artwork,
        image_url: Array.isArray(artwork.image_url)
          ? artwork.image_url
          : typeof artwork.image_url === "string"
            ? JSON.parse(artwork.image_url)
            : [],
      },
    });
  } catch (error) {
    console.error("Failed to load art gallery:", error);
    return res.status(500).json({ error: "Failed to load art gallery" });
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET"],
      limit: 180,
      windowMs: 60_000,
      keyPrefix: "art-gallery",
    },
    cacheControl: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  },
  handler,
);
