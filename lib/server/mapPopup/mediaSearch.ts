import type { MapPopupType } from "@/types/mapPopup";
import { getMemoryCache, setMemoryCache } from "@/lib/server/memoryCache";

type PexelsCandidate = {
  url: string;
  mediaType: "image" | "video";
  photographer?: string;
  alt?: string;
  sourceUrl?: string;
};

type GiphyCandidate = {
  url: string;
  mediaType: "gif";
  title?: string;
  sourceUrl?: string;
  username?: string;
};

export type MapPopupMediaCandidate = {
  url: string;
  mediaType: "image" | "video" | "gif";
  source: "pexels" | "giphy";
  creditLine: string;
  searchQuery: string;
  relevanceScore: number;
};

type SearchMediaParams = {
  type: MapPopupType;
  targetId: string;
  slideText: string;
  lang?: string;
  excludeUrls?: string[];
};

const PEXELS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const GIPHY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FINAL_RESULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GIPHY_COOLDOWN_TTL_MS = 15 * 60 * 1000;
const GIPHY_MIN_REQUEST_INTERVAL_MS = 1200;
const inflightGiphyRequests = new Map<string, Promise<GiphyCandidate[]>>();
let lastGiphyRequestAt = 0;

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into", "is", "it", "of", "on",
  "or", "that", "the", "their", "this", "to", "with",
  "и", "в", "во", "на", "с", "со", "к", "ко", "у", "о", "об", "от", "до", "по", "за", "из", "под", "над",
  "для", "что", "как", "а", "но", "или", "же", "ли", "не", "ни", "это", "тот", "та", "те", "они", "она",
  "он", "мы", "вы", "ты", "я", "его", "ее", "их", "свой", "свои", "свою", "своим",
  "של", "על", "עם", "גם", "זה", "זו", "את", "או", "כי", "לא", "כן", "הוא", "היא", "הם", "הן", "אנחנו",
]);

const GENERIC_TARGET_WORDS = new Set([
  "north", "south", "east", "west", "new", "old", "upper", "lower", "great",
  "republic", "kingdom", "state", "province", "region", "territory", "district", "federal",
  "mount", "mountain", "mountains", "sea", "ocean", "river", "lake", "desert", "forest", "island",
  "республика", "область", "край", "государство", "остров", "река", "море", "океан", "гора", "горы",
]);

const BLOCKED_TERMS = [
  "blood", "bloody", "corpse", "death", "dead", "gun", "weapon", "war", "violence", "violent",
  "horror", "monster", "zombie", "killer", "kill", "fight", "attack", "scary", "terror",
  "nude", "naked", "sexy", "sex", "lingerie", "bikini", "underwear", "romance", "kiss", "kissing",
  "alcohol", "beer", "wine", "vodka", "drug", "smoke", "smoking", "cigarette",
  "кров", "труп", "смерт", "убий", "оруж", "войн", "насили", "страш", "ужас", "монстр",
  "гол", "обнаж", "сексу", "эрот", "поцел", "алког", "сигар",
];

const ACTION_HINTS = [
  "dance", "dancing", "jump", "jumping", "run", "running", "fly", "flying", "swim", "swimming",
  "storm", "wind", "rain", "snow", "wave", "flow", "moving", "motion",
  "танц", "беж", "лет", "прыг", "плав", "ветер", "дожд", "снег", "бур", "волна", "теч",
];

