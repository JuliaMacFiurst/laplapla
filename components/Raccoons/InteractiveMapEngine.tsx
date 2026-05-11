import {
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { flushSync } from "react-dom";
import { dictionaries } from "@/i18n";
import { buildLocalizedHref, getCurrentLang } from "@/lib/i18n/routing";
import { buildStudioRoute } from "@/lib/studioRouting";
import { normalizeSlug } from "@/lib/mapEntityRouting";
import type { MapPopupContent } from "@/types/mapPopup";
import { buildStudioSlidesFromCapybaraSlides } from "@/lib/capybaraStudioSlides";
import { parseMapStoryContentToSlides } from "@/lib/mapPopup/slideParser";
import { buildSupabasePublicUrl } from "@/lib/publicAssetUrls";
import { supabase } from "@/lib/supabase";
import flagCodeMap from "@/utils/confirmed_country_codes.json";
import { getMapSvg } from "@/utils/storageMaps";
import { useIsMobile } from "@/hooks/useIsMobile";
import MapViewport from "@/components/Raccoons/MapViewport";
import MapPopup from "@/components/Raccoons/MapPopup";

interface InteractiveMapProps {
  svgPath: string;
  type:
    | "country"
    | "river"
    | "sea"
    | "physic"
    | "flag"
    | "animal"
    | "culture"
    | "weather"
    | "food";
  popupFormatter: (id: string) => string;
  styleClass: string;
  previewSelectedId?: string | null;
  onUserSelect?: (selectedId: string) => void;
}

const isDebugLogging = process.env.NODE_ENV !== "production";

function splitTextToParagraphs(input: string | null | undefined): string[] {
  if (!input) {
    return [];
  }

  return input
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function isVideoMediaUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
}

function inferMediaTypeFromUrl(url: string | null | undefined): "image" | "video" | "gif" {
  const value = typeof url === "string" ? url.trim() : "";
  if (isVideoMediaUrl(value)) {
    return "video";
  }

  if (/\.gif(\?|#|$)/i.test(value)) {
    return "gif";
  }

  return "image";
}

function getSlideMediaType(slide: Pick<MapPopupContent["slides"][number], "imageUrl" | "mediaType">) {
  return slide.mediaType || inferMediaTypeFromUrl(slide.imageUrl);
}

function toPopupMediaUrl(url?: string | null) {
  if (!url) {
    return "";
  }

  // Popup media is displayed directly in <img>/<video>. Avoid the studio proxy here:
  // streamed image proxy responses can be aborted mid-transfer and trigger
  // ERR_CONTENT_LENGTH_MISMATCH in Chromium.
  return url;
}

type MapPopupSearchResponse = {
  item: {
    url: string;
    mediaType: "image" | "video" | "gif";
    source: "pexels" | "giphy" | "fallback";
    creditLine: string;
    searchQuery: string;
    relevanceScore: number;
  } | null;
  debug?: {
    stage: string;
    cacheHit: boolean;
    type: string;
    targetId: string;
    slideTextSample: string;
    pexelsQueries: string[];
    giphyQueries: string[];
    excludeCount: number;
    chosenSource: string | null;
    chosenQuery: string | null;
  };
};

type MediaPersistenceStatus = {
  action: "success" | "skipped" | "error";
  isAdmin: boolean;
  writeState: "saved" | "updated" | "error" | "skipped";
};

function buildMediaSearchParams(
  type: InteractiveMapProps["type"],
  slideText: string,
  targetId: string,
  excludedUrls: Iterable<string>,
) {
  const searchParams = new URLSearchParams({
    type,
    target_id: targetId,
    slide_text: slideText,
  });

  for (const candidateUrl of excludedUrls) {
    const normalizedUrl =
      typeof candidateUrl === "string" ? candidateUrl.trim() : "";
    if (normalizedUrl) {
      searchParams.append("exclude_url", normalizedUrl);
    }
  }

  return searchParams;
}

const MEDIA_SEARCH_TIMEOUT_MS = 15000;
const MEDIA_PRELOAD_TIMEOUT_MS = 18000;

async function requestMapPopupMedia(searchParams: URLSearchParams) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    MEDIA_SEARCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch("/api/map-popup-media/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: searchParams.get("type"),
        target_id: searchParams.get("target_id"),
        slide_text: searchParams.get("slide_text"),
        exclude_url: searchParams.getAll("exclude_url"),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Media search failed: ${response.status}`);
    }

    const payload = (await response.json()) as MapPopupSearchResponse;
    if (typeof window !== "undefined" && isDebugLogging) {
      console.log("[popup-media]", payload.debug ?? { missingDebug: true });
    }
    return payload;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function persistResolvedSlideMedia(params: {
  storyId: string | number;
  slideId: string;
  slideOrder: number;
  slideText: string;
  imageUrl: string;
  imageCreditLine?: string | null;
}): Promise<MediaPersistenceStatus> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const response = await fetch("/api/map-popup-content/media", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(params),
  });

  const actionHeader = response.headers.get("X-Map-Popup-Media-Action");
  const isAdminHeader = response.headers.get("X-Map-Popup-Media-Is-Admin");
  const writeStateHeader = response.headers.get(
    "X-Map-Popup-Media-Write-State",
  );
  const status: MediaPersistenceStatus = {
    action:
      actionHeader === "success" ||
      actionHeader === "skipped" ||
      actionHeader === "error"
        ? actionHeader
        : response.ok
          ? "success"
          : "error",
    isAdmin: isAdminHeader === "1",
    writeState:
      writeStateHeader === "saved" ||
      writeStateHeader === "updated" ||
      writeStateHeader === "error" ||
      writeStateHeader === "skipped"
        ? writeStateHeader
        : response.ok
          ? "updated"
          : "error",
  };

  if (!response.ok) {
    return status;
  }

  return status;
}

async function persistParsedSlidesToServer(storyId: string | number) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  await fetch("/api/map-popup-content/slides", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ storyId }),
  });
}

const RACCOON_WITH_MAP_FILES = {
  gifs: [
    "raccoon-with-map.gif",
    "raccoon-shakes-map.gif",
    "raccoon-rollup-map.gif",
    "raccoon-puts-map-in-bottle.gif",
  ],
  pngs: [
    "raccoon-with-map.png",
    "raccoon-shakes-map.png",
    "raccoon-rollup-map.png",
    "raccoon-puts-map-in-bottle.png",
  ],
} as const;

function getSeedValue(seedSource: string) {
  return seedSource
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
}

function prefersMotionFallback(
  type: InteractiveMapProps["type"],
  slideText: string,
) {
  const normalized = slideText.toLowerCase();
  const actionHints = [
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

  return (
    type === "weather" || actionHints.some((term) => normalized.includes(term))
  );
}

function buildClientRaccoonFallback(
  type: InteractiveMapProps["type"],
  targetId: string,
  slideText: string,
): NonNullable<MapPopupSearchResponse["item"]> {
  const seedSource = `${type}:${targetId}:${slideText}`;
  const seed = getSeedValue(seedSource);
  const preferGif = prefersMotionFallback(type, slideText);
  const primaryPool = preferGif
    ? RACCOON_WITH_MAP_FILES.gifs
    : RACCOON_WITH_MAP_FILES.pngs;
  const selectedFile =
    primaryPool[seed % primaryPool.length] ?? RACCOON_WITH_MAP_FILES.pngs[0];
  const url = buildSupabasePublicUrl(
    "characters",
    `raccoons/raccoon_with_map/${selectedFile}`,
  );

  return {
    url,
    mediaType: selectedFile.endsWith(".gif") ? "gif" : "image",
    source: "fallback",
    creditLine: "Raccoon with map from Capybara Tales",
    searchQuery: `client-fallback:${seedSource}`,
    relevanceScore: 1,
  };
}

function isLocalMapFallbackUrl(url: string | null | undefined) {
  if (!url) {
    return false;
  }

  return url.includes("/raccoons/raccoon_with_map/");
}

function applyResolvedSlideMedia(
  storyId: string | number,
  slideId: string,
  imageUrl: string,
  mediaType: "image" | "video" | "gif",
  imageCreditLine: string | null | undefined,
  setPopupContent: Dispatch<SetStateAction<MapPopupContent | null>>,
  setMediaStatusBySlideId: Dispatch<
    SetStateAction<Record<string, "loading" | "missing" | "ready">>
  >,
) {
  setMediaStatusBySlideId((current) => ({ ...current, [slideId]: "ready" }));
  setPopupContent((current) => {
    if (!current || current.storyId !== storyId) {
      return current;
    }

    return {
      ...current,
      slides: current.slides.map((slide) =>
        slide.id === slideId
          ? {
            ...slide,
            imageUrl,
            mediaType,
            imageCreditLine: imageCreditLine?.trim() || null,
          }
        : slide,
      ),
    };
  });
}

async function resolveSlideMedia(
  type: InteractiveMapProps["type"],
  targetId: string,
  slideText: string,
  excludedUrls: Iterable<string>,
) {
  try {
    const searchParams = buildMediaSearchParams(
      type,
      slideText,
      targetId,
      excludedUrls,
    );
    const mediaPayload = await requestMapPopupMedia(searchParams);
    return (
      mediaPayload.item ?? buildClientRaccoonFallback(type, targetId, slideText)
    );
  } catch {
    return buildClientRaccoonFallback(type, targetId, slideText);
  }
}

function preloadImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new window.Image();
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`Image preload timed out: ${url}`));
    }, MEDIA_PRELOAD_TIMEOUT_MS);

    image.onload = () => {
      window.clearTimeout(timeoutId);
      resolve();
    };
    image.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(new Error(`Image preload failed: ${url}`));
    };
    image.src = url;
  });
}

function preloadVideo(url: string) {
  return new Promise<void>((resolve, reject) => {
    const video = document.createElement("video");
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Video preload timed out: ${url}`));
    }, MEDIA_PRELOAD_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.removeEventListener("canplaythrough", handleReady);
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("loadeddata", handleReady);
      video.removeEventListener("error", handleError);
      video.removeAttribute("src");
      video.load();
    };

    const handleReady = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error(`Video preload failed: ${url}`));
    };

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.addEventListener("canplaythrough", handleReady, { once: true });
    video.addEventListener("canplay", handleReady, { once: true });
    video.addEventListener("loadeddata", handleReady, { once: true });
    video.addEventListener("error", handleError, { once: true });
    video.src = url;
    video.load();
  });
}

async function preloadPopupMedia(slides: MapPopupContent["slides"]) {
  await Promise.all(
    slides.map(async (slide) => {
      const rawUrl = typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : "";
      if (!rawUrl) {
        throw new Error(`Slide ${slide.id} has no media URL`);
      }

      const displayUrl = toPopupMediaUrl(rawUrl);
      if (getSlideMediaType(slide) === "video") {
        await preloadVideo(displayUrl);
        return;
      }

      await preloadImage(displayUrl);
    }),
  );
}

