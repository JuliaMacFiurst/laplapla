import type { NextApiRequest, NextApiResponse } from "next";
import { loadCombinedCatPresets } from "@/lib/server/catPresets";
import { getRequestLang } from "@/lib/i18n/routing";
import { withApiHandler } from "@/utils/apiHandler";
import type { AnyCatPreset } from "@/content/cats";

type CatPresetsResponse = {
  presets: AnyCatPreset[];
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CatPresetsResponse>,
) {
  const lang = getRequestLang(req);
  const presets = await loadCombinedCatPresets(lang);
  return res.status(200).json({ presets });
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET"],
      limit: 30,
      keyPrefix: "cat-presets",
    },
    cacheControl: "public, max-age=120, s-maxage=300, stale-while-revalidate=600",
  },
  handler,
);