const PEXELS_QUERY_SUFFIX: Record<MapPopupType, string> = {
  country: "landmark travel nature",
  river: "river landscape nature",
  sea: "sea coast nature",
  physic: "landscape geography nature",
  flag: "flag national symbol",
  animal: "wildlife nature animal",
  culture: "tradition architecture art",
  weather: "sky clouds atmosphere nature",
  food: "dish cuisine food",
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function pickStrongSlideKeywords(slideText: string) {
  const tokens = tokenize(slideText)
    .filter((token) => token.length >= 4)
    .filter((token) => !STOP_WORDS.has(token))
    .filter((token) => !GENERIC_TARGET_WORDS.has(token));

  const weighted = tokens
    .map((token, index) => ({
      token,
      score: token.length + Math.max(0, 8 - index),
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.token);

  return unique(weighted).slice(0, 4);
}

function shortenTargetId(targetId: string) {
  const tokens = tokenize(targetId).filter((token) => !STOP_WORDS.has(token));
  if (tokens.length <= 3) {
    return unique(tokens);
  }

  const nonGeneric = tokens.filter((token) => !GENERIC_TARGET_WORDS.has(token));
  const source = nonGeneric.length >= 2 ? nonGeneric : tokens;
  const first = source[0];
  const last = source[source.length - 1];
  const middle = source
    .slice(1, -1)
    .sort((a, b) => b.length - a.length)[0];

  return unique([first, middle, last].filter(Boolean)).slice(0, 3);
}

function containsBlockedTerm(value: string) {
  const normalized = normalizeText(value);
  return BLOCKED_TERMS.some((term) => normalized.includes(term));
}

function buildSearchQuery(type: MapPopupType, targetId: string, slideText: string) {
  const targetTerms = shortenTargetId(targetId);
  const slideTerms = pickStrongSlideKeywords(slideText);
  const baseTerms = unique([...targetTerms, ...slideTerms]).slice(0, 5);
  const typeHint = PEXELS_QUERY_SUFFIX[type];

  return {
    targetTerms,
    slideTerms,
    pexelsQuery: unique([...targetTerms, ...slideTerms, ...typeHint.split(" ")]).join(" ").trim(),
    giphyQuery: baseTerms.join(" ").trim(),
    relevanceTerms: unique([...targetTerms, ...slideTerms, ...typeHint.split(" ")]),
  };
}

function buildFallbackQueries(type: MapPopupType, targetId: string, slideText: string) {
  const { targetTerms, pexelsQuery, giphyQuery, relevanceTerms } = buildSearchQuery(type, targetId, slideText);
  const typeHintTerms = PEXELS_QUERY_SUFFIX[type].split(" ");
  const firstTargetTerm = targetTerms[0] ?? "";

  const pexelsQueries = unique([
    pexelsQuery,
    unique([...targetTerms, ...typeHintTerms]).join(" ").trim(),
    targetTerms.join(" ").trim(),
    unique([firstTargetTerm, ...typeHintTerms]).join(" ").trim(),
    firstTargetTerm,
  ]).filter(Boolean);

  const giphyQueries = unique([
    giphyQuery,
    targetTerms.join(" ").trim(),
    firstTargetTerm,
  ]).filter(Boolean);

  return {
    pexelsQueries,
    giphyQueries,
    relevanceTerms,
  };
}

function scoreCandidateText(candidateText: string, relevanceTerms: string[]) {
  const normalized = normalizeText(candidateText);
  if (normalized && containsBlockedTerm(normalized)) {
    return -100;
  }

  if (!normalized) {
    return 0;
  }

  let score = 0;

  for (const term of relevanceTerms) {
    if (!term) {
      continue;
    }

    if (normalized.includes(term)) {
      score += term.length >= 6 ? 6 : 4;
    }
  }

  return score;
}

function prefersMotion(slideText: string, type: MapPopupType) {
  const normalized = normalizeText(slideText);
  return type === "weather" || ACTION_HINTS.some((term) => normalized.includes(term));
}

async function searchPexelsCandidates(query: string): Promise<PexelsCandidate[]> {
  const cacheKey = `map-popup:pexels:${query}`;
  const cached = getMemoryCache<PexelsCandidate[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return [];
  }

  const photoSearchParams = new URLSearchParams({
    query,
    per_page: "12",
    orientation: "landscape",
  });

  const videoSearchParams = new URLSearchParams({
    query,
    per_page: "8",
  });

  const [photoResponse, videoResponse] = await Promise.all([
    fetch(`https://api.pexels.com/v1/search?${photoSearchParams.toString()}`, {
      headers: { Authorization: apiKey },
    }),
    fetch(`https://api.pexels.com/videos/search?${videoSearchParams.toString()}`, {
      headers: { Authorization: apiKey },
    }),
  ]);

  const photoJson = photoResponse.ok ? await photoResponse.json() : null;
  const videoJson = videoResponse.ok ? await videoResponse.json() : null;

  const photos: PexelsCandidate[] =
    photoJson?.photos?.map((photo: any) => ({
      url: photo?.src?.large || photo?.src?.medium || photo?.src?.original,
      mediaType: "image" as const,
      photographer: typeof photo?.photographer === "string" ? photo.photographer : undefined,
      alt: typeof photo?.alt === "string" ? photo.alt : undefined,
      sourceUrl: typeof photo?.url === "string" ? photo.url : undefined,
    }))?.filter((item: PexelsCandidate) => Boolean(item.url)) ?? [];

  const videos: PexelsCandidate[] =
    videoJson?.videos?.map((video: any) => ({
      url:
        video?.video_files?.find((file: any) => file?.file_type === "video/mp4" && file?.width >= 720)?.link ||
        video?.video_files?.find((file: any) => file?.file_type === "video/mp4")?.link,
      mediaType: "video" as const,
      photographer: typeof video?.user?.name === "string" ? video.user.name : undefined,
      alt: typeof video?.url === "string" ? video.url : undefined,
      sourceUrl: typeof video?.url === "string" ? video.url : undefined,
    }))?.filter((item: PexelsCandidate) => Boolean(item.url)) ?? [];

  return setMemoryCache(cacheKey, [...photos, ...videos], PEXELS_CACHE_TTL_MS);
}

async function searchGiphyCandidates(query: string): Promise<GiphyCandidate[]> {
  const cacheKey = `map-popup:giphy:${query}`;
  const cached = getMemoryCache<GiphyCandidate[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const cooldownKey = "map-popup:giphy:cooldown";
  const isCoolingDown = getMemoryCache<boolean>(cooldownKey);
  if (isCoolingDown) {
    return [];
  }

  const existingInflight = inflightGiphyRequests.get(cacheKey);
  if (existingInflight) {
    return existingInflight;
  }

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return [];
  }

  const requestPromise = (async () => {
    const timeSinceLastRequest = Date.now() - lastGiphyRequestAt;
    if (timeSinceLastRequest < GIPHY_MIN_REQUEST_INTERVAL_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, GIPHY_MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest),
      );
    }

    lastGiphyRequestAt = Date.now();

    const searchParams = new URLSearchParams({
      api_key: apiKey,
      q: query,
      limit: "20",
      rating: "g",
      bundle: "messaging_non_clips",
    });

    const response = await fetch(`https://api.giphy.com/v1/gifs/search?${searchParams.toString()}`);
    if (!response.ok) {
      if (response.status === 429) {
        setMemoryCache(cooldownKey, true, GIPHY_COOLDOWN_TTL_MS);
      }
      return [];
    }

    const json = await response.json();
    const items =
      json?.data?.map((item: any) => ({
        url: item?.images?.original?.url || item?.images?.downsized_large?.url,
        mediaType: "gif" as const,
        title: typeof item?.title === "string" ? item.title : undefined,
        sourceUrl: typeof item?.url === "string" ? item.url : undefined,
        username: typeof item?.username === "string" ? item.username : undefined,
      }))?.filter((item: GiphyCandidate) => Boolean(item.url)) ?? [];

    return setMemoryCache(cacheKey, items, GIPHY_CACHE_TTL_MS);
  })()
    .catch((error) => {
      console.error("[map-popup-media] GIPHY request failed", error);
      setMemoryCache(cooldownKey, true, GIPHY_COOLDOWN_TTL_MS);
      return [];
    })
    .finally(() => {
      inflightGiphyRequests.delete(cacheKey);
    });

  inflightGiphyRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

function buildPexelsCredit(candidate: PexelsCandidate) {
  const label = candidate.mediaType === "video" ? "Video" : "Photo";
  const author = candidate.photographer?.trim();
  return author ? `${label} by ${author} on Pexels` : `${label} from Pexels`;
}

function buildGiphyCredit(candidate: GiphyCandidate) {
  const author = candidate.username?.trim();
  return author ? `GIF by ${author} on GIPHY` : "GIF from GIPHY";
}

function rankCandidates(
  pexelsCandidates: PexelsCandidate[],
  giphyCandidates: GiphyCandidate[],
  relevanceTerms: string[],
  normalizedExcludedUrls: Set<string>,
  motionPreferred: boolean,
  pexelsQuery: string,
  giphyQuery: string,
) {
  return [
    ...pexelsCandidates.map((candidate) => {
      const description = [candidate.alt, candidate.photographer].filter(Boolean).join(" ");
      const score =
        scoreCandidateText(description, relevanceTerms) +
        (candidate.mediaType === "image" ? (motionPreferred ? 2 : 7) : (motionPreferred ? 6 : 3));

      return {
        url: candidate.url,
        mediaType: candidate.mediaType,
        source: "pexels" as const,
        creditLine: buildPexelsCredit(candidate),
        searchQuery: pexelsQuery,
        relevanceScore: score,
      };
    }),
    ...giphyCandidates.map((candidate) => {
      const description = [candidate.title, candidate.username].filter(Boolean).join(" ");
      const score = scoreCandidateText(description, relevanceTerms) + (motionPreferred ? 6 : 1);

      return {
        url: candidate.url,
        mediaType: "gif" as const,
        source: "giphy" as const,
        creditLine: buildGiphyCredit(candidate),
        searchQuery: giphyQuery,
        relevanceScore: score,
      };
    }),
  ]
    .filter((candidate) => !normalizedExcludedUrls.has(candidate.url))
    .filter((candidate) => candidate.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export async function searchMapPopupMedia({
  type,
  targetId,
  slideText,
  excludeUrls = [],
}: SearchMediaParams): Promise<MapPopupMediaCandidate | null> {
  const finalCacheKey = `map-popup:resolved:${type}:${normalizeText(targetId)}:${normalizeText(slideText)}`;
  const cached = getMemoryCache<MapPopupMediaCandidate>(finalCacheKey);
  const normalizedExcludedUrls = new Set(
    excludeUrls
      .map((url) => (typeof url === "string" ? url.trim() : ""))
      .filter(Boolean),
  );

  if (cached && !normalizedExcludedUrls.has(cached.url)) {
    return cached;
  }

  const { pexelsQueries, giphyQueries, relevanceTerms } = buildFallbackQueries(type, targetId, slideText);
  if (pexelsQueries.length === 0 && giphyQueries.length === 0) {
    return null;
  }

  const motionPreferred = prefersMotion(slideText, type);
  let resolved: MapPopupMediaCandidate | null = null;

  for (const pexelsQuery of pexelsQueries) {
    const pexelsCandidates = await searchPexelsCandidates(pexelsQuery);
    const ranked = rankCandidates(
      pexelsCandidates,
      [],
      relevanceTerms,
      normalizedExcludedUrls,
      motionPreferred,
      pexelsQuery,
      "",
    );

    if (ranked[0]) {
      resolved = ranked[0];
      break;
    }
  }

  if (!resolved && motionPreferred) {
    for (const giphyQuery of giphyQueries) {
      const giphyCandidates = await searchGiphyCandidates(giphyQuery);
      const ranked = rankCandidates(
        [],
        giphyCandidates,
        relevanceTerms,
        normalizedExcludedUrls,
        motionPreferred,
        "",
        giphyQuery,
      );

      if (ranked[0]) {
        resolved = ranked[0];
        break;
      }
    }
  }

  if (resolved) {
    setMemoryCache(finalCacheKey, resolved, FINAL_RESULT_CACHE_TTL_MS);
  }

  return resolved;
}
