

import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Инициализация Supabase (серверные переменные окружения)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type, target_id, language, content, images, audio_url} = req.body;

  if (!type || !target_id || !language || !content) {
    console.error("❌ Ошибка: отсутствуют обязательные поля при сохранении истории:", {
      type,
      target_id,
      language,
      contentLength: content ? content.length : 0,
    });
    return res.status(400).json({
      error: "Missing required fields",
      missing: {
        type: !type,
        target_id: !target_id,
        language: !language,
        content: !content,
      },
    });
  }

  // Проверяем, существует ли уже рассказ
  const { data: existing, error: fetchError } = await supabase
    .from("map_stories")
    .select("id")
    .eq("type", type)
    .eq("target_id", target_id)
    .eq("language", language)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Ошибка при проверке существования записи:", fetchError);
    return res.status(500).json({ error: "Database check failed" });
  }

  let dbResponse;

  if (existing) {
    // Обновляем существующую запись
    dbResponse = await supabase
      .from("map_stories")
      .update({
        content,
        images: images || null,
        audio_url: audio_url || null,
        is_approved: true,
      })
      .eq("id", existing.id);
  } else {
    // Вставляем новую запись
    dbResponse = await supabase.from("map_stories").insert({
      type,
      target_id,
      language,
      content,
      images: images || null,
      audio_url: audio_url || null,
      is_approved: true,
    });
  }

  if (dbResponse.error) {
    console.error("Ошибка при сохранении в Supabase:", dbResponse.error);
    return res.status(500).json({ error: "Failed to save story" });
  }

  return res.status(200).json({ message: existing ? "Story updated" : "Story saved" });
}