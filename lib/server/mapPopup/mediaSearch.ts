import type { MapPopupType } from "@/types/mapPopup";
import { buildSupabasePublicUrl } from "@/lib/publicAssetUrls";
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
  source: "pexels" | "giphy" | "fallback";
  creditLine: string;
  searchQuery: string;
  relevanceScore: number;
};

export type MapPopupMediaDebug = {
  stage:
    | "cache"
    | "strict_pexels"
    | "strict_giphy"
    | "generic_provider"
    | "relaxed_provider"
    | "local_fallback"
    | "no_queries";
  cacheHit: boolean;
  type: MapPopupType;
  targetId: string;
  slideTextSample: string;
  pexelsQueries: string[];
  giphyQueries: string[];
  excludeCount: number;
  chosenSource: "pexels" | "giphy" | "fallback" | null;
  chosenQuery: string | null;
};

type SearchMediaParams = {
  type: MapPopupType;
  targetId: string;
  slideText: string;
  excludeUrls?: string[];
};

const PEXELS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const GIPHY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FINAL_RESULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FALLBACK_RESULT_CACHE_TTL_MS = 2 * 60 * 1000;
const GIPHY_COOLDOWN_TTL_MS = 15 * 60 * 1000;
const GIPHY_MIN_REQUEST_INTERVAL_MS = 1200;
const PROVIDER_REQUEST_TIMEOUT_MS = 6000;
const SEARCH_DEADLINE_MS = 12000;
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

const GENERIC_PROVIDER_QUERIES: Record<MapPopupType, { pexels: string[]; giphy: string[] }> = {
  country: {
    pexels: ["travel landscape", "city landmark", "nature landscape"],
    giphy: ["travel nature", "landscape"],
  },
  river: {
    pexels: ["river landscape", "water nature", "forest river"],
    giphy: ["river nature", "water flow"],
  },
  sea: {
    pexels: ["sea coast", "ocean waves", "beach nature"],
    giphy: ["ocean waves", "sea"],
  },
  physic: {
    pexels: ["mountains landscape", "nature panorama", "geography landscape"],
    giphy: ["nature landscape", "mountains"],
  },
  flag: {
    pexels: ["national flag", "flag waving", "country symbol"],
    giphy: ["flag waving", "flag"],
  },
  animal: {
    pexels: ["wildlife animal", "cute animal", "nature animal"],
    giphy: ["cute animal", "animal"],
  },
  culture: {
    pexels: ["traditional culture", "architecture travel", "folk art"],
    giphy: ["tradition festival", "culture"],
  },
  weather: {
    pexels: ["sky clouds", "rain storm", "snow weather"],
    giphy: ["weather sky", "rain clouds"],
  },
  food: {
    pexels: ["food dish", "cuisine plate", "delicious meal"],
    giphy: ["food", "cooking"],
  },
};

