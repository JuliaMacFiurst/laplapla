import { clothesScoreMap } from "./clothesScores";

export interface ClothesItem {
  id: string;
  img: string;
  score: number;
  season: string;
}

export async function loadClothesForCharacter(
  characterName: string
): Promise<ClothesItem[]> {
  const response = await fetch(`/api/quests/dress-up-items?characterName=${encodeURIComponent(characterName)}`);
  const payload = await response.json().catch(() => null) as ClothesItem[] | { error?: string } | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload) && payload?.error
        ? payload.error
        : "Failed to load dress-up items",
    );
  }

  return payload.map((item) => ({
    ...item,
    score: clothesScoreMap[item.id] ?? item.score ?? 0,
  }));
}
