import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type, target_id, language } = req.query;

  if (!type || !target_id || !language) {
    return res.status(400).json({ error: "Missing required query params" });
  }

  const { data, error } = await supabase
    .from("map_stories")
    .select("*")
    .eq("type", type)
    .eq("target_id", target_id)
    .eq("language", language)
    .maybeSingle();

  console.log("🧠 Ответ из Supabase:", data);

  if (error || !data) {
    return res.status(200).json({ content: null });
  }

  return res.status(200).json({ content: data.content });
}