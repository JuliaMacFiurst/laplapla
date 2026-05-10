import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from "@/utils/apiHandler";
import { loadCombinedParrotMusicStyles } from "@/lib/server/parrotMusicStyles";
import type { ParrotStyleRecord } from "@/lib/parrots/catalog";

type ParrotMusicStylesResponse =
  | {
      presets: ParrotStyleRecord[];
    }
  | { error: string };

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParrotMusicStylesResponse>,
) {
  const lang = typeof req.query.lang === "string" ? req.query.lang : undefined;
  const rawTitles = req.query.rawTitles === "1";
  const presets = await loadCombinedParrotMusicStyles(lang, { rawTitles });
  res.status(200).json({ presets });
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET"],
    },
    cacheControl: "public, max-age=60, stale-while-revalidate=300",
  },
  handler,
);
