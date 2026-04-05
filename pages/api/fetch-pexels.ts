// pages/api/fetch-pexels.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from "@/utils/apiHandler";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "24kb",
    },
  },
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ message: "✅ Pexels API endpoint is live. Use POST to search for images." });
  }

  const { keywords, type, orientation, size } = req.body;
  if (!keywords || !Array.isArray(keywords)) {
    return res.status(400).json({ error: "Missing keywords" });
  }

  try {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw new Error("Missing Pexels API key");

    const results: string[] = [];

    for (const word of keywords) {
      const query = buildQuery(word, type);
      const params = new URLSearchParams({
        query,
        per_page: "10",
      });
      if (typeof orientation === "string" && orientation) {
        params.set("orientation", orientation);
      }
      if (typeof size === "string" && size) {
        params.set("size", size);
      }

      const resp = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
        headers: { Authorization: apiKey },
      });
      const data = await resp.json();

      const blacklist = [
        "birthday", "love", "woman", "alcohol", "couple", "cake", "wedding", "party", "candles",
        "celebration", "anniversary", "christmas", "balloon",
        "blood", "war", "gun", "weapon", "dead", "horror", "scary",
        "dark", "violence", "corpse", "zombie", "skull", "fear", "monster",
        "death", "sad", "attack", "kill", "fight", "storm"
      ];

      const filtered = data.photos
        ?.filter((p: any) =>
          keywords.some(k => p.alt?.toLowerCase().includes(k.toLowerCase())) &&
          !blacklist.some(bad => p.alt?.toLowerCase().includes(bad))
        )
        ?.slice(0, 5)
        ?.map((p: any) => p.src.medium) || [];

      // 🔁 Если слишком мало картинок после фильтрации — добавляем fallback
      if (filtered.length < 3 && data.photos?.length > 3) {
        filtered.push(...data.photos.slice(0, 3).map((p: any) => p.src.medium));
      }

      results.push(...filtered);
    }

    res.status(200).json({ images: results });
  } catch (err: any) {
    console.error("❌ Ошибка при запросе к Pexels:", err);
    res.status(500).json({ error: err.message });
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET", "POST"],
      limit: 25,
      maxBodyBytes: 24 * 1024,
      keyPrefix: "fetch-pexels",
    },
    cacheControl: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  },
  handler,
);

// вспомогательная функция — корректирует запрос в зависимости от типа карты
function buildQuery(keyword: string, type: string) {
  switch (type) {
    case "country":
      return `${keyword} landscape OR people`;
    case "animal":
      return `${keyword} animal OR wildlife`;
    case "physic":
    case "river":
      return `${keyword} nature OR mountains OR river`;
    case "food":
      return `${keyword} food OR dish OR cuisine`;
    case "culture":
      return `${keyword} traditional OR people OR art`;
    default:
      return keyword;
  }
}
