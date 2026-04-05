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

    const selectedArtwork = data[Math.floor(Math.random() * data.length)];
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
      limit: 30,
      keyPrefix: "art-gallery",
    },
    cacheControl: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  },
  handler,
);
