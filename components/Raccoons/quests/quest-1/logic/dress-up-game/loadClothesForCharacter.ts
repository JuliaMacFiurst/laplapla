import { createClient } from "@supabase/supabase-js";
import { clothesScoreMap } from "./clothesScores";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface ClothesItem {
  id: string;
  img: string;
  score: number;
}

export async function loadClothesForCharacter(
  characterName: string
): Promise<ClothesItem[]> {
  const folders = ["Winter-clothes", "Summer-clothes", "Mid-season"];

  let allItems: ClothesItem[] = [];

  for (const folder of folders) {
    const { data, error } = await supabase.storage
      .from("quests")
      .list(`1_quest/games/dress-up/${characterName}/${folder}`);

    if (error || !data) continue;

    for (const file of data) {
      if (!file.name.endsWith(".webp")) continue;

      const id = file.name.replace(".webp", ""); // winter-cap.webp → winter-cap
      const img = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/quests/1_quest/games/dress-up/${characterName}/${folder}/${file.name}`;
      const score = clothesScoreMap[id] ?? 0;

      allItems.push({ id, img, score });
    }
  }

  return allItems;
}