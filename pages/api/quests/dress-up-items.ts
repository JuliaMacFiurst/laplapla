import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { clothesScoreMap } from "@/components/Raccoons/quests/quest-1/logic/dress-up-game/clothesScores";
import { withApiHandler } from "@/utils/apiHandler";

type ClothesItem = {
  id: string;
  img: string;
  score: number;
  season: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const characterName = typeof req.query.characterName === "string" ? req.query.characterName.trim() : "";
  if (!characterName) {
    return res.status(400).json({ error: "characterName is required" });
  }

  try {
    const supabase = createServerSupabaseClient();
    const folders = ["winter-clothes", "summer-clothes", "mid-season"];
    const allItems: ClothesItem[] = [];

    for (const folder of folders) {
      const { data, error } = await supabase.storage
        .from("quests")
        .list(`1_quest/games/dress-up/${characterName}/${folder}`);

      if (error || !data?.length) {
        continue;
      }

      for (const file of data) {
        if (!file.name.endsWith(".webp") || file.name.includes("-dressed")) {
          continue;
        }

        const id = file.name.replace(".webp", "");
        const { data: publicUrlData } = supabase.storage
          .from("quests")
          .getPublicUrl(`1_quest/games/dress-up/${characterName}/${folder}/${file.name}`);

        allItems.push({
          id,
          img: publicUrlData.publicUrl,
          score: clothesScoreMap[id] ?? 0,
          season: folder,
        });
      }
    }

    return res.status(200).json(allItems);
  } catch (error) {
    console.error("Failed to load dress-up items:", error);
    return res.status(500).json({ error: "Failed to load dress-up items" });
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET"],
      limit: 30,
      keyPrefix: "dress-up-items",
    },
    cacheControl: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  },
  handler,
);