const RACCOON_WITH_MAP_FILES = {
  animated: [
    "raccoon-with-map.gif",
    "raccoon-shakes-map.gif",
    "raccoon-rollup-map.gif",
    "raccoon-puts-map-in-bottle.gif",
  ],
  static: [
    "raccoon-with-map.png",
    "raccoon-shakes-map.png",
    "raccoon-rollup-map.png",
    "raccoon-puts-map-in-bottle.png",
  ],
} as const;

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
  const { targetTerms, slideTerms, pexelsQuery, giphyQuery, relevanceTerms } = buildSearchQuery(type, targetId, slideText);
  const typeHintTerms = PEXELS_QUERY_SUFFIX[type].split(" ");
  const firstTargetTerm = targetTerms[0] ?? "";

  const pexelsQueries = unique([
    pexelsQuery,
    unique([...slideTerms, ...typeHintTerms]).join(" ").trim(),
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
    return 1;
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

async function fetchWithTimeout(input: string, init?: RequestInit, timeoutMs = PROVIDER_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
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
    per_page: "24",
    orientation: "landscape",
  });

  const videoSearchParams = new URLSearchParams({
    query,
    per_page: "12",
  });

  try {
    const [photoResponse, videoResponse] = await Promise.all([
      fetchWithTimeout(`https://api.pexels.com/v1/search?${photoSearchParams.toString()}`, {
        headers: { Authorization: apiKey },
      }),
      fetchWithTimeout(`https://api.pexels.com/videos/search?${videoSearchParams.toString()}`, {
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
  } catch (error) {
    if ((error as { name?: string } | null)?.name !== "AbortError") {
      console.error("[map-popup-media] Pexels request failed", error);
    }
    return [];
  }
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

    const response = await fetchWithTimeout(`https://api.giphy.com/v1/gifs/search?${searchParams.toString()}`);
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
      if ((error as { name?: string } | null)?.name !== "AbortError") {
        console.error("[map-popup-media] GIPHY request failed", error);
      }
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

function prefersVideoCandidate(type: MapPopupType, slideText: string, seedSource: string) {
  const normalized = normalizeText(slideText).toLowerCase();
  const motionHints = [
    "dance",
    "dancing",
    "jump",
    "jumping",
    "run",
    "running",
    "fly",
    "flying",
    "swim",
    "swimming",
    "storm",
    "wind",
    "rain",
    "snow",
    "wave",
    "flow",
    "moving",
    "motion",
    "танц",
    "беж",
    "лет",
    "прыг",
    "плав",
    "ветер",
    "дожд",
    "снег",
    "бур",
    "волна",
    "теч",
  ];

  if (type === "weather" || type === "sea" || type === "river") {
    return true;
  }

  if (motionHints.some((term) => normalized.includes(term))) {
    return true;
  }

  return getSeedValue(seedSource) % 4 === 0;
}

function rankCandidates(
  pexelsCandidates: PexelsCandidate[],
  giphyCandidates: GiphyCandidate[],
  relevanceTerms: string[],
  normalizedExcludedUrls: Set<string>,
  pexelsQuery: string,
  giphyQuery: string,
) {
  return [
    ...pexelsCandidates.map((candidate) => {
      const description = [candidate.alt, candidate.photographer].filter(Boolean).join(" ");
      const score =
        scoreCandidateText(description, relevanceTerms) +
        (candidate.mediaType === "video" ? 15 : 12);

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
      const score = scoreCandidateText(description, relevanceTerms) + 8;

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
    .filter((candidate) => candidate.relevanceScore > -50)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function chooseRankedCandidate(
  ranked: MapPopupMediaCandidate[],
  seedSource: string,
  preferVideo = false,
) {
  if (ranked.length === 0) {
    return null;
  }

  const shortlist = ranked.slice(0, Math.min(6, ranked.length));
  const seed = getSeedValue(seedSource);

  if (preferVideo) {
    const videoCandidates = shortlist.filter((candidate) => candidate.mediaType === "video");
    if (videoCandidates.length > 0) {
      return videoCandidates[seed % videoCandidates.length] ?? videoCandidates[0];
    }
  }

  return shortlist[seed % shortlist.length] ?? shortlist[0];
}

function pickFirstSafeCandidate(
  pexelsCandidates: PexelsCandidate[],
  giphyCandidates: GiphyCandidate[],
  normalizedExcludedUrls: Set<string>,
  pexelsQuery: string,
  giphyQuery: string,
) {
  for (const candidate of pexelsCandidates) {
    if (!candidate.url || normalizedExcludedUrls.has(candidate.url)) {
      continue;
    }

    const description = [candidate.alt, candidate.photographer].filter(Boolean).join(" ");
    if (containsBlockedTerm(description)) {
      continue;
    }

    return {
      url: candidate.url,
      mediaType: candidate.mediaType,
      source: "pexels" as const,
      creditLine: buildPexelsCredit(candidate),
      searchQuery: pexelsQuery,
      relevanceScore: 1,
    };
  }

  for (const candidate of giphyCandidates) {
    if (!candidate.url || normalizedExcludedUrls.has(candidate.url)) {
      continue;
    }

    const description = [candidate.title, candidate.username].filter(Boolean).join(" ");
    if (containsBlockedTerm(description)) {
      continue;
    }

    return {
      url: candidate.url,
      mediaType: "gif" as const,
      source: "giphy" as const,
      creditLine: buildGiphyCredit(candidate),
      searchQuery: giphyQuery,
      relevanceScore: 1,
    };
  }

  return null;
}

function getSeedValue(seedSource: string) {
  return seedSource
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
}

function buildRaccoonWithMapUrl(fileName: string) {
  return buildSupabasePublicUrl("characters", `raccoons/raccoon_with_map/${fileName}`);
}

function buildLocalFallbackCandidate(type: MapPopupType, targetId: string, slideText: string): MapPopupMediaCandidate {
  const seedSource = `${type}:${normalizeText(targetId)}:${normalizeText(slideText)}`;
  const seed = getSeedValue(seedSource);
  const allFiles = [...RACCOON_WITH_MAP_FILES.static, ...RACCOON_WITH_MAP_FILES.animated];
  const selectedFile = allFiles[seed % allFiles.length] ?? RACCOON_WITH_MAP_FILES.static[0];

  return {
    url: buildRaccoonWithMapUrl(selectedFile),
    mediaType: selectedFile.endsWith(".gif") ? "gif" : "image",
    source: "fallback",
    creditLine: "Raccoon with map from Capybara Tales",
    searchQuery: `local-fallback:${seedSource}`,
    relevanceScore: 1,
  };
}

function isSearchDeadlineReached(searchStartedAt: number) {
  return Date.now() - searchStartedAt >= SEARCH_DEADLINE_MS;
}

async function searchPexelsFirst(
  type: MapPopupType,
  pexelsQueries: string[],
  relevanceTerms: string[],
  normalizedExcludedUrls: Set<string>,
  targetId: string,
  slideText: string,
  searchStartedAt: number,
) {
  for (const pexelsQuery of pexelsQueries) {
    if (isSearchDeadlineReached(searchStartedAt)) {
      break;
    }

    const pexelsCandidates = await searchPexelsCandidates(pexelsQuery);
    const ranked = rankCandidates(
      pexelsCandidates,
      [],
      relevanceTerms,
      normalizedExcludedUrls,
      pexelsQuery,
      "",
    );

    const selected = chooseRankedCandidate(
      ranked,
      `${targetId}:${slideText}:${pexelsQuery}`,
      prefersVideoCandidate(type, slideText, `${targetId}:${slideText}:${pexelsQuery}`),
    );
    if (selected) {
      return selected;
    }
  }

  return null;
}

async function searchGenericProviderFallback(
  type: MapPopupType,
  normalizedExcludedUrls: Set<string>,
  searchStartedAt: number,
) {
  const fallback = GENERIC_PROVIDER_QUERIES[type];
  const relevanceTerms = PEXELS_QUERY_SUFFIX[type].split(" ");

  for (const pexelsQuery of fallback.pexels) {
    if (isSearchDeadlineReached(searchStartedAt)) {
      break;
    }

    const pexelsCandidates = await searchPexelsCandidates(pexelsQuery);
    const ranked = rankCandidates(
      pexelsCandidates,
      [],
      relevanceTerms,
      normalizedExcludedUrls,
      pexelsQuery,
      "",
    );

    const selected = chooseRankedCandidate(
      ranked,
      `${type}:generic:${pexelsQuery}`,
      prefersVideoCandidate(type, pexelsQuery, `${type}:generic:${pexelsQuery}`),
    );
    if (selected) {
      return selected;
    }
  }

  for (const giphyQuery of fallback.giphy) {
    if (isSearchDeadlineReached(searchStartedAt)) {
      break;
    }

    const giphyCandidates = await searchGiphyCandidates(giphyQuery);
    const ranked = rankCandidates(
      [],
      giphyCandidates,
      relevanceTerms,
      normalizedExcludedUrls,
      "",
      giphyQuery,
    );

    const selected = chooseRankedCandidate(
      ranked,
      `${type}:generic:${giphyQuery}`,
      prefersVideoCandidate(type, giphyQuery, `${type}:generic:${giphyQuery}`),
    );
    if (selected) {
      return selected;
    }
  }

  return null;
}

async function searchRelaxedProviderFallback(
  type: MapPopupType,
  pexelsQueries: string[],
  giphyQueries: string[],
  normalizedExcludedUrls: Set<string>,
  searchStartedAt: number,
) {
  const combinedPexelsQueries = unique([
    ...pexelsQueries,
    ...GENERIC_PROVIDER_QUERIES[type].pexels,
  ]);
  const combinedGiphyQueries = unique([
    ...giphyQueries,
    ...GENERIC_PROVIDER_QUERIES[type].giphy,
  ]);

  for (const pexelsQuery of combinedPexelsQueries) {
    if (isSearchDeadlineReached(searchStartedAt)) {
      break;
    }

    const pexelsCandidates = await searchPexelsCandidates(pexelsQuery);
    const directCandidate = pickFirstSafeCandidate(
      pexelsCandidates,
      [],
      normalizedExcludedUrls,
      pexelsQuery,
      "",
    );
    if (directCandidate) {
      return directCandidate;
    }
  }

  for (const giphyQuery of combinedGiphyQueries) {
    if (isSearchDeadlineReached(searchStartedAt)) {
      break;
    }

    const giphyCandidates = await searchGiphyCandidates(giphyQuery);
    const directCandidate = pickFirstSafeCandidate(
      [],
      giphyCandidates,
      normalizedExcludedUrls,
      "",
      giphyQuery,
    );
    if (directCandidate) {
      return directCandidate;
    }
  }

  return null;
}

async function searchGiphyFallback(
  type: MapPopupType,
  giphyQueries: string[],
  relevanceTerms: string[],
  normalizedExcludedUrls: Set<string>,
  targetId: string,
  slideText: string,
  searchStartedAt: number,
) {
  for (const giphyQuery of giphyQueries) {
    if (isSearchDeadlineReached(searchStartedAt)) {
      break;
    }

    const giphyCandidates = await searchGiphyCandidates(giphyQuery);
    const ranked = rankCandidates(
      [],
      giphyCandidates,
      relevanceTerms,
      normalizedExcludedUrls,
      "",
      giphyQuery,
    );

    const selected = chooseRankedCandidate(
      ranked,
      `${targetId}:${slideText}:${giphyQuery}`,
      prefersVideoCandidate(type, slideText, `${targetId}:${slideText}:${giphyQuery}`),
    );
    if (selected) {
      return selected;
    }
  }

  return null;
}

export async function searchMapPopupMedia({
  type,
  targetId,
  slideText,
  excludeUrls = [],
}: SearchMediaParams): Promise<{ item: MapPopupMediaCandidate | null; debug: MapPopupMediaDebug }> {
  const finalCacheKey = `map-popup:resolved:${type}:${normalizeText(targetId)}:${normalizeText(slideText)}`;
  const cached = getMemoryCache<MapPopupMediaCandidate>(finalCacheKey);
  const normalizedExcludedUrls = new Set(
    excludeUrls
      .map((url) => (typeof url === "string" ? url.trim() : ""))
      .filter(Boolean),
  );

  const { pexelsQueries, giphyQueries } = buildFallbackQueries(type, targetId, slideText);
  const createDebug = (
    stage: MapPopupMediaDebug["stage"],
    item: MapPopupMediaCandidate | null,
    cacheHit: boolean,
  ): MapPopupMediaDebug => ({
    stage,
    cacheHit,
    type,
    targetId,
    slideTextSample: slideText.slice(0, 120),
    pexelsQueries,
    giphyQueries,
    excludeCount: normalizedExcludedUrls.size,
    chosenSource: item?.source ?? null,
    chosenQuery: item?.searchQuery ?? null,
  });

  if (cached && cached.source !== "fallback" && !normalizedExcludedUrls.has(cached.url)) {
    return {
      item: cached,
      debug: createDebug("cache", cached, true),
    };
  }

  const { relevanceTerms } = buildFallbackQueries(type, targetId, slideText);
  if (pexelsQueries.length === 0 && giphyQueries.length === 0) {
    return {
      item: null,
      debug: createDebug("no_queries", null, false),
    };
  }

  const searchStartedAt = Date.now();
  const resolvedFromPexels = await searchPexelsFirst(
    type,
    pexelsQueries,
    relevanceTerms,
    normalizedExcludedUrls,
    targetId,
    slideText,
    searchStartedAt,
  );
  if (resolvedFromPexels) {
    return {
      item: setMemoryCache(finalCacheKey, resolvedFromPexels, FINAL_RESULT_CACHE_TTL_MS),
      debug: createDebug("strict_pexels", resolvedFromPexels, false),
    };
  }

  // Age safety for GIPHY comes from rating=g and blocked-term filtering.
  const resolvedFromGiphy = await searchGiphyFallback(
    type,
    giphyQueries,
    relevanceTerms,
    normalizedExcludedUrls,
    targetId,
    slideText,
    searchStartedAt,
  );
  if (resolvedFromGiphy) {
    return {
      item: setMemoryCache(finalCacheKey, resolvedFromGiphy, FINAL_RESULT_CACHE_TTL_MS),
      debug: createDebug("strict_giphy", resolvedFromGiphy, false),
    };
  }

  const genericProviderResult = await searchGenericProviderFallback(
    type,
    normalizedExcludedUrls,
    searchStartedAt,
  );
  if (genericProviderResult) {
    return {
      item: setMemoryCache(finalCacheKey, genericProviderResult, FINAL_RESULT_CACHE_TTL_MS),
      debug: createDebug("generic_provider", genericProviderResult, false),
    };
  }

  const relaxedProviderResult = await searchRelaxedProviderFallback(
    type,
    pexelsQueries,
    giphyQueries,
    normalizedExcludedUrls,
    searchStartedAt,
  );
  if (relaxedProviderResult) {
    return {
      item: setMemoryCache(finalCacheKey, relaxedProviderResult, FINAL_RESULT_CACHE_TTL_MS),
      debug: createDebug("relaxed_provider", relaxedProviderResult, false),
    };
  }

  const finalResult = buildLocalFallbackCandidate(type, targetId, slideText);
  return {
    item: setMemoryCache(finalCacheKey, finalResult, FALLBACK_RESULT_CACHE_TTL_MS),
    debug: createDebug("local_fallback", finalResult, false),
  };
}
