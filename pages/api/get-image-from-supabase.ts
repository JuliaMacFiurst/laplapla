import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type, target_id } = req.query;

    if (!type || !target_id) {
      return res.status(400).json({ error: "Missing type or target_id parameter" });
    }

    console.log("🧩 Получаем изображения из Supabase:", { type, target_id });

    const { data, error } = await supabase
      .from("map_stories")
      .select("images")
      .eq("type", type)
      .eq("target_id", target_id)
      .single();

    if (error) {
      console.error("⚠️ Ошибка при запросе к Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    const images = data?.images || [];
    console.log(`📦 Найдено ${images.length} изображений в Supabase`);
    return res.status(200).json({ images });
  } catch (err) {
    console.error("❌ Ошибка сервера при получении изображений:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}