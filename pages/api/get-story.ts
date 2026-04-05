import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { devLog } from "@/utils/devLog";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type, target_id, language } = req.query;

  if (!type || !target_id || !language) {
    return res.status(400).json({ error: "Missing required query params" });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("map_stories")
    .select("*")
    .eq("type", type)
    .eq("target_id", target_id)
    .eq("language", language)
    .maybeSingle();

  devLog("🧠 Ответ из Supabase:", data);

  if (error || !data) {
    return res.status(200).json({ content: null });
  }

  return res.status(200).json({ content: data.content });
}
