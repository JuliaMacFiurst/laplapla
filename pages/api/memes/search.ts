import type { NextApiRequest, NextApiResponse } from "next";
import { dictionaries } from "@/i18n";
import { getRequestLang, isLang } from "@/lib/i18n/routing";
import { searchUnifiedMemes } from "@/lib/server/memes/search";
import type { UnifiedMemeMediaType, UnifiedMemeProvider, UnifiedMemeSearchResponse } from "@/lib/server/memes/types";
import { withApiHandler } from "@/utils/apiHandler";
import { applyApiGuard } from "@/utils/rateLimit";

const PROVIDERS = new Set<UnifiedMemeProvider>(["giphy", "reddit", "imgflip", "pixabay", "pexels"]);
const TYPES = new Set<UnifiedMemeMediaType>(["image", "gif", "mp4", "webm", "sticker"]);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "16kb",
    },
  },
};

function readPayload(req: NextApiRequest) {
  return req.method === "POST" && req.body && typeof req.body === "object" ? req.body : req.query;
}

function parseCsv<T extends string>(value: unknown, allowed: Set<T>) {
  const raw = Array.isArray(value) ? value.join(",") : String(value || "");
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is T => allowed.has(item as T));
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UnifiedMemeSearchResponse | { error: string }>,
) {
  const lang = getRequestLang(req);
  const t = dictionaries[lang].cats.studio.mediaPicker;

  if (
    !applyApiGuard(req, res, {
      methods: ["GET", "POST"],
      limit: 120,
      windowMs: 60_000,
      maxBodyBytes: 16 * 1024,
      keyPrefix: "memes-search",
    })
  ) {
    return;
  }

  const payload = readPayload(req);
  const rawQuery = (payload as Record<string, unknown>).q ?? (payload as Record<string, unknown>).query ?? "";
  const rawLimit = (payload as Record<string, unknown>).limit;
  const rawOffset = (payload as Record<string, unknown>).offset;
  const rawLang = (payload as Record<string, unknown>).lang;
  const query = String(Array.isArray(rawQuery) ? rawQuery[0] : rawQuery).trim().replace(/\s+/g, " ").slice(0, 160);
  const category = String((payload as Record<string, unknown>).category || "").trim().slice(0, 64) || undefined;
  const limit = Math.min(60, Math.max(1, Number(Array.isArray(rawLimit) ? rawLimit[0] : rawLimit) || 24));
  const offset = Math.max(0, Number(Array.isArray(rawOffset) ? rawOffset[0] : rawOffset) || 0);
  const requestLang = isLang(rawLang) ? rawLang : lang;
  const providers = parseCsv((payload as Record<string, unknown>).providers, PROVIDERS);
  const types = parseCsv((payload as Record<string, unknown>).types, TYPES);

  if (!query && !category) {
    return res.status(400).json({ error: t.errorMissingQuery });
  }

  try {
    const response = await searchUnifiedMemes({
      query: query || category || "",
      category,
      limit,
      offset,
      lang: requestLang,
      providers: providers.length ? providers : undefined,
      types: types.length ? types : undefined,
    });
    return res.status(200).json(response);
  } catch (error) {
    console.error("[/api/memes/search] request failed", error);
    return res.status(500).json({ error: t.errorSearchFailed });
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET", "POST"],
      maxBodyBytes: 16 * 1024,
      keyPrefix: "memes-search",
    },
    cacheControl: "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
  },
  handler,
);
