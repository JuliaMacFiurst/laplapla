import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// ⚠️ anon key, потому что у нас RLS и только SELECT
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Язык интерфейса сайта
    const lang = (req.query.lang as "en" | "ru" | "he") ?? "en";

    // Забираем ВСЕ одобренные видео
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("status", "approved");

    if (error) {
      console.error("[get-videos] Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(200).json([]);
    }

    // Фильтрация по языку + languageDependency
    const filtered = data.filter((video) => {
      if (video.language_dependency === "visual") {
        return true;
      }

      if (video.language_dependency === "spoken") {
        return Array.isArray(video.content_languages)
          ? video.content_languages.includes(lang)
          : false;
      }

      return false;
    });

    const normalized = filtered.map((video) => ({
      id: video.id,
      format: video.format,
      categoryKey: video.category_key,
      languageDependency: video.language_dependency,
      contentLanguages: video.content_languages,
      title: video.title,
      source: video.source,
      youtubeId: video.youtube_id,
      durationLabel: video.duration_label,
      status: video.status,
    }));

    return res.status(200).json(normalized);
  } catch (e) {
    console.error("[get-videos] Unexpected error:", e);
    return res.status(500).json({ error: "Unexpected error" });
  }
}