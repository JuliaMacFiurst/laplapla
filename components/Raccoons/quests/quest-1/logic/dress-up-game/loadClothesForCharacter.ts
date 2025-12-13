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
  season: string;
}

export async function loadClothesForCharacter(
  characterName: string
): Promise<ClothesItem[]> {
    console.log(
    "[loadClothesForCharacter] characterName =",
    characterName
  );
  const folders = ["winter-clothes", "summer-clothes", "mid-season"];
  let allItems: ClothesItem[] = [];

  for (const folder of folders) {
    const { data, error } = await supabase.storage
      .from("quests") // bucket
      .list(`1_quest/games/dress-up/${characterName}/${folder}`);

    if (error) {
      console.error("[loadClothesForCharacter] ERROR", error);
      continue;
    }

    if (!data || data.length === 0) {
      console.warn("[loadClothesForCharacter] EMPTY", characterName, folder);
      continue;
    }

    for (const file of data) {
      if (!file.name.endsWith(".webp")) continue;
      if (file.name.includes("-dressed")) continue;

      const id = file.name.replace(".webp", "");
      const img =
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}` +
        `/storage/v1/object/public/quests/1_quest/games/dress-up/` +
        `${characterName}/${folder}/${file.name}`;

      allItems.push({
        id,
        img,
        score: clothesScoreMap[id] ?? 0,
        season: folder
      });
    }
  }

  console.log("[loadClothesForCharacter] RESULT", allItems);
  return allItems;
}