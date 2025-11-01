// pages/api/save-images.ts
import type { NextApiRequest, NextApiResponse } from "next";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ message: "✅ Save-images endpoint is live. Use POST to save." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, type, images } = req.body;
    if (!id || !images || !Array.isArray(images)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // Сохраняем ссылки на картинки в таблице map_stories
    const { data: existingData } = await supabase
  .from("map_stories")
  .select("images")
  .eq("target_id", id)
  .eq("type", type)
  .maybeSingle();

const normalizeUrl = (url: string) => url.split("?")[0];

let finalImages = images;
if (existingData?.images?.length) {
  const all = [...existingData.images, ...images];
  const normalized = all.map(normalizeUrl);
  finalImages = Array.from(new Set(normalized)); // убираем дубликаты даже при разных query-параметрах
}

const { error } = await supabase
  .from("map_stories")
  .update({ images: finalImages })
  .eq("target_id", id)
  .eq("type", type);

if (error) throw error;

return res.status(200).json({
  message: "✅ Images saved to Supabase",
  images: finalImages,
});
  } catch (err: any) {
    console.error("❌ Ошибка при сохранении изображений:", err);
    return res.status(500).json({ error: err.message });
  }
}