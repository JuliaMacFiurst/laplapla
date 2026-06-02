import type { NextApiRequest, NextApiResponse } from "next";
import { dictionaries } from "@/i18n";
import { getRequestLang } from "@/lib/i18n/routing";
import { getTrendingMemes, isMemeTrendingCategory } from "@/lib/server/memes/trending";
import type { UnifiedMemeMedia } from "@/lib/server/memes/types";
import { withApiHandler } from "@/utils/apiHandler";
import { applyApiGuard } from "@/utils/rateLimit";

type TrendingResponse = {
  items: UnifiedMemeMedia[];
  category: string;
  cached: boolean;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrendingResponse | { error: string }>,
) {
  const lang = getRequestLang(req);
  const t = dictionaries[lang].cats.studio.mediaPicker;

  if (
    !applyApiGuard(req, res, {
      methods: ["GET"],
      limit: 120,
      windowMs: 60_000,
      maxBodyBytes: 4 * 1024,
      keyPrefix: "memes-trending",
    })
  ) {
    return;
  }

  const rawCategory = Array.isArray(req.query.category) ? req.query.category[0] : req.query.category;
  const category = isMemeTrendingCategory(rawCategory) ? rawCategory : "funny";
  const limit = Math.min(60, Math.max(1, Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit) || 30));

  try {
    const { items, cached } = await getTrendingMemes(category, lang, limit);
    return res.status(200).json({ items, category, cached });
  } catch (error) {
    console.error("[/api/memes/trending] request failed", error);
    return res.status(500).json({ error: t.errorTrendingFailed });
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET"],
      maxBodyBytes: 4 * 1024,
      keyPrefix: "memes-trending",
    },
    cacheControl: "public, max-age=120, s-maxage=300, stale-while-revalidate=600",
  },
  handler,
);