export default function InteractiveMap({
  svgPath,
  type,
  previewSelectedId,
  onUserSelect,
}: InteractiveMapProps) {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const isMobile = useIsMobile();
  const t = dictionaries[lang].raccoons.popup;
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupContent, setPopupContent] = useState<MapPopupContent | null>(
    null,
  );
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"slides" | "video">("slides");
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparingSlides, setIsPreparingSlides] = useState(false);
  const [mediaStatusBySlideId, setMediaStatusBySlideId] = useState<
    Record<string, "loading" | "missing" | "ready">
  >({});
  const [manualRefreshSlideId, setManualRefreshSlideId] = useState<
    string | null
  >(null);
  const [dbWriteStatusBySlideId, setDbWriteStatusBySlideId] = useState<
    Record<string, "saved" | "updated" | "error">
  >({});
  const [showAdminDbStatus, setShowAdminDbStatus] = useState(false);
  const lastClickTimeRef = useRef(0);
  const fetchIdRef = useRef(0);
  const isLoadingRef = useRef(false);
  const mediaHydrationRef = useRef(new Set<string>());
  const mediaAttemptedRef = useRef(new Set<string>());
  const slideParseHydrationRef = useRef(new Set<string>());
  const mediaRequestVersionRef = useRef(new Map<string, number>());

  const lastSelectedPath = useRef<SVGPathElement | null>(null);
  const previewSelectedPathsRef = useRef<SVGPathElement[]>([]);
  const hoveredPathRef = useRef<SVGPathElement | null>(null);
  const selectedElementRef = useRef<string | null>(null);

  const [, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const safeViewRef = useRef<{ x: number; y: number; zoom: number } | null>(
    null,
  );
  const isManualResetRef = useRef(false);
  const mobileMinZoomRef = useRef(
    type === "animal" ? 1 : type === "weather" ? 0.55 : 0.8,
  );
  const animalContentBoundsRef = useRef<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  } | null>(null);
  const mapContentRef = useRef<HTMLDivElement | null>(null);
  const svgHostRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const currentYRef = useRef(0);
  const movedDuringDragRef = useRef(false);
  const didDragRef = useRef(false);
  const pointerStartClientXRef = useRef(0);
  const pointerStartClientYRef = useRef(0);
  const ignoreNextOutsideClickRef = useRef(false);
  const lastTapTsRef = useRef(0);
  const pinchDistanceRef = useRef(0);
  const pinchZoomRef = useRef(1);
  const pinchXRef = useRef(0);
  const pinchYRef = useRef(0);
  const pinchCenterRef = useRef({ x: 0, y: 0 });
  const isPinchingRef = useRef(false);

  const popupSlides = popupContent?.slides ?? [];
  const selectedFlagUrl =
    type === "flag" && selectedElement ? getFlagUrl(selectedElement) : null;
  const selectedFlagLabel =
    type === "flag" && selectedElement
      ? `${t.flagAlt} ${selectedElement.toUpperCase()}`
      : null;
  const emptyStateSlideText =
    (t as { noSlidesYet?: string }).noSlidesYet ||
    (lang === "ru"
      ? "Енотики ещё не изучили это место на карте, но уже изучают его."
      : lang === "he"
        ? "הראקונים עדיין לא חקרו את המקום הזה במפה, אבל כבר עובדים על זה."
        : "Raccoons have not explored this place on the map yet, but they are already working on it.");

  const getMeaningfulSlideText = (value: string | null | undefined) =>
    (value ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const hasMeaningfulPopupSlides = popupSlides.some((slide) => {
    const hasText = getMeaningfulSlideText(slide.text).length > 0;
    const hasMedia = typeof slide.imageUrl === "string" && slide.imageUrl.trim().length > 0;
    return hasText || hasMedia;
  });

  const isPopupLoading = isLoading || isPreparingSlides;

  const effectivePopupSlides =
    !isPopupLoading && popupContent && !hasMeaningfulPopupSlides
      ? [
          {
            id: "empty-state-slide",
            index: 0,
            text: emptyStateSlideText,
            imageUrl: null,
            imageCreditLine: null,
            imageAuthor: null,
            imageSourceUrl: null,
          },
        ]
      : popupSlides;
  const safeCurrentSlideIndex =
    effectivePopupSlides.length === 0
      ? 0
      : Math.min(currentSlideIndex, Math.max(0, effectivePopupSlides.length - 1));
  const currentPopupSlide = effectivePopupSlides[safeCurrentSlideIndex] ?? null;

  const getHoverFill = useCallback(() => {
    if (type === "sea") return "#99dbf5";
    if (type === "river") return "#4cb3ff";
    if (type === "animal") return "#86c232";
    if (type === "weather") return "#f6c453";
    return "#f97316";
  }, [type]);

  const beginMediaRequest = (slideId: string) => {
    const nextVersion = (mediaRequestVersionRef.current.get(slideId) ?? 0) + 1;
    mediaRequestVersionRef.current.set(slideId, nextVersion);
    return nextVersion;
  };

  const isLatestMediaRequest = (slideId: string, requestVersion: number) =>
    (mediaRequestVersionRef.current.get(slideId) ?? 0) === requestVersion;

  const applyDbWriteStatus = (
    slideId: string,
    status: MediaPersistenceStatus,
  ) => {
    if (!status.isAdmin) {
      return;
    }

    setShowAdminDbStatus(true);

    const nextStatus =
      status.writeState === "saved" ||
      status.writeState === "updated" ||
      status.writeState === "error"
        ? status.writeState
        : null;

    if (nextStatus) {
      setDbWriteStatusBySlideId((current) => ({
        ...current,
        [slideId]: nextStatus,
      }));
    }
  };

  const getSelectedFill = useCallback(() => {
    if (type === "river") return "#ff7a00";
    return "#e0d4f7";
  }, [type]);

  const isInteractivePath = useCallback((path: SVGPathElement) => {
    const id = path.id?.trim();
    if (!id) {
      return false;
    }

    if (path.closest("defs, clipPath")) {
      return false;
    }

    if ((type === "animal" || type === "weather") && /^path\d+$/i.test(id)) {
      return false;
    }

    return true;
  }, [type]);

  const buildOverlayPathClone = useCallback((
    path: SVGPathElement,
    color: string,
    overlayType: "hover" | "selected",
  ) => {
    const clone = path.cloneNode(true) as SVGPathElement;
    clone.removeAttribute("id");
    clone.removeAttribute("data-selected");
    clone.removeAttribute("style");
    clone.setAttribute("pointer-events", "none");

    if (type === "river") {
      const baseStrokeWidth = Number.parseFloat(
        path.getAttribute("stroke-width") || "1",
      );
      clone.style.setProperty("fill", "none", "important");
      clone.style.setProperty("stroke", color, "important");
      clone.style.setProperty(
        "stroke-width",
        String(
          Number.isFinite(baseStrokeWidth)
            ? Math.max(baseStrokeWidth + 1.5, 2.5)
            : 2.5,
        ),
        "important",
      );
      clone.style.setProperty(
        "stroke-linecap",
        path.getAttribute("stroke-linecap") || "round",
        "important",
      );
      clone.style.setProperty(
        "stroke-linejoin",
        path.getAttribute("stroke-linejoin") || "round",
        "important",
      );
      clone.style.setProperty(
        "opacity",
        overlayType === "hover" ? "1" : "1",
        "important",
      );
      return clone;
    }

    clone.style.setProperty("fill", color, "important");
    clone.style.setProperty(
      "stroke",
      overlayType === "hover" ? "#ea580c" : "#a855f7",
      "important",
    );
    clone.style.setProperty(
      "stroke-width",
      overlayType === "hover" ? "1.5" : "2",
      "important",
    );
    clone.style.setProperty(
      "opacity",
      overlayType === "hover" ? "0.95" : "1",
      "important",
    );
    return clone;
  }, [type]);

  const buildOverlayBranchClone = useCallback((
    sourceSvg: SVGSVGElement,
    path: SVGPathElement,
    color: string,
    overlayType: "hover" | "selected",
  ) => {
    const styledPathClone = buildOverlayPathClone(path, color, overlayType);
    let currentNode: SVGElement = styledPathClone;
    let parent: Element | null = path.parentElement;

    while (
      parent &&
      parent instanceof SVGElement &&
      parent !== (sourceSvg as Element)
    ) {
      const parentClone = parent.cloneNode(false) as SVGElement;
      parentClone.removeAttribute("id");
      parentClone.removeAttribute("style");
      parentClone.setAttribute("pointer-events", "none");
      parentClone.appendChild(currentNode);
      currentNode = parentClone;
      parent = parent.parentElement;
    }

    return currentNode;
  }, [buildOverlayPathClone]);

  const syncInteractionOverlay = useCallback((
    hoveredPath: SVGPathElement | null = hoveredPathRef.current,
    selectedPath: SVGPathElement | null = lastSelectedPath.current,
    previewPaths: SVGPathElement[] = previewSelectedPathsRef.current,
  ) => {
    const sourceSvg = svgHostRef.current?.querySelector(
      "svg",
    ) as SVGSVGElement | null;
    if (!sourceSvg) {
      return;
    }

    if (selectedElementRef.current) {
      const liveSelectedPath = sourceSvg.querySelector(
        `path[id='${selectedElementRef.current}']`,
      ) as SVGPathElement | null;
      if (liveSelectedPath) {
        selectedPath = liveSelectedPath;
        lastSelectedPath.current = liveSelectedPath;
      }
    }

    if (hoveredPath && !sourceSvg.contains(hoveredPath)) {
      hoveredPath = null;
      hoveredPathRef.current = null;
    }

    previewPaths = previewPaths.filter((path) => sourceSvg.contains(path));
    previewSelectedPathsRef.current = previewPaths;

    const existingOverlay = sourceSvg.querySelector(
      '[data-interaction-overlay="true"]',
    );
    if (existingOverlay) {
      existingOverlay.remove();
    }

    if (!hoveredPath && !selectedPath && previewPaths.length === 0) {
      return;
    }

    const overlayGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    overlayGroup.setAttribute("data-interaction-overlay", "true");
    overlayGroup.setAttribute("pointer-events", "none");

    if (hoveredPath && hoveredPath !== selectedPath) {
      overlayGroup.appendChild(
        buildOverlayBranchClone(
          sourceSvg,
          hoveredPath,
          getHoverFill(),
          "hover",
        ),
      );
    }

    if (selectedPath) {
      overlayGroup.appendChild(
        buildOverlayBranchClone(
          sourceSvg,
          selectedPath,
          getSelectedFill(),
          "selected",
        ),
      );
    }

    if (!selectedPath && previewPaths.length > 0) {
      previewPaths.forEach((previewPath) => {
        overlayGroup.appendChild(
          buildOverlayBranchClone(
            sourceSvg,
            previewPath,
            getSelectedFill(),
            "selected",
          ),
        );
      });
    }

    sourceSvg.appendChild(overlayGroup);
  }, [buildOverlayBranchClone, getHoverFill, getSelectedFill]);

  const resolvePathsById = useCallback((sourceSvg: SVGSVGElement, id: string) => {
    const escapedId =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(id)
        : id.replace(/["\\]/g, "\\$&");
    const exactMatches = Array.from(
      sourceSvg.querySelectorAll(`path[id="${escapedId}"]`),
    ) as SVGPathElement[];
    if (exactMatches.length > 0) {
      return exactMatches;
    }

    const normalizedTargetId = normalizeSlug(id);
    const paths = Array.from(
      sourceSvg.querySelectorAll("path[id]"),
    ) as SVGPathElement[];
    return paths.filter((path) => {
      const pathId = path.getAttribute("id") || "";
      return (
        pathId.toLowerCase() === id.toLowerCase() ||
        normalizeSlug(pathId) === normalizedTargetId
      );
    });
  }, []);

  const applySelectedStyle = useCallback((path: SVGPathElement) => {
    path.setAttribute("data-selected", "true");
    lastSelectedPath.current = path;
    syncInteractionOverlay();
  }, [syncInteractionOverlay]);

  const clearSelectedStyle = useCallback(() => {
    if (!lastSelectedPath.current) {
      return;
    }

    const previousPath = lastSelectedPath.current;
    previousPath.removeAttribute("data-selected");
    lastSelectedPath.current = null;
    syncInteractionOverlay();
  }, [syncInteractionOverlay]);

  const applyHoverStyle = useCallback((path: SVGPathElement) => {
    if (path === hoveredPathRef.current) {
      return;
    }

    hoveredPathRef.current = path;
    syncInteractionOverlay();
  }, [syncInteractionOverlay]);

  const clearHoverStyle = useCallback((path: SVGPathElement) => {
    if (hoveredPathRef.current !== path) {
      return;
    }

    hoveredPathRef.current = null;
    syncInteractionOverlay();
  }, [syncInteractionOverlay]);

  const closeSelection = useCallback((
    _reason: "outside" | "button" | "toggle" | "map-switch",
  ) => {
    if (
      !selectedElementRef.current &&
      !lastSelectedPath.current &&
      !isPopupOpen
    ) {
      return;
    }

    hoveredPathRef.current = null;
    setIsPopupOpen(false);
    setCurrentSlideIndex(0);
    setViewMode("slides");
  }, [isPopupOpen]);

  const openSelection = useCallback((path: SVGPathElement, id: string) => {
    if (!id) {
      return;
    }

    const now = Date.now();
    if (now - lastClickTimeRef.current < 300) {
      return;
    }
    lastClickTimeRef.current = now;

    if (isLoadingRef.current) {
      setToast(t.previousStoryInProgress);
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (type === "river") {
      const bbox = path.getBBox();
      if (bbox.width > 150 && bbox.height > 80) {
        return;
      }
    }

    if (
      selectedElementRef.current === id &&
      lastSelectedPath.current === path
    ) {
      if (!isPopupOpen) {
        setIsPopupOpen(true);
      }
      return;
    }

    clearSelectedStyle();
    applySelectedStyle(path);
    selectedElementRef.current = id;
    ignoreNextOutsideClickRef.current = true;
    flushSync(() => {
      setSelectedElement(id);
      setIsPopupOpen(true);
    });
  }, [
    applySelectedStyle,
    clearSelectedStyle,
    isPopupOpen,
    t.previousStoryInProgress,
    type,
  ]);

  function getFlagUrl(id: string): string | null {
    if (!id) return null;

    const lower = id.toLowerCase();

    // ✅ ISO‑коды (две буквы)
    if (/^[a-z]{2}$/.test(lower)) {
      return buildSupabasePublicUrl("flags-svg", `flags-svg/${lower}.svg`);
    }

    // ✅ Поиск кода страны по названию
    const map = flagCodeMap as Record<string, string>;
    const code = map[lower];

    return code
      ? buildSupabasePublicUrl("flags-svg", `flags-svg/${code}.svg`)
      : null;
  }

  useEffect(() => {
    setIsMapLoading(true);
    getMapSvg(svgPath).then((text) => {
      if (!text) {
        setIsMapLoading(false);
        return;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "image/svg+xml");
      const svgElement = doc.querySelector("svg");

      if (svgElement) {
        svgElement.classList.add(`${type}-map`);
        svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svgElement.style.overflow = "visible";
        setSvgContent(svgElement.outerHTML);
      } else {
        setSvgContent(text);
      }

      setTimeout(() => setIsVisible(true), 0);
      setIsMapLoading(false);
    });
  }, [svgPath, type]);

  useLayoutEffect(() => {
    // Disable special animal-content bounds logic on mobile.
    // It over-constrains panning and traps the map around America.
    animalContentBoundsRef.current = null;
  }, [isMobile, svgContent, type]);

  useEffect(() => {
    isLoadingRef.current = isPopupLoading;
  }, [isPopupLoading]);

  useEffect(() => {
    setCurrentSlideIndex(0);
    setViewMode("slides");
    setMediaStatusBySlideId({});
  }, [selectedElement]);

  const handleOpenCatsEditor = () => {
    if (!popupContent || effectivePopupSlides.length === 0) {
      setToast(t.noSlidesForEditor);
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const importedSlides = buildStudioSlidesFromCapybaraSlides(
      effectivePopupSlides.map((slide) => ({
        text: slide.text || "",
        imageUrl: getSlideMediaType(slide) === "video"
          ? undefined
          : slide.imageUrl || undefined,
        videoUrl: getSlideMediaType(slide) === "video"
          ? slide.imageUrl || undefined
          : undefined,
      })),
    );

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "catsSlides",
        JSON.stringify(importedSlides),
      );
    }

    void router.push(buildStudioRoute("cats", lang), undefined, {
      locale: lang,
    });
  };

  const handleOpenVideo = () => {
    const youtubeUrl = popupContent?.video?.youtubeUrl;
    const youtubeId = popupContent?.video?.youtubeId;
    if (!youtubeUrl && !youtubeId) {
      setToast(t.noVideo);
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setViewMode("video");
  };

  const handleWatchYoutube = () => {
    const youtubeUrl = popupContent?.video?.youtubeUrl?.trim();
    const youtubeId = popupContent?.video?.youtubeId?.trim();
    const targetUrl =
      youtubeUrl ||
      (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : "");

    if (!targetUrl) {
      setToast(t.noVideo);
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenTextPage = () => {
    const targetId = (
      popupContent?.targetId ||
      selectedElementRef.current ||
      selectedElement ||
      ""
    ).trim();
    if (!targetId) {
      setToast(t.contentNotReady);
      setTimeout(() => setToast(null), 2500);
      return;
    }

    void router.push(
      buildLocalizedHref(`/map/${type}/${normalizeSlug(targetId)}`, lang),
      undefined,
      { locale: lang },
    );
  };

  const handleOpenGoogleMaps = () => {
    const googleMapsUrl = popupContent?.googleMapsUrl;
    if (!googleMapsUrl) {
      setToast(t.noGoogleMaps);
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (typeof window !== "undefined") {
      window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleRefreshSlideMedia = async (slideIndex?: number) => {
    const slide =
      typeof slideIndex === "number"
        ? effectivePopupSlides[
            Math.min(
              Math.max(slideIndex, 0),
              Math.max(0, effectivePopupSlides.length - 1),
            )
          ]
        : currentPopupSlide;

    if (!popupContent || !slide) {
      return;
    }

    const storyId = popupContent.storyId;
    const targetId = popupContent.targetId;
    if (!storyId || !targetId || !slide.text.trim()) {
      return;
    }

    setManualRefreshSlideId(slide.id);
    setMediaStatusBySlideId((current) => ({
      ...current,
      [slide.id]: "loading",
    }));
    const requestVersion = beginMediaRequest(slide.id);

    try {
      const usedMediaUrls = popupContent.slides
        .map((slide) =>
          typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : "",
        )
        .filter((url) => url && !isLocalMapFallbackUrl(url))
        .filter(Boolean);
      const resolvedItem = await resolveSlideMedia(
        type,
        targetId,
        slide.text,
        usedMediaUrls,
      );
      if (!isLatestMediaRequest(slide.id, requestVersion)) {
        return;
      }

      if (resolvedItem.source === "fallback") {
        const hasExistingImage =
          typeof slide.imageUrl === "string" &&
          slide.imageUrl.trim().length > 0 &&
          !isLocalMapFallbackUrl(slide.imageUrl);

        if (!hasExistingImage) {
          await preloadPopupMedia([
            {
              ...slide,
              imageUrl: resolvedItem.url,
              mediaType: resolvedItem.mediaType,
            },
          ]);
          applyResolvedSlideMedia(
            storyId,
            slide.id,
            resolvedItem.url,
            resolvedItem.mediaType,
            resolvedItem.creditLine,
            setPopupContent,
            setMediaStatusBySlideId,
          );
          setToast(
            lang === "ru"
              ? "Подходящее медиа не найдено, показываем fallback."
              : lang === "he"
                ? "לא נמצאה מדיה מתאימה, מציגים חלופה."
                : "No matching media was found, showing fallback media.",
          );
          setTimeout(() => setToast(null), 2500);
          return;
        }

        setMediaStatusBySlideId((current) => ({
          ...current,
          [slide.id]: hasExistingImage ? "ready" : "missing",
        }));
        setToast(
          lang === "ru"
            ? "Подходящее медиа не найдено."
            : lang === "he"
              ? "לא נמצאה מדיה מתאימה."
              : "No matching media was found.",
        );
        setTimeout(() => setToast(null), 2500);
        return;
      }

      await preloadPopupMedia([
        {
          ...slide,
          imageUrl: resolvedItem.url,
          mediaType: resolvedItem.mediaType,
        },
      ]);

      applyResolvedSlideMedia(
        storyId,
        slide.id,
        resolvedItem.url,
        resolvedItem.mediaType,
        resolvedItem.creditLine,
        setPopupContent,
        setMediaStatusBySlideId,
      );

      if (isDebugLogging) {
        console.info("[popup-media] manual refresh persist", {
          storyId,
          slideId: slide.id,
          slideOrder: slide.index,
          imageUrl: resolvedItem.url,
        });
      }

      void persistResolvedSlideMedia({
        storyId,
        slideId: slide.id,
        slideOrder: slide.index,
        slideText: slide.text,
        imageUrl: resolvedItem.url,
        imageCreditLine: resolvedItem.creditLine,
      })
        .then((status) => {
          applyDbWriteStatus(slide.id, status);
        })
        .catch((error) => {
          console.error("Failed to persist refreshed slide media", error);
          setDbWriteStatusBySlideId((current) => ({
            ...current,
            [slide.id]: "error",
          }));
        });

      setToast(
        lang === "ru"
          ? "Загружено новое медиа."
          : lang === "he"
            ? "נטענה מדיה חדשה."
            : "Loaded new media.",
      );
      setTimeout(() => setToast(null), 2500);
    } catch (error) {
      console.error("Failed to refresh slide media", error);
      setMediaStatusBySlideId((current) => ({
        ...current,
        [slide.id]: "missing",
      }));
    } finally {
      setManualRefreshSlideId(null);
    }
  };

  const softClamp = useCallback((value: number, min: number, max: number) => {
    if (value < min) {
      return min + (value - min) * 0.3;
    }
    if (value > max) {
      return max + (value - max) * 0.3;
    }
    return value;
  }, []);

  const getPanBounds = useCallback((nextZoom: number) => {
    if (!isMobile || !mapContentRef.current) {
      return null;
    }

    const container = mapContentRef.current.parentElement;
    const svg = svgHostRef.current?.querySelector("svg");

    if (!container || !svg) {
      return null;
    }

    const containerRect = container.getBoundingClientRect();

    const viewBox = svg.viewBox.baseVal;
    if (!viewBox || viewBox.width <= 0 || viewBox.height <= 0) {
      return null;
    }
    const svgWidth = viewBox.width * nextZoom;
    const svgHeight = viewBox.height * nextZoom;

    let minX = containerRect.width - svgWidth;
    let maxX = 0;
    let minY = containerRect.height - svgHeight;
    let maxY = 0;

    if (minX > maxX) {
      const centerX = (minX + maxX) / 2;
      minX = centerX;
      maxX = centerX;
    }

    if (minY > maxY) {
      const centerY = (minY + maxY) / 2;
      minY = centerY;
      maxY = centerY;
    }

    return { minX, maxX, minY, maxY };
  }, [isMobile]);

  const applyHardClamp = (nextZoom = zoomRef.current) => {
    const bounds = getPanBounds(nextZoom);
    if (!bounds) return;

    currentXRef.current = Math.min(
      bounds.maxX,
      Math.max(bounds.minX, currentXRef.current),
    );
    currentYRef.current = Math.min(
      bounds.maxY,
      Math.max(bounds.minY, currentYRef.current),
    );

    applyMapTransform(currentXRef.current, currentYRef.current, nextZoom);
  };

  const clampMobilePosition = useCallback((x: number, y: number, nextZoom: number) => {
    const bounds = getPanBounds(nextZoom);
    if (!bounds) {
      return { x, y };
    }

    return {
      x: softClamp(x, bounds.minX, bounds.maxX),
      y: softClamp(y, bounds.minY, bounds.maxY),
    };
  }, [getPanBounds, softClamp]);

  const applyMapTransform = useCallback((
    nextX = currentXRef.current,
    nextY = currentYRef.current,
    nextZoom = zoomRef.current,
  ) => {
    const mapContent = mapContentRef.current;
    if (!mapContent) {
      return;
    }

    mapContent.style.transformOrigin = "0 0";
    mapContent.style.transform = `translate(${nextX}px, ${nextY}px) scale(${nextZoom})`;
  }, []);

  // --- Helper to reset the map view to the safe initial view ---
  const resetMapView = () => {
    const mapContent = mapContentRef.current;
    const container = mapContent?.parentElement;
    const svg = svgHostRef.current?.querySelector("svg");

    if (!mapContent || !container || !svg) return;

    const viewBox = svg.viewBox.baseVal;
    if (!viewBox || viewBox.width <= 0 || viewBox.height <= 0) return;

    const zoom = zoomRef.current;

    // raw center (may be out of bounds)
    const containerRect = container.getBoundingClientRect();
    let nextX =
      containerRect.width / 2 - (viewBox.width / 2) * zoom;
    let nextY =
      containerRect.height / 2 - (viewBox.height / 2) * zoom;

    // IMPORTANT: clamp to valid bounds so map never disappears
    const clamped = clampMobilePosition(nextX, nextY, zoom);

    currentXRef.current = clamped.x;
    currentYRef.current = clamped.y;

    // smooth animation
    mapContent.style.transition = "transform 0.25s ease-out";
    applyMapTransform(clamped.x, clamped.y, zoom);

    setTimeout(() => {
      if (mapContent) {
        mapContent.style.transition = "";
      }
    }, 250);
  };
  void resetMapView;
  void isManualResetRef;

  useEffect(() => {
    const mapContent = svgHostRef.current;
    const container = mapContentRef.current?.parentElement;
    if (!mapContent || !container) return;

    const svg = mapContent.querySelector("svg");
    if (!svg) return;
    const viewBox = svg.viewBox.baseVal;
    if (!viewBox || viewBox.width <= 0 || viewBox.height <= 0) return;

    if (isMobile) {
      let initialMobileZoom = type === "weather" ? 0.72 : 1;

      if (type === "animal") {
        const fitX = container.getBoundingClientRect().width / viewBox.width;
        const fitY = container.getBoundingClientRect().height / viewBox.height;
        const fitZoom = Math.min(fitX, fitY);
        initialMobileZoom = Math.min(1, Math.max(0.35, fitZoom));

        // Allow zooming back out to the full-world fitted view.
        mobileMinZoomRef.current = initialMobileZoom;
      } else {
        mobileMinZoomRef.current = type === "weather" ? 0.55 : 0.8;
      }

      const containerRect = container.getBoundingClientRect();
      let offsetX = 0;
      let offsetY = 0;

      if (type === "animal") {
        const centerX = viewBox.width / 2;
        const centerY = viewBox.height / 2;
        offsetX = containerRect.width / 2 - centerX * initialMobileZoom;
        offsetY = containerRect.height / 2 - centerY * initialMobileZoom;
      }

      const clamped = clampMobilePosition(offsetX, offsetY, initialMobileZoom);
      zoomRef.current = initialMobileZoom;
      setZoom(initialMobileZoom);
      currentXRef.current = clamped.x;
      currentYRef.current = clamped.y;

      // save safe initial view
      safeViewRef.current = {
        x: clamped.x,
        y: clamped.y,
        zoom: initialMobileZoom,
      };

      applyMapTransform(clamped.x, clamped.y, initialMobileZoom);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const svgRect = {
      width: viewBox.width,
      height: viewBox.height,
    };

    let optimalZoom = 1;
    if (type !== "river") {
      const zoomX = containerRect.width / svgRect.width;
      const zoomY = containerRect.height / svgRect.height;
      optimalZoom = Math.min(zoomX, zoomY);
    }

    let offsetX = 0;
    let offsetY = 0;

    if (
      type === "country" ||
      type === "flag" ||
      type === "culture" ||
      type === "food"
    ) {
      offsetX = (containerRect.width - svgRect.width * optimalZoom) / 2 - 110;
      offsetY = -120;
    } else if (type === "animal") {
      offsetX = (containerRect.width - svgRect.width * optimalZoom) / 2 - 60;
      offsetY = -40;
    }

    setZoom(optimalZoom);
    zoomRef.current = optimalZoom;
    currentXRef.current = offsetX;
    currentYRef.current = offsetY;
    applyMapTransform(offsetX, offsetY, optimalZoom);
  }, [applyMapTransform, clampMobilePosition, isMobile, svgContent, type]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    movedDuringDragRef.current = false;
    didDragRef.current = false;
    pointerStartClientXRef.current = e.clientX;
    pointerStartClientYRef.current = e.clientY;
    startXRef.current = e.clientX - currentXRef.current;
    startYRef.current = e.clientY - currentYRef.current;
    if (mapContentRef.current) {
      mapContentRef.current.style.cursor = "grabbing";
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    if (
      Math.abs(e.clientX - pointerStartClientXRef.current) > 3 ||
      Math.abs(e.clientY - pointerStartClientYRef.current) > 3
    ) {
      movedDuringDragRef.current = true;
      didDragRef.current = true;
    }
    const nextX = e.clientX - startXRef.current;
    const nextY = e.clientY - startYRef.current;
    const clamped = clampMobilePosition(nextX, nextY, zoomRef.current);
    currentXRef.current = clamped.x;
    currentYRef.current = clamped.y;
    applyMapTransform(clamped.x, clamped.y, zoomRef.current);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (mapContentRef.current) {
      mapContentRef.current.style.cursor = "grab";
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const [touchA, touchB] = [e.touches[0], e.touches[1]];
      const dx = touchA.clientX - touchB.clientX;
      const dy = touchA.clientY - touchB.clientY;
      pinchDistanceRef.current = Math.hypot(dx, dy);
      pinchZoomRef.current = zoomRef.current;
      pinchXRef.current = currentXRef.current;
      pinchYRef.current = currentYRef.current;
      isPinchingRef.current = true;

      const centerX = (touchA.clientX + touchB.clientX) / 2;
      const centerY = (touchA.clientY + touchB.clientY) / 2;
      const rect = mapContentRef.current?.getBoundingClientRect();
      pinchCenterRef.current = rect
        ? {
            x: centerX - rect.left,
            y: centerY - rect.top,
          }
        : {
            x: centerX,
            y: centerY,
          };
      isDraggingRef.current = false;
      return;
    }

    isDraggingRef.current = true;
    movedDuringDragRef.current = false;
    didDragRef.current = false;
    pointerStartClientXRef.current = e.touches[0].clientX;
    pointerStartClientYRef.current = e.touches[0].clientY;
    startXRef.current = e.touches[0].clientX - currentXRef.current;
    startYRef.current = e.touches[0].clientY - currentYRef.current;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const [touchA, touchB] = [e.touches[0], e.touches[1]];
      const dx = touchA.clientX - touchB.clientX;
      const dy = touchA.clientY - touchB.clientY;
      const distance = Math.hypot(dx, dy);
      if (pinchDistanceRef.current <= 0) {
        return;
      }

      const rawZoom =
        pinchZoomRef.current * (distance / pinchDistanceRef.current);
      const maxZoom = type === "river" ? 6 : 4;

      const nextZoom = Math.min(
        maxZoom,
        Math.max(mobileMinZoomRef.current, rawZoom),
      );
      const scaleRatio = nextZoom / pinchZoomRef.current;

      const originX = pinchCenterRef.current.x;
      const originY = pinchCenterRef.current.y;

      const nextX = originX - (originX - pinchXRef.current) * scaleRatio;

      const nextY = originY - (originY - pinchYRef.current) * scaleRatio;
      const clamped = clampMobilePosition(nextX, nextY, nextZoom);

      zoomRef.current = nextZoom;
      currentXRef.current = clamped.x;
      currentYRef.current = clamped.y;
      applyMapTransform(clamped.x, clamped.y, nextZoom);
      movedDuringDragRef.current = true;
      didDragRef.current = true;
      return;
    }

    if (!isDraggingRef.current) return;
    e.preventDefault();
    if (
      Math.abs(e.touches[0].clientX - pointerStartClientXRef.current) > 3 ||
      Math.abs(e.touches[0].clientY - pointerStartClientYRef.current) > 3
    ) {
      movedDuringDragRef.current = true;
      didDragRef.current = true;
    }
    const nextX = e.touches[0].clientX - startXRef.current;
    const nextY = e.touches[0].clientY - startYRef.current;
    const clamped = clampMobilePosition(nextX, nextY, zoomRef.current);
    currentXRef.current = clamped.x;
    currentYRef.current = clamped.y;
    applyMapTransform(clamped.x, clamped.y, zoomRef.current);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length >= 2) {
      return;
    }

    if (isPinchingRef.current && e.touches.length < 2) {
      isPinchingRef.current = false;
      applyHardClamp(zoomRef.current);
      setZoom(zoomRef.current);
      return;
    }

    isDraggingRef.current = false;
    applyHardClamp(zoomRef.current);

    if (isMobile && !movedDuringDragRef.current) {
      const now = Date.now();
      if (now - lastTapTsRef.current < 280) {
        const maxZoom = type === "river" ? 6 : 4;

        const nextZoom =
          zoomRef.current >= 2
            ? mobileMinZoomRef.current
            : Math.min(maxZoom, zoomRef.current * 1.6);
        const clamped = clampMobilePosition(
          currentXRef.current,
          currentYRef.current,
          nextZoom,
        );
        zoomRef.current = nextZoom;
        setZoom(nextZoom);
        currentXRef.current = clamped.x;
        currentYRef.current = clamped.y;
        applyMapTransform(clamped.x, clamped.y, nextZoom);
      }
      lastTapTsRef.current = now;
    }
  };

  // Popup media pipeline: content -> slide normalization -> media resolution -> preload -> ready popup.
  useEffect(() => {
    if (!selectedElement || !isPopupOpen) {
      setPopupContent(null);
      setIsLoading(false);
      setIsPreparingSlides(false);
      setMediaStatusBySlideId({});
      setManualRefreshSlideId(null);
      mediaHydrationRef.current.clear();
      mediaAttemptedRef.current.clear();
      return;
    }

    let isCancelled = false;
    const currentFetchId = ++fetchIdRef.current;
    mediaHydrationRef.current.clear();
    mediaAttemptedRef.current.clear();
    setMediaStatusBySlideId({});
    setManualRefreshSlideId(null);
    setPopupContent(null);
    setIsLoading(true);
    setIsPreparingSlides(true);

    const fetchAndHandleStory = async () => {
      const buildFallbackContent = async (): Promise<MapPopupContent> => {
        const fallbackItem = buildClientRaccoonFallback(
          type,
          selectedElement,
          emptyStateSlideText,
        );
        return {
          storyId: null,
          type,
          targetId: selectedElement,
          lang,
          rawContent: null,
          title: null,
          googleMapsUrl: null,
          slides: [
            {
              id: `fallback:${type}:${selectedElement}`,
              index: 0,
              text: emptyStateSlideText,
              imageUrl: fallbackItem.url,
              mediaType: fallbackItem.mediaType,
              imageCreditLine: fallbackItem.creditLine,
              imageAuthor: null,
              imageSourceUrl: null,
            },
          ],
          video: null,
          source: "legacy_map_stories",
        };
      };

      const normalizeSlides = (content: MapPopupContent): MapPopupContent["slides"] => {
        const baseSlides =
          content.slides.length > 0
            ? content.slides
            : parseMapStoryContentToSlides(content.rawContent || "").map((slide, index) => ({
                id: `parsed:${content.storyId ?? `${type}:${selectedElement}`}:${index}`,
                index: typeof slide.slideOrder === "number" ? slide.slideOrder : index,
                text: slide.text,
                imageUrl: null,
                mediaType: null,
                imageCreditLine: null,
                imageAuthor: null,
                imageSourceUrl: null,
              }));

        const nonEmptySlides = baseSlides.filter((slide) => {
          const hasText = getMeaningfulSlideText(slide.text).length > 0;
          const hasMedia = typeof slide.imageUrl === "string" && slide.imageUrl.trim().length > 0;
          return hasText || hasMedia;
        });

        return nonEmptySlides.length > 0
          ? nonEmptySlides
          : [
              {
                id: `fallback:${type}:${selectedElement}`,
                index: 0,
                text: emptyStateSlideText,
                imageUrl: null,
                mediaType: null,
                imageCreditLine: null,
                imageAuthor: null,
                imageSourceUrl: null,
              },
            ];
      };

      const prepareContent = async (content: MapPopupContent): Promise<MapPopupContent> => {
        const slides = normalizeSlides(content);
        const usedMediaUrls = new Set(
          slides
            .map((slide) => (typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : ""))
            .filter((url) => url && !isLocalMapFallbackUrl(url)),
        );
        const preparedSlides: MapPopupContent["slides"] = [];

        const prepareSlideWithMedia = async (
          slide: MapPopupContent["slides"][number],
          candidate: NonNullable<MapPopupSearchResponse["item"]>,
        ): Promise<MapPopupContent["slides"][number]> => {
          const nextSlide = {
            ...slide,
            text: slide.text || emptyStateSlideText,
            imageUrl: candidate.url,
            mediaType: candidate.mediaType,
            imageCreditLine: candidate.creditLine,
          };

          try {
            await preloadPopupMedia([nextSlide]);
            return nextSlide;
          } catch (error) {
            if (isDebugLogging) {
              console.warn("[popup-media] candidate preload failed, using fallback", {
                slideId: slide.id,
                targetId: content.targetId || selectedElement,
                url: candidate.url,
                mediaType: candidate.mediaType,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            }

            const fallbackItem = buildClientRaccoonFallback(
              type,
              content.targetId || selectedElement,
              getMeaningfulSlideText(slide.text) || content.targetId || selectedElement,
            );
            const fallbackSlide = {
              ...nextSlide,
              imageUrl: fallbackItem.url,
              mediaType: fallbackItem.mediaType,
              imageCreditLine: fallbackItem.creditLine,
            };
            await preloadPopupMedia([fallbackSlide]);
            return fallbackSlide;
          }
        };

        for (const slide of slides) {
          const existingUrl = typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : "";
          if (existingUrl) {
            const existingSlide = {
              ...slide,
              imageUrl: existingUrl,
              mediaType: slide.mediaType || inferMediaTypeFromUrl(existingUrl),
            };

            try {
              await preloadPopupMedia([existingSlide]);
              preparedSlides.push(existingSlide);
            } catch {
              const resolvedItem = await resolveSlideMedia(
                type,
                content.targetId || selectedElement,
                getMeaningfulSlideText(slide.text) || content.targetId || selectedElement,
                usedMediaUrls,
              );
              usedMediaUrls.add(resolvedItem.url);
              preparedSlides.push(await prepareSlideWithMedia(slide, resolvedItem));
            }
            continue;
          }

          const resolvedItem = await resolveSlideMedia(
            type,
            content.targetId || selectedElement,
            getMeaningfulSlideText(slide.text) || content.targetId || selectedElement,
            usedMediaUrls,
          );
          usedMediaUrls.add(resolvedItem.url);
          preparedSlides.push(await prepareSlideWithMedia(slide, resolvedItem));
        }

        return {
          ...content,
          slides: preparedSlides,
        };
      };

      try {
        const response = await fetch(
          `/api/map-popup-content?type=${encodeURIComponent(type)}&target_id=${encodeURIComponent(selectedElement)}&lang=${encodeURIComponent(lang)}`,
        );

        if (isCancelled || currentFetchId !== fetchIdRef.current) {
          return;
        }

        if (response.status === 404) {
          const fallbackContent = await buildFallbackContent();
          await preloadPopupMedia(fallbackContent.slides);
          if (!isCancelled && currentFetchId === fetchIdRef.current) {
            setPopupContent(fallbackContent);
            setMediaStatusBySlideId(
              Object.fromEntries(fallbackContent.slides.map((slide) => [slide.id, "ready"])),
            );
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load popup content: ${response.status}`);
        }

        const nextPopupContent = await prepareContent(
          (await response.json()) as MapPopupContent,
        );

        if (isCancelled || currentFetchId !== fetchIdRef.current) {
          return;
        }

        setPopupContent(nextPopupContent);
        setMediaStatusBySlideId(
          Object.fromEntries(nextPopupContent.slides.map((slide) => [slide.id, "ready"])),
        );
      } catch (err) {
        if (!isCancelled) {
          console.error("❌ Ошибка при загрузке popup-контента:", err);
          try {
            const fallbackContent = await buildFallbackContent();
            await preloadPopupMedia(fallbackContent.slides);
            if (!isCancelled && currentFetchId === fetchIdRef.current) {
              setPopupContent(fallbackContent);
              setMediaStatusBySlideId(
                Object.fromEntries(fallbackContent.slides.map((slide) => [slide.id, "ready"])),
              );
            }
          } catch (fallbackError) {
            console.error("Failed to prepare fallback popup media", fallbackError);
            setPopupContent(null);
          }
        }
      } finally {
        if (!isCancelled && currentFetchId === fetchIdRef.current) {
          setIsLoading(false);
          setIsPreparingSlides(false);
        }
      }
    };

    void fetchAndHandleStory();

    return () => {
      isCancelled = true;
    };
  }, [emptyStateSlideText, isPopupOpen, lang, selectedElement, type]);

  useEffect(() => {
    const storyId = popupContent?.storyId;
    const rawContent = popupContent?.rawContent?.trim() || "";
    const slides = popupContent?.slides ?? [];

    if (!storyId || slides.length > 0 || !rawContent) {
      return;
    }

    const requestKey = String(storyId);
    if (slideParseHydrationRef.current.has(requestKey)) {
      return;
    }

    slideParseHydrationRef.current.add(requestKey);
    let cancelled = false;

    const parseAndPersistSlides = async () => {
      try {
        const parsedSlides = parseMapStoryContentToSlides(rawContent).map(
          (slide, index) => ({
            id: `parsed:${requestKey}:${index}`,
            index:
              typeof slide.slideOrder === "number" ? slide.slideOrder : index,
            text: slide.text,
            imageUrl: null,
            mediaType: null,
            imageCreditLine: null,
            imageAuthor: null,
            imageSourceUrl: null,
          }),
        );
        if (parsedSlides.length === 0) {
          setIsPreparingSlides(false);
          slideParseHydrationRef.current.delete(requestKey);
          return;
        }
        if (cancelled) {
          slideParseHydrationRef.current.delete(requestKey);
          return;
        }

        setPopupContent((current) => {
          if (!current || current.storyId !== storyId) {
            return current;
          }

          return {
            ...current,
            slides: parsedSlides,
          };
        });

        void persistParsedSlidesToServer(storyId);
      } catch (error) {
        slideParseHydrationRef.current.delete(requestKey);
        console.error("Failed to parse and persist popup slides", error);
      }
    };

    void parseAndPersistSlides();

    return () => {
      cancelled = true;
    };
  }, [popupContent]);

  useEffect(() => {
    const storyId = popupContent?.storyId;
    const targetId = popupContent?.targetId;
    const slides = popupContent?.slides ?? [];

    if (!storyId || !targetId || slides.length === 0) {
      if (popupContent && !popupContent.rawContent?.trim()) {
        setIsPreparingSlides(false);
      }
      return;
    }

    let cancelled = false;
    const usedMediaUrls = new Set(
      slides
        .map((slide) =>
          typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : "",
        )
        .filter((url) => url && !isLocalMapFallbackUrl(url))
        .filter(Boolean),
    );
    const readySlideIds = slides
      .filter((slide) => {
        const imageUrl =
          typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : "";
        return imageUrl && !isLocalMapFallbackUrl(imageUrl);
      })
      .map((slide) => slide.id);

    if (readySlideIds.length > 0) {
      setMediaStatusBySlideId((current) => {
        const next = { ...current };
        let changed = false;

        for (const slideId of readySlideIds) {
          if (next[slideId] !== "ready") {
            next[slideId] = "ready";
            changed = true;
          }
        }

        return changed ? next : current;
      });
    }

    const markSlideMissing = (slideId: string) => {
      setMediaStatusBySlideId((current) => ({
        ...current,
        [slideId]: "missing",
      }));
    };

    const slidesToHydrate = slides.filter((slide) => {
      const imageUrl =
        typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : "";
      const hasImage = Boolean(imageUrl) && !isLocalMapFallbackUrl(imageUrl);
      if (hasImage) {
        return false;
      }

      if (!slide.text.trim()) {
        return false;
      }

      const requestKey = `${storyId}:${slide.id}`;
      return (
        !mediaHydrationRef.current.has(requestKey) &&
        !mediaAttemptedRef.current.has(requestKey)
      );
    });

    if (slidesToHydrate.length === 0) {
      setIsPreparingSlides(false);
      return;
    }

    const hydrateMissingMedia = async () => {
      setIsPreparingSlides(true);
      let nextSlideIndex = 0;
      const workerCount = Math.min(5, slidesToHydrate.length);

      const processSlide = async (slide: (typeof slides)[number]) => {
        const requestKey = `${storyId}:${slide.id}`;
        mediaHydrationRef.current.add(requestKey);
        mediaAttemptedRef.current.add(requestKey);
        setMediaStatusBySlideId((current) => ({
          ...current,
          [slide.id]: "loading",
        }));
        const requestVersion = beginMediaRequest(slide.id);

        try {
          const resolvedItem = await resolveSlideMedia(
            type,
            targetId,
            slide.text,
            usedMediaUrls,
          );
          if (cancelled || !resolvedItem.url) {
            markSlideMissing(slide.id);
            return;
          }

          if (!isLatestMediaRequest(slide.id, requestVersion)) {
            return;
          }

          if (resolvedItem.source === "fallback") {
            const hadExistingNonFallbackImage =
              typeof slide.imageUrl === "string" &&
              slide.imageUrl.trim().length > 0 &&
              !isLocalMapFallbackUrl(slide.imageUrl);

            if (!hadExistingNonFallbackImage) {
              applyResolvedSlideMedia(
                storyId,
                slide.id,
                resolvedItem.url,
                resolvedItem.mediaType,
                resolvedItem.creditLine,
                setPopupContent,
                setMediaStatusBySlideId,
              );
              return;
            }

            markSlideMissing(slide.id);
            return;
          }

          usedMediaUrls.add(resolvedItem.url);

          applyResolvedSlideMedia(
            storyId,
            slide.id,
            resolvedItem.url,
            resolvedItem.mediaType,
            resolvedItem.creditLine,
            setPopupContent,
            setMediaStatusBySlideId,
          );

          void persistResolvedSlideMedia({
            storyId,
            slideId: slide.id,
            slideOrder: slide.index,
            slideText: slide.text,
            imageUrl: resolvedItem.url,
            imageCreditLine: resolvedItem.creditLine,
          })
            .then((status) => {
              applyDbWriteStatus(slide.id, status);
            })
            .catch((error) => {
              console.error("Failed to persist hydrated slide media", error);
              setDbWriteStatusBySlideId((current) => ({
                ...current,
                [slide.id]: "error",
              }));
            });
        } catch (error) {
          console.error("Failed to hydrate popup slide media", error);
          markSlideMissing(slide.id);
        } finally {
          mediaHydrationRef.current.delete(requestKey);
        }
      };

      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (!cancelled) {
            const slide = slidesToHydrate[nextSlideIndex];
            nextSlideIndex += 1;
            if (!slide) {
              return;
            }

            await processSlide(slide);
          }
        }),
      );

      if (!cancelled) {
        setPopupContent((current) => {
          if (!current || current.storyId !== storyId) {
            return current;
          }

          const nextSlides = current.slides.map((slide) => {
            const imageUrl =
              typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : "";
            if (imageUrl) {
              return slide;
            }

            const fallbackItem = buildClientRaccoonFallback(
              type,
              targetId,
              slide.text || targetId,
            );

            return {
              ...slide,
              imageUrl: fallbackItem.url,
              mediaType: fallbackItem.mediaType,
              imageCreditLine: fallbackItem.creditLine,
            };
          });

          setMediaStatusBySlideId((statuses) => {
            const nextStatuses = { ...statuses };
            for (const slide of nextSlides) {
              nextStatuses[slide.id] = "ready";
            }
            return nextStatuses;
          });

          return {
            ...current,
            slides: nextSlides,
          };
        });
        setIsPreparingSlides(false);
      }
    };

    void hydrateMissingMedia();

    return () => {
      cancelled = true;
    };
  }, [popupContent, popupContent?.slides, popupContent?.storyId, popupContent?.targetId, type]);

  useLayoutEffect(() => {
    const mapContent = mapContentRef.current;
    const svgHost = svgHostRef.current;
    if (!mapContent || !svgHost) return;

    const svg = svgHost.querySelector("svg");
    if (!svg) return;

    if (
      ![
        "country",
        "flag",
        "physic",
        "animal",
        "culture",
        "weather",
        "food",
        "sea",
        "river",
      ].includes(type)
    ) {
      return;
    }

    const paths = Array.from(svg.querySelectorAll("path[id]")).filter((path) =>
      isInteractivePath(path as SVGPathElement),
    ) as SVGPathElement[];
    paths.forEach((path) => {
      path.style.cursor = "pointer";
      path.style.pointerEvents = "visibleStroke";
      if (type !== "river") {
        path.style.stroke = "rgba(0, 0, 0, 0)";
        path.style.strokeWidth = "10";
      }
      path.setAttribute("data-map-bound", "1");
    });

    const getPathFromNode = (node: EventTarget | null) => {
      if (!(node instanceof Element)) {
        return null;
      }

      const path = node.closest("path[id]") as SVGPathElement | null;
      if (!path || !isInteractivePath(path)) {
        return null;
      }

      return path;
    };

    const getSvgPointFromEvent = (event: MouseEvent) => {
      const ctm = svg.getScreenCTM();
      if (!ctm) {
        return null;
      }

      const point = new DOMPoint(event.clientX, event.clientY);
      return point.matrixTransform(ctm.inverse());
    };

    const getBiomePathFromPointerEvent = (event: MouseEvent) => {
      const svgPoint = getSvgPointFromEvent(event);
      if (!svgPoint) {
        return getPathFromNode(event.target);
      }

      const paths = Array.from(svg.querySelectorAll("path[id]")).filter(
        (path) => isInteractivePath(path as SVGPathElement),
      ) as SVGPathElement[];
      const hits = paths.filter((path) => {
        try {
          return path.isPointInFill(svgPoint) || path.isPointInStroke(svgPoint);
        } catch {
          return false;
        }
      });

      if (hits.length === 0) {
        return getPathFromNode(event.target);
      }

      return (
        hits.slice().sort((a, b) => {
          const aBox = a.getBBox();
          const bBox = b.getBBox();
          return aBox.width * aBox.height - bBox.width * bBox.height;
        })[0] ?? null
      );
    };

    const getPathFromPointerEvent = (event: MouseEvent) => {
      if (type === "animal" || type === "weather") {
        return getBiomePathFromPointerEvent(event);
      }

      if (typeof document.elementsFromPoint !== "function") {
        return getPathFromNode(event.target);
      }

      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      const candidates: SVGPathElement[] = [];
      const seen = new Set<SVGPathElement>();

      for (const element of elements) {
        const path = element.closest("path[id]") as SVGPathElement | null;
        if (!path || seen.has(path)) {
          continue;
        }

        if (!isInteractivePath(path)) {
          continue;
        }

        if (!mapContent.contains(path)) {
          continue;
        }

        if (path.closest('[data-interaction-overlay="true"]')) {
          continue;
        }

        seen.add(path);
        candidates.push(path);
      }

      if (candidates.length === 0) {
        return getPathFromNode(event.target);
      }

      return candidates[0] ?? null;
    };

    const handleContainerMouseOver = (event: MouseEvent) => {
      const path = getPathFromNode(event.target);
      if (!path || !mapContent.contains(path)) {
        return;
      }

      const relatedPath = getPathFromNode(event.relatedTarget);
      if (relatedPath === path) {
        return;
      }

      applyHoverStyle(path);
    };

    const handleContainerMouseOut = (event: MouseEvent) => {
      const path = getPathFromNode(event.target);
      if (!path || !mapContent.contains(path)) {
        return;
      }

      const relatedPath = getPathFromNode(event.relatedTarget);
      if (relatedPath === path) {
        return;
      }

      clearHoverStyle(path);
    };

    const handleContainerMouseMove = (event: MouseEvent) => {
      if (type !== "animal" && type !== "weather") {
        return;
      }

      const path = getPathFromPointerEvent(event);

      if (!path || !mapContent.contains(path)) {
        if (hoveredPathRef.current) {
          clearHoverStyle(hoveredPathRef.current);
        }
        return;
      }

      if (hoveredPathRef.current && hoveredPathRef.current !== path) {
        clearHoverStyle(hoveredPathRef.current);
      }

      applyHoverStyle(path);
    };

    const handleContainerMouseLeave = () => {
      if (hoveredPathRef.current) {
        clearHoverStyle(hoveredPathRef.current);
      }
    };

    const handleContainerClick = (event: MouseEvent) => {
      const path = getPathFromPointerEvent(event);
      if (!path || !mapContent.contains(path)) {
        return;
      }

      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }

      onUserSelect?.(path.id);
      openSelection(path, path.id);
    };

    mapContent.addEventListener("mouseover", handleContainerMouseOver);
    mapContent.addEventListener("mouseout", handleContainerMouseOut);
    mapContent.addEventListener("mousemove", handleContainerMouseMove);
    mapContent.addEventListener("mouseleave", handleContainerMouseLeave);
    mapContent.addEventListener("click", handleContainerClick);

    syncInteractionOverlay();

    if (selectedElementRef.current) {
      const selectedPath = svg.querySelector(
        `path[id='${selectedElementRef.current}']`,
      ) as SVGPathElement | null;
      if (selectedPath) {
        applySelectedStyle(selectedPath);
      }
    }

    return () => {
      mapContent.removeEventListener("mouseover", handleContainerMouseOver);
      mapContent.removeEventListener("mouseout", handleContainerMouseOut);
      mapContent.removeEventListener("mousemove", handleContainerMouseMove);
      mapContent.removeEventListener("mouseleave", handleContainerMouseLeave);
      mapContent.removeEventListener("click", handleContainerClick);
    };
  }, [
    applyHoverStyle,
    applySelectedStyle,
    clearHoverStyle,
    isInteractivePath,
    onUserSelect,
    openSelection,
    svgContent,
    syncInteractionOverlay,
    type,
  ]);

  useEffect(() => {
    const sourceSvg = svgHostRef.current?.querySelector(
      "svg",
    ) as SVGSVGElement | null;
    if (!sourceSvg) {
      previewSelectedPathsRef.current = [];
      return;
    }

    if (selectedElementRef.current) {
      previewSelectedPathsRef.current = [];
      syncInteractionOverlay();
      return;
    }

    if (!previewSelectedId) {
      previewSelectedPathsRef.current = [];
      syncInteractionOverlay();
      return;
    }

    const previewPaths = resolvePathsById(sourceSvg, previewSelectedId).filter(
      (path) => isInteractivePath(path),
    );
    previewSelectedPathsRef.current = previewPaths;
    syncInteractionOverlay();
  }, [
    isInteractivePath,
    previewSelectedId,
    resolvePathsById,
    svgContent,
    syncInteractionOverlay,
    type,
  ]);

  // --- Добавляем refs и состояние для перетаскивания попапа ---
  const popupRef = useRef<HTMLDivElement | null>(null);
  const mobilePopupRef = useRef<HTMLDivElement | null>(null);
  const desktopPopupAnchorRef = useRef<HTMLDivElement | null>(null);
  const isPopupDraggingRef = useRef(false);
  const [popupPos, setPopupPos] = useState({ x: 60, y: 60 });

  const clampDesktopPopupPosition = (x: number, y: number) => {
    const anchor = desktopPopupAnchorRef.current;
    const popup = popupRef.current;

    if (!anchor || !popup) {
      return {
        x: Math.max(16, x),
        y: Math.max(16, y),
      };
    }

    const anchorRect = anchor.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const maxX = Math.max(16, anchorRect.width - popupRect.width - 16);
    const maxY = Math.max(16, anchorRect.height - popupRect.height - 16);

    return {
      x: Math.min(Math.max(16, x), maxX),
      y: Math.min(Math.max(16, y), maxY),
    };
  };

  // Обработчик для перетаскивания попапа
  const handlePopupMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isPopupDraggingRef.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = popupPos.x;
    const startTop = popupPos.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setPopupPos(clampDesktopPopupPosition(startLeft + dx, startTop + dy));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      isPopupDraggingRef.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  useLayoutEffect(() => {
    if (isMobile || !isPopupOpen) {
      return;
    }

    const syncPopupIntoView = () => {
      setPopupPos((current) => {
        const clamped = clampDesktopPopupPosition(current.x, current.y);
        if (clamped.x === current.x && clamped.y === current.y) {
          return current;
        }

        return clamped;
      });
    };

    syncPopupIntoView();

    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("resize", syncPopupIntoView);
    return () => window.removeEventListener("resize", syncPopupIntoView);
  }, [
    isMobile,
    isPopupOpen,
    viewMode,
    safeCurrentSlideIndex,
    hasMeaningfulPopupSlides,
    currentPopupSlide?.id,
  ]);

  // --- Обработчик клика по фону для закрытия попапа ---
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isPopupOpen) {
        return;
      }

      if (ignoreNextOutsideClickRef.current) {
        ignoreNextOutsideClickRef.current = false;
        return;
      }

      if (isPopupDraggingRef.current) {
        return;
      }

      const target = e.target;
      if (!(target instanceof Node)) {
        return;
      }

      const eventPath =
        typeof e.composedPath === "function" ? e.composedPath() : [];

      if (popupRef.current && eventPath.includes(popupRef.current)) {
        return;
      }

      if (mobilePopupRef.current && eventPath.includes(mobilePopupRef.current)) {
        return;
      }

      if (mapContentRef.current && eventPath.includes(mapContentRef.current)) {
        return;
      }

      if (popupRef.current?.contains(target)) {
        return;
      }

      if (mobilePopupRef.current?.contains(target)) {
        return;
      }

      if (mapContentRef.current?.contains(target)) {
        return;
      }

      closeSelection("outside");
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [closeSelection, isPopupOpen, type]);

  return (
    <div
      ref={desktopPopupAnchorRef}
      className="world-map-wrapper"
      style={{ touchAction: "none", position: "relative" }}
    >
      <MapViewport
        svgContent={svgContent}
        isVisible={isVisible}
        isMapLoading={isMapLoading}
        mapContentRef={mapContentRef}
        svgHostRef={svgHostRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        controls={
          !isMobile || !isPopupOpen ? (
            <div className="zoom-buttons">
              <button
                type="button"
                onClick={() => {
                  const maxZoom = type === "river" ? 6 : 4;
                  const nextZoom = Math.min(zoomRef.current * 1.2, maxZoom);
                  const clamped = clampMobilePosition(
                    currentXRef.current,
                    currentYRef.current,
                    nextZoom,
                  );
                  zoomRef.current = nextZoom;
                  setZoom(nextZoom);
                  currentXRef.current = clamped.x;
                  currentYRef.current = clamped.y;
                  applyMapTransform(clamped.x, clamped.y, nextZoom);
                }}
              >
                ＋
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextZoom = Math.max(
                    zoomRef.current / 1.2,
                    isMobile ? mobileMinZoomRef.current : 1,
                  );
                  const clamped = clampMobilePosition(
                    currentXRef.current,
                    currentYRef.current,
                    nextZoom,
                  );
                  zoomRef.current = nextZoom;
                  setZoom(nextZoom);
                  currentXRef.current = clamped.x;
                  currentYRef.current = clamped.y;
                  applyMapTransform(clamped.x, clamped.y, nextZoom);
                }}
              >
                －
              </button>

            </div>
          ) : null
        }
      />

      {!isMobile && isPopupOpen && (
        <div
          ref={popupRef}
          onMouseDown={handlePopupMouseDown}
          className={`country-popup ${viewMode === "video" ? "country-popup-video-mode" : ""}`}
          style={{
            left: popupPos.x,
            top: popupPos.y,
            position: "absolute",
          }}
        >
          <div className="country-popup-header">
            <button
              type="button"
              onClick={() => {
                closeSelection("button");
              }}
              className="country-close-button studio-button btn-pink"
              aria-label={t.close}
            >
              ×
            </button>
          </div>
          <div className="country-popup-body">
            {type === "flag" && getFlagUrl(selectedElement || "") && (
              <div style={{ textAlign: "center", marginBottom: "12px" }}>
                <Image
                  src={getFlagUrl(selectedElement!)!}
                  alt={`${t.flagAlt} ${selectedElement}`}
                  width={280}
                  height={180}
                  unoptimized
                  style={{
                    width: "280px",
                    height: "auto",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    marginBottom: "10px",
                  }}
                />
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    marginBottom: "10px",
                  }}
                >
                  {selectedElement?.toUpperCase()}
                </div>
              </div>
            )}

            <div className="map-text">
              {popupContent ? (
                <>
                  {viewMode === "video"
                    ? (() => {
                        const youtubeId =
                          popupContent.video?.youtubeId?.trim() || "";
                        return youtubeId ? (
                          <>
                            <div className="map-popup-video-toolbar">
                              <button
                                type="button"
                                onClick={() => setViewMode("slides")}
                                className="studio-button btn-lavender map-popup-video-close-button"
                              >
                                {t.closeVideo}
                              </button>
                            </div>

                            <div className="map-popup-video-frame">
                              <iframe
                                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&controls=1&modestbranding=1&rel=0`}
                                title={
                                  popupContent.video?.title ||
                                  popupContent.title ||
                                  selectedElement ||
                                  t.videoFrameTitle
                                }
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  width: "100%",
                                  height: "100%",
                                  border: 0,
                                  borderRadius: "16px",
                                }}
                              />
                            </div>

                            {popupContent.video?.title ? (
                              <p style={{ marginTop: 0 }}>
                                {popupContent.video.title}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <p>{t.noVideo}</p>
                        );
                      })()
                    : (() => {
                        const resolvedFallbackMedia =
                          popupContent?.targetId && currentPopupSlide?.text
                            ? buildClientRaccoonFallback(
                                type,
                                popupContent.targetId,
                                currentPopupSlide.text,
                              )
                            : null;
                        const persistedImageUrl =
                          typeof currentPopupSlide?.imageUrl === "string"
                            ? currentPopupSlide.imageUrl.trim()
                            : "";
                        const hasResolvedPersistedImage =
                          Boolean(persistedImageUrl) &&
                          !isLocalMapFallbackUrl(persistedImageUrl);
                        const imageUrl =
                          (hasResolvedPersistedImage
                            ? persistedImageUrl
                            : "") ||
                          resolvedFallbackMedia?.url ||
                          "";
                        const displayMediaUrl =
                          toPopupMediaUrl(imageUrl);
                        const isUsingFallbackMedia =
                          !hasResolvedPersistedImage &&
                          Boolean(resolvedFallbackMedia?.url);
                        const isVideoSlide =
                          currentPopupSlide?.mediaType === "video" ||
                          resolvedFallbackMedia?.mediaType === "video" ||
                          isVideoMediaUrl(imageUrl);
                        const paragraphs = splitTextToParagraphs(
                          currentPopupSlide?.text || "",
                        );
                        const creditLine =
                          (hasResolvedPersistedImage
                            ? currentPopupSlide?.imageCreditLine?.trim()
                            : "") ||
                          resolvedFallbackMedia?.creditLine ||
                          "";
                        const mediaStatus = currentPopupSlide
                          ? mediaStatusBySlideId[currentPopupSlide.id]
                          : undefined;
                        const dbWriteStatus = currentPopupSlide
                          ? dbWriteStatusBySlideId[currentPopupSlide.id]
                          : undefined;
                        const mediaStatusLabel =
                          mediaStatus === "loading"
                            ? isUsingFallbackMedia
                              ? lang === "ru"
                                ? "Енотики ищут подходящее медиа..."
                                : lang === "he"
                                  ? "הראקונים מחפשים מדיה מתאימה..."
                                  : "Raccoons are looking for matching media..."
                              : lang === "ru"
                                ? "Подбираем медиа..."
                                : lang === "he"
                                  ? "טוענים מדיה..."
                                  : "Loading media..."
                            : "";
                        const dbWriteStatusLabel =
                          dbWriteStatus === "saved"
                            ? lang === "ru"
                              ? "Сохранилось в базу"
                              : lang === "he"
                                ? "נשמר בבסיס הנתונים"
                                : "Saved to database"
                            : dbWriteStatus === "updated"
                              ? lang === "ru"
                                ? "Обновилось в базе"
                                : lang === "he"
                                  ? "עודכן בבסיס הנתונים"
                                  : "Updated in database"
                              : dbWriteStatus === "error"
                                ? lang === "ru"
                                  ? "Не сохранилось в базу"
                                  : lang === "he"
                                    ? "לא נשמר בבסיס הנתונים"
                                    : "Not saved to database"
                                : "";
                        const databaseLabel =
                          showAdminDbStatus &&
                          hasResolvedPersistedImage &&
                          !dbWriteStatusLabel
                            ? lang === "ru"
                              ? "Взята из базы"
                              : lang === "he"
                                ? "נטען ממסד הנתונים"
                                : "Loaded from database"
                            : "";
                        const dbWriteStatusColor =
                          dbWriteStatus === "saved"
                            ? "#15803d"
                            : dbWriteStatus === "updated"
                              ? "#1d4ed8"
                              : dbWriteStatus === "error"
                                ? "#b42318"
                                : "";

                        return (
                          <>
                            {hasMeaningfulPopupSlides ? (
                              <>
                                {displayMediaUrl ? (
                                  <div
                                    style={{
                                      marginBottom: "12px",
                                      textAlign: "center",
                                    }}
                                  >
                                    {isVideoSlide ? (
                                      <video
                                        src={displayMediaUrl}
                                        autoPlay
                                        muted
                                        loop
                                        controls
                                        playsInline
                                        preload="auto"
                                        onError={() => {
                                          console.error(
                                            "[popup-media/render-error]",
                                            {
                                              kind: "video",
                                              rawUrl: imageUrl,
                                              displayMediaUrl,
                                              slideId: currentPopupSlide?.id,
                                              targetId: popupContent?.targetId,
                                            },
                                          );
                                        }}
                                        style={{
                                          width: "100%",
                                          height: "auto",
                                          maxWidth: "320px",
                                          borderRadius: "8px",
                                        }}
                                      />
                                    ) : (
                                      <>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={displayMediaUrl}
                                        onError={() => {
                                          console.error(
                                            "[popup-media/render-error]",
                                            {
                                              kind: "image",
                                              rawUrl: imageUrl,
                                              displayMediaUrl,
                                              slideId: currentPopupSlide?.id,
                                              targetId: popupContent?.targetId,
                                            },
                                          );
                                        }}
                                        style={{
                                          width: "100%",
                                          height: "auto",
                                          maxWidth: "320px",
                                          borderRadius: "8px",
                                        }}
                                        alt={
                                          popupContent.title ||
                                          selectedElement ||
                                          t.slideMediaAlt
                                        }
                                      />
                                      </>
                                    )}
                                    {creditLine ? (
                                      <div
                                        style={{
                                          marginTop: "6px",
                                          fontSize: "12px",
                                          lineHeight: 1.35,
                                          color: "#666",
                                          textAlign: "left",
                                        }}
                                      >
                                        {creditLine}
                                      </div>
                                    ) : null}
                                    <div style={{ marginTop: "8px" }}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleRefreshSlideMedia()
                                        }
                                        disabled={
                                          manualRefreshSlideId ===
                                          currentPopupSlide?.id
                                        }
                                        className="studio-button btn-mint map-popup-action-button"
                                        style={{
                                          fontSize: "12px",
                                          padding: "6px 10px",
                                        }}
                                      >
                                        {manualRefreshSlideId ===
                                        currentPopupSlide?.id
                                          ? lang === "ru"
                                            ? "Ищем..."
                                            : lang === "he"
                                              ? "מחפשים..."
                                              : "Searching..."
                                          : lang === "ru"
                                            ? "Найти новое медиа"
                                            : lang === "he"
                                              ? "למצוא מדיה חדשה"
                                              : "Find new media"}
                                      </button>
                                    </div>
                                    {showAdminDbStatus && dbWriteStatusLabel ? (
                                      <div
                                        style={{
                                          marginTop: "8px",
                                          fontSize: "13px",
                                          fontWeight: 600,
                                          color: dbWriteStatusColor,
                                        }}
                                      >
                                        {dbWriteStatusLabel}
                                      </div>
                                    ) : databaseLabel ? (
                                      <div
                                        style={{
                                          marginTop: "8px",
                                          fontSize: "13px",
                                          fontWeight: 600,
                                          color: "#8b5e34",
                                        }}
                                      >
                                        {databaseLabel}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : mediaStatusLabel ? (
                                  <div
                                    style={{
                                      marginBottom: "12px",
                                      padding: "10px 12px",
                                      borderRadius: "10px",
                                      background: "#f8fafc",
                                      color: "#475467",
                                      fontSize: "13px",
                                      lineHeight: 1.4,
                                      textAlign: "center",
                                    }}
                                  >
                                    {mediaStatusLabel}
                                    <div style={{ marginTop: "8px" }}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleRefreshSlideMedia()
                                        }
                                        disabled={
                                          manualRefreshSlideId ===
                                          currentPopupSlide?.id
                                        }
                                        className="studio-button btn-mint map-popup-action-button"
                                        style={{
                                          fontSize: "12px",
                                          padding: "6px 10px",
                                        }}
                                      >
                                        {manualRefreshSlideId ===
                                        currentPopupSlide?.id
                                          ? lang === "ru"
                                            ? "Ищем..."
                                            : lang === "he"
                                              ? "מחפשים..."
                                              : "Searching..."
                                          : lang === "ru"
                                            ? "Найти новое медиа"
                                            : lang === "he"
                                              ? "למצוא מדיה חדשה"
                                              : "Find new media"}
                                      </button>
                                    </div>
                                  </div>
                                ) : null}

                                <div className="map-popup-toolbar">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCurrentSlideIndex((prev) =>
                                        Math.max(0, prev - 1),
                                      )
                                    }
                                    disabled={safeCurrentSlideIndex === 0}
                                    className="studio-button btn-blue map-popup-nav-button"
                                  >
                                    ←
                                  </button>
                                  <div className="map-popup-toolbar-label">
                                    {safeCurrentSlideIndex + 1} /{" "}
                                    {effectivePopupSlides.length}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCurrentSlideIndex((prev) =>
                                        Math.min(
                                          effectivePopupSlides.length - 1,
                                          prev + 1,
                                        ),
                                      )
                                    }
                                    disabled={
                                      safeCurrentSlideIndex ===
                                      effectivePopupSlides.length - 1
                                    }
                                    className="studio-button btn-yellow map-popup-nav-button"
                                  >
                                    →
                                  </button>
                                </div>

                                {paragraphs.length > 0 ? (
                                  paragraphs.map((paragraph, index) => (
                                    <p
                                      key={`${selectedElement}-slide-${safeCurrentSlideIndex}-paragraph-${index}`}
                                    >
                                      {paragraph}
                                    </p>
                                  ))
                                ) : (
                                  <p>{t.slideEmpty}</p>
                                )}

                                <div className="map-popup-action-list">
                                  <button
                                    type="button"
                                    onClick={handleOpenVideo}
                                    className="studio-button btn-lavender map-popup-action-button"
                                  >
                                    {t.watchVideo}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleOpenCatsEditor}
                                    className="studio-button btn-mint map-popup-action-button"
                                  >
                                    {t.openCatsEditor}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleOpenGoogleMaps}
                                    className="studio-button btn-blue map-popup-action-button"
                                  >
                                    {t.openGoogleMaps}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <p>{t.contentNotReady}</p>
                            )}
                          </>
                        );
                      })()}
                </>
              ) : isPopupOpen ? (
                isPopupLoading ? (
                  <div className="map-popup-loading-state" role="status" aria-live="polite">
                    <Image
                      src="/spinners/CatSpinner.svg"
                      alt=""
                      width={56}
                      height={56}
                      aria-hidden="true"
                      className="map-popup-loading-spinner"
                    />
                    <p>{t.loading}</p>
                  </div>
                ) : (
                  <p>{t.contentNotReady}</p>
                )
              ) : (
                <p>{t.initialPrompt}</p>
              )}
            </div>
          </div>
        </div>
      )}
      {isMobile ? (
        <div ref={mobilePopupRef}>
        <MapPopup
          isOpen={isPopupOpen}
          loading={isPopupLoading}
          lang={lang}
          slides={effectivePopupSlides}
          currentSlideIndex={safeCurrentSlideIndex}
          loadingLabel={t.loading}
          closeLabel={t.close}
          swipeHintLabel={
            lang === "ru"
              ? "Свайпни, чтобы листать"
              : lang === "he"
                ? "החליקו כדי להמשיך"
                : "Swipe to continue"
          }
          findNewImageLabel={
            manualRefreshSlideId === currentPopupSlide?.id
              ? "..."
              : lang === "ru"
                ? "Найти новое медиа"
                : lang === "he"
                  ? "למצוא מדיה חדשה"
                  : "Find new media"
          }
          editInStudioLabel={t.openCatsEditor}
          showOnMapLabel={t.showOnMap}
          watchYoutubeLabel={t.watchOnYoutube}
          openTextPageLabel={t.openTextPage}
          canWatchYoutube={Boolean(
            popupContent?.video?.youtubeUrl || popupContent?.video?.youtubeId,
          )}
          flagImageUrl={selectedFlagUrl}
          flagLabel={selectedFlagLabel}
          onClose={() => closeSelection("button")}
          onIndexChange={setCurrentSlideIndex}
          onFindNewImage={(index) => {
            setCurrentSlideIndex(index);
            return handleRefreshSlideMedia(index);
          }}
          onEditInStudio={handleOpenCatsEditor}
          onShowOnMap={handleOpenGoogleMaps}
          onWatchYoutube={handleWatchYoutube}
          onOpenTextPage={handleOpenTextPage}
        />
        </div>
      ) : null}
      {toast && (
        <div
          className="toast fixed bottom-6 right-6 z-50 bg-black text-white px-4 py-2 rounded shadow"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            backgroundColor: "black",
            color: "white",
            padding: "10px 16px",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/*
// --- Explicit SVG Path Binding with Diagnostics ---
// This is a robust re-binder for SVG path click handlers.
const svgRef = mapContentRef;
const lastBindRef = useRef<number>(0);

const onPathClick = (e: Event) => {
  // Click handler for SVG paths (diagnostic placeholder)
  // This logic can be customized if needed
};

function bindSvgPaths() {
  const container = svgRef.current;
  if (!container) return;

  const svg = container.querySelector("svg");
  if (!svg) return;

  // Поддерживаем и data-id, и id (разные версии карт)
  const paths = svg.querySelectorAll("path[data-id], path[id]");
  paths.forEach((p) => {
    (p as SVGPathElement).style.cursor = "pointer";
    (p as SVGPathElement).removeEventListener("click", onPathClick as any);
    (p as SVGPathElement).addEventListener("click", onPathClick as any);
  });

  window.__browserCapture?.capture?.("map-rebind:paths", {
    count: paths.length,
    reason: "explicit-bind",
    ts: new Date().toISOString(),
  });

  lastBindRef.current = Date.now();
}

// --- Effect: Bind SVG paths after SVG content loads ---
useEffect(() => {
  if (!svgContent) return;

  const t1 = setTimeout(bindSvgPaths, 20);
  const t2 = setTimeout(bindSvgPaths, 150);
  const t3 = setTimeout(bindSvgPaths, 400);

  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);
  };
}, [svgContent, type]);
*/
