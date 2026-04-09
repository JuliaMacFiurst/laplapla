import { useRef, useEffect, useLayoutEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/router";
import { flushSync } from "react-dom";
import { dictionaries } from "@/i18n";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";
import type { MapPopupContent } from "@/types/mapPopup";
import { buildStudioSlidesFromCapybaraSlides } from "@/lib/capybaraStudioSlides";
import { parseMapStoryContentToSlides } from "@/lib/mapPopup/slideParser";
import { buildSupabasePublicUrl } from "@/lib/publicAssetUrls";
import { supabase } from "@/lib/supabase";
import { toStudioMediaUrl } from "@/lib/studioMediaProxy";
import flagCodeMap from "@/utils/confirmed_country_codes.json";
import { getMapSvg } from "@/utils/storageMaps";

interface InteractiveMapProps {
  svgPath: string;
  type: 'country' | 'river' | 'sea' | 'physic' | 'flag' | 'animal' | 'culture' | 'weather' | 'food';
  popupFormatter: (id: string) => string;
  styleClass: string;
  previewSelectedId?: string | null;
}

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
    const normalizedUrl = typeof candidateUrl === "string" ? candidateUrl.trim() : "";
    if (normalizedUrl) {
      searchParams.append("exclude_url", normalizedUrl);
    }
  }

  return searchParams;
}

const MEDIA_SEARCH_TIMEOUT_MS = 15000;

async function requestMapPopupMedia(searchParams: URLSearchParams) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), MEDIA_SEARCH_TIMEOUT_MS);

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
    if (typeof window !== "undefined") {
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
  const writeStateHeader = response.headers.get("X-Map-Popup-Media-Write-State");
  const status: MediaPersistenceStatus = {
    action: actionHeader === "success" || actionHeader === "skipped" || actionHeader === "error"
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

function prefersMotionFallback(type: InteractiveMapProps["type"], slideText: string) {
  const normalized = slideText.toLowerCase();
  const actionHints = [
    "dance", "dancing", "jump", "jumping", "run", "running", "fly", "flying", "swim", "swimming",
    "storm", "wind", "rain", "snow", "wave", "flow", "moving", "motion",
    "танц", "беж", "лет", "прыг", "плав", "ветер", "дожд", "снег", "бур", "волна", "теч",
  ];

  return type === "weather" || actionHints.some((term) => normalized.includes(term));
}

function buildClientRaccoonFallback(
  type: InteractiveMapProps["type"],
  targetId: string,
  slideText: string,
): NonNullable<MapPopupSearchResponse["item"]> {
  const seedSource = `${type}:${targetId}:${slideText}`;
  const seed = getSeedValue(seedSource);
  const preferGif = prefersMotionFallback(type, slideText);
  const primaryPool = preferGif ? RACCOON_WITH_MAP_FILES.gifs : RACCOON_WITH_MAP_FILES.pngs;
  const selectedFile = primaryPool[seed % primaryPool.length] ?? RACCOON_WITH_MAP_FILES.pngs[0];
  const url = buildSupabasePublicUrl("characters", `raccoons/raccoon_with_map/${selectedFile}`);

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
  imageCreditLine: string | null | undefined,
  setPopupContent: Dispatch<SetStateAction<MapPopupContent | null>>,
  setMediaStatusBySlideId: Dispatch<SetStateAction<Record<string, "loading" | "missing" | "ready">>>,
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
    const searchParams = buildMediaSearchParams(type, slideText, targetId, excludedUrls);
    const mediaPayload = await requestMapPopupMedia(searchParams);
    return mediaPayload.item ?? buildClientRaccoonFallback(type, targetId, slideText);
  } catch {
    return buildClientRaccoonFallback(type, targetId, slideText);
  }
}

export default function InteractiveMap({ svgPath, type, previewSelectedId }: InteractiveMapProps) {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const t = dictionaries[lang].raccoons.popup;
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [popupContent, setPopupContent] = useState<MapPopupContent | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"slides" | "video">("slides");
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaStatusBySlideId, setMediaStatusBySlideId] = useState<Record<string, "loading" | "missing" | "ready">>({});
  const [manualRefreshSlideId, setManualRefreshSlideId] = useState<string | null>(null);
  const [dbWriteStatusBySlideId, setDbWriteStatusBySlideId] = useState<Record<string, "saved" | "updated" | "error">>({});
  const [showAdminDbStatus, setShowAdminDbStatus] = useState(false);
  const lastClickTimeRef = useRef(0);
  const fetchIdRef = useRef(0);
  const isLoadingRef = useRef(false);
  const mediaHydrationRef = useRef(new Set<string>());
  const mediaAttemptedRef = useRef(new Set<string>());
  const slideParseHydrationRef = useRef(new Set<string>());
  const mediaRequestVersionRef = useRef(new Map<string, number>());

  const lastSelectedPath = useRef<SVGPathElement | null>(null);
  const previewSelectedPathRef = useRef<SVGPathElement | null>(null);
  const hoveredPathRef = useRef<SVGPathElement | null>(null);
  const selectedElementRef = useRef<string | null>(null);

  const [zoom, setZoom] = useState(1);
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

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const popupSlides = popupContent?.slides ?? [];
  const isPopupOpen = selectedElement !== null;
  const safeCurrentSlideIndex = popupSlides.length === 0
    ? 0
    : Math.min(currentSlideIndex, Math.max(0, popupSlides.length - 1));
  const currentPopupSlide = popupSlides[safeCurrentSlideIndex] ?? null;

  const getHoverFill = () => {
    if (type === "sea") return "#99dbf5";
    if (type === "river") return "#4cb3ff";
    if (type === "animal") return "#86c232";
    if (type === "weather") return "#f6c453";
    return "#f97316";
  };

  const beginMediaRequest = (slideId: string) => {
    const nextVersion = (mediaRequestVersionRef.current.get(slideId) ?? 0) + 1;
    mediaRequestVersionRef.current.set(slideId, nextVersion);
    return nextVersion;
  };

  const isLatestMediaRequest = (slideId: string, requestVersion: number) =>
    (mediaRequestVersionRef.current.get(slideId) ?? 0) === requestVersion;

  const applyDbWriteStatus = (slideId: string, status: MediaPersistenceStatus) => {
    if (!status.isAdmin) {
      return;
    }

    setShowAdminDbStatus(true);

    const nextStatus =
      status.writeState === "saved" || status.writeState === "updated" || status.writeState === "error"
        ? status.writeState
        : null;

    if (nextStatus) {
      setDbWriteStatusBySlideId((current) => ({
        ...current,
        [slideId]: nextStatus,
      }));
    }
  };

  const getSelectedFill = () => {
    if (type === "river") return "#ff7a00";
    return "#e0d4f7";
  };

  const isInteractivePath = (path: SVGPathElement) => {
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
  };

  const buildOverlayPathClone = (
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
      const baseStrokeWidth = Number.parseFloat(path.getAttribute("stroke-width") || "1");
      clone.style.setProperty("fill", "none", "important");
      clone.style.setProperty("stroke", color, "important");
      clone.style.setProperty(
        "stroke-width",
        String(Number.isFinite(baseStrokeWidth) ? Math.max(baseStrokeWidth + 1.5, 2.5) : 2.5),
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
      clone.style.setProperty("opacity", overlayType === "hover" ? "1" : "1", "important");
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
    clone.style.setProperty("opacity", overlayType === "hover" ? "0.95" : "1", "important");
    return clone;
  };

  const buildOverlayBranchClone = (
    sourceSvg: SVGSVGElement,
    path: SVGPathElement,
    color: string,
    overlayType: "hover" | "selected",
  ) => {
    const styledPathClone = buildOverlayPathClone(path, color, overlayType);
    let currentNode: SVGElement = styledPathClone;
    let parent: Element | null = path.parentElement;

    while (parent && parent instanceof SVGElement && parent !== (sourceSvg as Element)) {
      const parentClone = parent.cloneNode(false) as SVGElement;
      parentClone.removeAttribute("id");
      parentClone.removeAttribute("style");
      parentClone.setAttribute("pointer-events", "none");
      parentClone.appendChild(currentNode);
      currentNode = parentClone;
      parent = parent.parentElement;
    }

    return currentNode;
  };

  const syncInteractionOverlay = (
    hoveredPath: SVGPathElement | null = hoveredPathRef.current,
    selectedPath: SVGPathElement | null = lastSelectedPath.current,
    previewPath: SVGPathElement | null = previewSelectedPathRef.current,
  ) => {
    const sourceSvg = svgHostRef.current?.querySelector("svg") as SVGSVGElement | null;
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

    if (previewPath && !sourceSvg.contains(previewPath)) {
      previewPath = null;
      previewSelectedPathRef.current = null;
    }

    const existingOverlay = sourceSvg.querySelector('[data-interaction-overlay="true"]');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    if (!hoveredPath && !selectedPath && !previewPath) {
      return;
    }

    const overlayGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    overlayGroup.setAttribute("data-interaction-overlay", "true");
    overlayGroup.setAttribute("pointer-events", "none");

    if (hoveredPath && hoveredPath !== selectedPath) {
      overlayGroup.appendChild(
        buildOverlayBranchClone(sourceSvg, hoveredPath, getHoverFill(), "hover"),
      );
    }

    if (selectedPath) {
      overlayGroup.appendChild(
        buildOverlayBranchClone(sourceSvg, selectedPath, getSelectedFill(), "selected"),
      );
    }

    if (!selectedPath && previewPath) {
      overlayGroup.appendChild(
        buildOverlayBranchClone(sourceSvg, previewPath, getSelectedFill(), "selected"),
      );
    }

    sourceSvg.appendChild(overlayGroup);
  };

  const resolvePathById = (sourceSvg: SVGSVGElement, id: string) => {
    const escapedId = typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(id)
      : id.replace(/["\\]/g, "\\$&");
    return sourceSvg.querySelector(`path[id="${escapedId}"]`) as SVGPathElement | null;
  };

  const applySelectedStyle = (path: SVGPathElement) => {
    path.setAttribute("data-selected", "true");
    lastSelectedPath.current = path;
    syncInteractionOverlay();
  };

  const clearSelectedStyle = () => {
    if (!lastSelectedPath.current) {
      return;
    }

    const previousPath = lastSelectedPath.current;
    previousPath.removeAttribute("data-selected");
    lastSelectedPath.current = null;
    syncInteractionOverlay();
  };

  const applyHoverStyle = (path: SVGPathElement) => {
    if (path === hoveredPathRef.current) {
      return;
    }

    hoveredPathRef.current = path;
    syncInteractionOverlay();
  };

  const clearHoverStyle = (path: SVGPathElement) => {
    if (hoveredPathRef.current !== path) {
      return;
    }

    hoveredPathRef.current = null;
    syncInteractionOverlay();
  };

  const closeSelection = (_reason: "outside" | "button" | "toggle" | "map-switch") => {
    if (!selectedElementRef.current && !lastSelectedPath.current && !selectedElement) {
      return;
    }

    clearSelectedStyle();
    selectedElementRef.current = null;
    hoveredPathRef.current = null;
    setSelectedElement(null);
    setPopupContent(null);
    setCurrentSlideIndex(0);
    setViewMode("slides");
  };

  const openSelection = (path: SVGPathElement, id: string) => {
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

    if (selectedElementRef.current === id && lastSelectedPath.current === path) {
      return;
    }

    clearSelectedStyle();
    applySelectedStyle(path);
    selectedElementRef.current = id;
    ignoreNextOutsideClickRef.current = true;
    flushSync(() => {
      setSelectedElement(id);
    });
  };

  const getFlagUrl = (id: string): string | null => {
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
  };

  useEffect(() => {
    getMapSvg(svgPath).then((text) => {
      if (!text) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "image/svg+xml");
      const svgElement = doc.querySelector("svg");

      if (svgElement) {
        svgElement.classList.add(`${type}-map`);
        setSvgContent(svgElement.outerHTML);
      } else {
        setSvgContent(text);
      }

      setTimeout(() => setIsVisible(true), 0);
    });
  }, [svgPath, type]);

useEffect(() => {
  isLoadingRef.current = isLoading;
}, [isLoading]);

useEffect(() => {
  setCurrentSlideIndex(0);
  setViewMode("slides");
  setMediaStatusBySlideId({});
}, [selectedElement]);

  const handleOpenCatsEditor = () => {
    if (!popupContent || popupSlides.length === 0) {
      setToast(t.noSlidesForEditor);
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const importedSlides = buildStudioSlidesFromCapybaraSlides(
      popupSlides.map((slide) => ({
        text: slide.text || "",
        imageUrl: isVideoMediaUrl(slide.imageUrl) ? undefined : slide.imageUrl || undefined,
        videoUrl: isVideoMediaUrl(slide.imageUrl) ? slide.imageUrl || undefined : undefined,
      })),
    );

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("catsSlides", JSON.stringify(importedSlides));
    }

    void router.push(
      { pathname: "/cats/studio", query: buildLocalizedQuery(lang) },
      undefined,
      { locale: lang },
    );
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

  const handleRefreshSlideMedia = async () => {
    if (!popupContent || !currentPopupSlide) {
      return;
    }

    const storyId = popupContent.storyId;
    const targetId = popupContent.targetId;
    if (!storyId || !targetId || !currentPopupSlide.text.trim()) {
      return;
    }

    setManualRefreshSlideId(currentPopupSlide.id);
    setMediaStatusBySlideId((current) => ({ ...current, [currentPopupSlide.id]: "loading" }));
    const requestVersion = beginMediaRequest(currentPopupSlide.id);

    try {
      const usedMediaUrls = popupContent.slides
        .map((slide) => (typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : ""))
        .filter((url) => url && !isLocalMapFallbackUrl(url))
        .filter(Boolean);
      const resolvedItem = await resolveSlideMedia(type, targetId, currentPopupSlide.text, usedMediaUrls);
      if (!isLatestMediaRequest(currentPopupSlide.id, requestVersion)) {
        return;
      }

      applyResolvedSlideMedia(
        storyId,
        currentPopupSlide.id,
        resolvedItem.url,
        resolvedItem.creditLine,
        setPopupContent,
        setMediaStatusBySlideId,
      );

      if (resolvedItem.source !== "fallback") {
        console.info("[popup-media] manual refresh persist", {
          storyId,
          slideId: currentPopupSlide.id,
          slideOrder: currentPopupSlide.index,
          imageUrl: resolvedItem.url,
        });

        void persistResolvedSlideMedia({
          storyId,
          slideId: currentPopupSlide.id,
          slideOrder: currentPopupSlide.index,
          slideText: currentPopupSlide.text,
          imageUrl: resolvedItem.url,
          imageCreditLine: resolvedItem.creditLine,
        })
          .then((status) => {
            applyDbWriteStatus(currentPopupSlide.id, status);
          })
          .catch((error) => {
            console.error("Failed to persist refreshed slide media", error);
            setDbWriteStatusBySlideId((current) => ({
              ...current,
              [currentPopupSlide.id]: "error",
            }));
          });
      }

      setToast(lang === "ru" ? "Загружена новая картинка." : lang === "he" ? "נטענה תמונה חדשה." : "Loaded a new image.");
      setTimeout(() => setToast(null), 2500);
    } catch (error) {
      console.error("Failed to refresh slide media", error);
      setMediaStatusBySlideId((current) => ({ ...current, [currentPopupSlide.id]: "missing" }));
    } finally {
      setManualRefreshSlideId(null);
    }
  };

useEffect(() => {
  const mapContent = svgHostRef.current;
  const container = document.querySelector(".map-container") as HTMLElement | null;
  if (!mapContent || !container) return;

  const svg = mapContent.querySelector("svg");
  if (!svg) return;

  const containerRect = container.getBoundingClientRect();
  const svgRect = svg.getBBox();

  // Новый расчёт масштабирования
  let optimalZoom = 1;
  if (type === 'river') {
    optimalZoom = 1; // без масштабирования
  } else {
    const zoomX = containerRect.width / svgRect.width;
    const zoomY = containerRect.height / svgRect.height;
    optimalZoom = Math.min(zoomX, zoomY); // масштабируем, чтобы влезло
  }

  setZoom(optimalZoom);

  let offsetX: number = 0;
  let offsetY: number = 0;

  if (type === 'country' || type === 'flag' || type === 'culture' || type === 'food') {
    offsetX = (containerRect.width - svgRect.width * optimalZoom) / 2 - 110;
    offsetY = -120;
  } else if (type === 'river') {
    offsetX = 0;
    offsetY = 0;
  } else if (type === 'animal') {
    offsetX = (containerRect.width - svgRect.width * optimalZoom) / 2 - 60;
    offsetY = -40;
  } 

  currentXRef.current = offsetX;
  currentYRef.current = offsetY;
  setPosition({ x: offsetX, y: offsetY });

}, [svgContent]);


  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    movedDuringDragRef.current = false;
    didDragRef.current = false;
    pointerStartClientXRef.current = e.clientX;
    pointerStartClientYRef.current = e.clientY;
    startXRef.current = e.clientX - currentXRef.current;
    startYRef.current = e.clientY - currentYRef.current;
    if (mapContentRef.current) {
      mapContentRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    if (Math.abs(e.clientX - pointerStartClientXRef.current) > 3 || Math.abs(e.clientY - pointerStartClientYRef.current) > 3) {
      movedDuringDragRef.current = true;
      didDragRef.current = true;
    }
    currentXRef.current = e.clientX - startXRef.current;
    currentYRef.current = e.clientY - startYRef.current;
    if (mapContentRef.current) {
      mapContentRef.current.style.transform = `translate(${currentXRef.current}px, ${currentYRef.current}px) scale(${zoom})`;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (mapContentRef.current) {
      mapContentRef.current.style.cursor = 'grab';
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    movedDuringDragRef.current = false;
    didDragRef.current = false;
    pointerStartClientXRef.current = e.touches[0].clientX;
    pointerStartClientYRef.current = e.touches[0].clientY;
    startXRef.current = e.touches[0].clientX - currentXRef.current;
    startYRef.current = e.touches[0].clientY - currentYRef.current;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    if (Math.abs(e.touches[0].clientX - pointerStartClientXRef.current) > 3 || Math.abs(e.touches[0].clientY - pointerStartClientYRef.current) > 3) {
      movedDuringDragRef.current = true;
      didDragRef.current = true;
    }
    currentXRef.current = e.touches[0].clientX - startXRef.current;
    currentYRef.current = e.touches[0].clientY - startYRef.current;
    if (mapContentRef.current) {
      mapContentRef.current.style.transform = `translate(${currentXRef.current}px, ${currentYRef.current}px) scale(${zoom})`;
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };
  
//обновление положения и масштаба SVG-карты на экране, когда изменяется позиция или зум.
useEffect(() => {
  
  const mapContent = mapContentRef.current;
  if (!mapContent) return;
  // Центрировать при первоначальной установке позиции
  const offsetX = currentXRef.current;
  const offsetY = currentYRef.current;

  mapContent.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
}, [position, zoom, svgContent, svgPath, type]);


// Read-only загрузка готового popup-контента по выбранному элементу
useEffect(() => {
  if (!selectedElement) {
    setPopupContent(null);
    setIsLoading(false);
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

  const fetchAndHandleStory = async () => {
    try {
      const response = await fetch(
        `/api/map-popup-content?type=${encodeURIComponent(type)}&target_id=${encodeURIComponent(selectedElement)}&lang=${encodeURIComponent(lang)}`,
      );

      if (isCancelled || currentFetchId !== fetchIdRef.current) {
        return;
      }

      if (response.status === 404) {
        setPopupContent(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load popup content: ${response.status}`);
      }

      const nextPopupContent = (await response.json()) as MapPopupContent;

      if (isCancelled || currentFetchId !== fetchIdRef.current) {
        return;
      }

      setPopupContent(nextPopupContent);
    } catch (err) {
      if (!isCancelled) {
        console.error("❌ Ошибка при загрузке popup-контента:", err);
        setPopupContent(null);
      }
    } finally {
      if (!isCancelled && currentFetchId === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  void fetchAndHandleStory();

  return () => {
    isCancelled = true;
  };
}, [lang, selectedElement, type]);

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
      const parsedSlides = parseMapStoryContentToSlides(rawContent).map((slide, index) => ({
        id: `parsed:${requestKey}:${index}`,
        index: typeof slide.slideOrder === "number" ? slide.slideOrder : index,
        text: slide.text,
        imageUrl: null,
        imageCreditLine: null,
        imageAuthor: null,
        imageSourceUrl: null,
      }));
      if (parsedSlides.length === 0) {
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
    return;
  }

  let cancelled = false;
  const usedMediaUrls = new Set(
    slides
      .map((slide) => (typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : ""))
      .filter((url) => url && !isLocalMapFallbackUrl(url))
      .filter(Boolean),
  );
  const readySlideIds = slides
    .filter((slide) => {
      const imageUrl = typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : "";
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
    setMediaStatusBySlideId((current) => ({ ...current, [slideId]: "missing" }));
  };

  const slidesToHydrate = slides.filter((slide) => {
    const imageUrl = typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : "";
    const hasImage = Boolean(imageUrl) && !isLocalMapFallbackUrl(imageUrl);
    if (hasImage) {
      return false;
    }

    if (!slide.text.trim()) {
      return false;
    }

    const requestKey = `${storyId}:${slide.id}`;
    return !mediaHydrationRef.current.has(requestKey) && !mediaAttemptedRef.current.has(requestKey);
  });

  if (slidesToHydrate.length === 0) {
    return;
  }

  const hydrateMissingMedia = async () => {
    let nextSlideIndex = 0;
    const workerCount = Math.min(3, slidesToHydrate.length);

    const processSlide = async (slide: typeof slides[number]) => {
      const requestKey = `${storyId}:${slide.id}`;
      mediaHydrationRef.current.add(requestKey);
      mediaAttemptedRef.current.add(requestKey);
      setMediaStatusBySlideId((current) => ({ ...current, [slide.id]: "loading" }));
      const requestVersion = beginMediaRequest(slide.id);

      try {
        const resolvedItem = await resolveSlideMedia(type, targetId, slide.text, usedMediaUrls);
        if (cancelled || !resolvedItem.url) {
          markSlideMissing(slide.id);
          return;
        }

        if (!isLatestMediaRequest(slide.id, requestVersion)) {
          return;
        }

        usedMediaUrls.add(resolvedItem.url);

        applyResolvedSlideMedia(
          storyId,
          slide.id,
          resolvedItem.url,
          resolvedItem.creditLine,
          setPopupContent,
          setMediaStatusBySlideId,
        );

        if (resolvedItem.source !== "fallback") {
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
        }
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
  };

  void hydrateMissingMedia();

  return () => {
    cancelled = true;
  };
}, [popupContent?.storyId, popupContent?.targetId, type]);

  useLayoutEffect(() => {
  const mapContent = mapContentRef.current;
  const svgHost = svgHostRef.current;
  if (!mapContent || !svgHost) return;

  const svg = svgHost.querySelector("svg");
  if (!svg) return;

  if (!['country', 'flag', 'physic', 'animal', 'culture', 'weather', 'food', 'sea', 'river'].includes(type)) {
    return;
  }

  const paths = Array.from(svg.querySelectorAll("path[id]")).filter((path) =>
    isInteractivePath(path as SVGPathElement),
  ) as SVGPathElement[];
  paths.forEach((path) => {
    path.style.cursor = "pointer";
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

    const paths = Array.from(svg.querySelectorAll("path[id]")).filter((path) =>
      isInteractivePath(path as SVGPathElement),
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

    return hits
      .slice()
      .sort((a, b) => {
        const aBox = a.getBBox();
        const bBox = b.getBBox();
        return aBox.width * aBox.height - bBox.width * bBox.height;
      })[0] ?? null;
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

    openSelection(path, path.id);
  };

  mapContent.addEventListener("mouseover", handleContainerMouseOver);
  mapContent.addEventListener("mouseout", handleContainerMouseOut);
  mapContent.addEventListener("mousemove", handleContainerMouseMove);
  mapContent.addEventListener("mouseleave", handleContainerMouseLeave);
  mapContent.addEventListener("click", handleContainerClick);

  syncInteractionOverlay();

  if (selectedElementRef.current) {
    const selectedPath = svg.querySelector(`path[id='${selectedElementRef.current}']`) as SVGPathElement | null;
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
}, [svgContent, type]);

  useEffect(() => {
    const sourceSvg = svgHostRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!sourceSvg) {
      previewSelectedPathRef.current = null;
      return;
    }

    if (selectedElementRef.current) {
      previewSelectedPathRef.current = null;
      syncInteractionOverlay();
      return;
    }

    if (!previewSelectedId) {
      previewSelectedPathRef.current = null;
      syncInteractionOverlay();
      return;
    }

    const previewPath = resolvePathById(sourceSvg, previewSelectedId);
    previewSelectedPathRef.current = previewPath && isInteractivePath(previewPath) ? previewPath : null;
    syncInteractionOverlay();
  }, [previewSelectedId, svgContent, type]);

  // --- Добавляем refs и состояние для перетаскивания попапа ---
 const popupRef = useRef<HTMLDivElement | null>(null);
  const isPopupDraggingRef = useRef(false);
  const [popupPos, setPopupPos] = useState({ x: 60, y: 60 });

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
      setPopupPos({ x: startLeft + dx, y: startTop + dy });
      
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      isPopupDraggingRef.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

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

      const eventPath = typeof e.composedPath === "function" ? e.composedPath() : [];

      if (popupRef.current && eventPath.includes(popupRef.current)) {
        return;
      }

      if (mapContentRef.current && eventPath.includes(mapContentRef.current)) {
        return;
      }

      if (popupRef.current?.contains(target)) {
        return;
      }

      if (mapContentRef.current?.contains(target)) {
        return;
      }

      closeSelection("outside");
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isPopupOpen, type]);

  return (
    <div className="world-map-wrapper">
      <div className="map-container">
        <div
          ref={mapContentRef}
          className={`map-content transition-opacity duration-700 ease-in-out ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            ref={svgHostRef}
            className="map-svg-host"
            dangerouslySetInnerHTML={{ __html: svgContent || "" }}
          />
        </div>

        {/* --- SVG Path Bind Effect --- */}
        {/*
          After SVG content changes, rebind path click handlers (for explicit diagnostic and robustness).
        */}
        {(() => { return null; })()}
        {/* EFFECT: Bind svg paths after svgContent changes */}
        {null}
        {/* The effect is below */}
        {/* (see end of file for useEffect) */}

        {isPopupOpen && (
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
                  <img
                    src={getFlagUrl(selectedElement!)!}
                    alt={`${t.flagAlt} ${selectedElement}`}
                    style={{
                      width: "280px",
                      height: "auto",
                      borderRadius: "6px",
                      border: "1px solid #ddd",
                      marginBottom: "10px"
                    }}
                  />
                  <div style={{ fontSize: "20px", fontWeight: "600", marginBottom: "10px" }}>
                    {selectedElement?.toUpperCase()}
                  </div>
                </div>
              )}

              <div className="map-text">
                {popupContent ? (
                  <>
                    {viewMode === "video" ? (
                      (() => {
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
                                title={popupContent.video?.title || popupContent.title || selectedElement || t.videoFrameTitle}
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
                              <p style={{ marginTop: 0 }}>{popupContent.video.title}</p>
                            ) : null}
                          </>
                        ) : (
                          <p>{t.noVideo}</p>
                        );
                      })()
                    ) : (
                      (() => {
                        const resolvedFallbackMedia =
                          popupContent?.targetId && currentPopupSlide?.text
                            ? buildClientRaccoonFallback(type, popupContent.targetId, currentPopupSlide.text)
                            : null;
                        const persistedImageUrl =
                          typeof currentPopupSlide?.imageUrl === "string" ? currentPopupSlide.imageUrl.trim() : "";
                        const hasResolvedPersistedImage = Boolean(persistedImageUrl) && !isLocalMapFallbackUrl(persistedImageUrl);
                        const imageUrl = (hasResolvedPersistedImage ? persistedImageUrl : "") || resolvedFallbackMedia?.url || "";
                        const displayMediaUrl = toStudioMediaUrl(imageUrl) || "";
                        const isUsingFallbackMedia = !hasResolvedPersistedImage && Boolean(resolvedFallbackMedia?.url);
                        const isVideoSlide = isVideoMediaUrl(imageUrl);
                        const paragraphs = splitTextToParagraphs(currentPopupSlide?.text || "");
                        const creditLine =
                          (hasResolvedPersistedImage ? currentPopupSlide?.imageCreditLine?.trim() : "") ||
                          resolvedFallbackMedia?.creditLine ||
                          "";
                        const mediaStatus = currentPopupSlide ? mediaStatusBySlideId[currentPopupSlide.id] : undefined;
                        const dbWriteStatus = currentPopupSlide ? dbWriteStatusBySlideId[currentPopupSlide.id] : undefined;
                        const mediaStatusLabel =
                          mediaStatus === "loading"
                            ? isUsingFallbackMedia
                              ? lang === "ru"
                                ? "Енотики ищут подходящую картинку..."
                                : lang === "he"
                                  ? "הראקונים מחפשים תמונה מתאימה..."
                                  : "Raccoons are looking for a matching image..."
                              : lang === "ru"
                                ? "Подбираем картинку..."
                                : lang === "he"
                                  ? "טוענים תמונה..."
                                  : "Loading image..."
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
                          showAdminDbStatus && hasResolvedPersistedImage && !dbWriteStatusLabel
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
                            {popupSlides.length > 0 ? (
                              <>
                                {displayMediaUrl ? (
                                  <div style={{ marginBottom: "12px", textAlign: "center" }}>
                                    {isVideoSlide ? (
                                      <video
                                        src={displayMediaUrl}
                                        autoPlay
                                        muted
                                        loop
                                        controls
                                        playsInline
                                        onError={() => {
                                          console.error("[popup-media/render-error]", {
                                            kind: "video",
                                            rawUrl: imageUrl,
                                            displayMediaUrl,
                                            slideId: currentPopupSlide?.id,
                                            targetId: popupContent?.targetId,
                                          });
                                        }}
                                        style={{ width: "100%", maxWidth: "320px", borderRadius: "8px" }}
                                      />
                                    ) : (
                                      <img
                                        src={displayMediaUrl}
                                        onError={() => {
                                          console.error("[popup-media/render-error]", {
                                            kind: "image",
                                            rawUrl: imageUrl,
                                            displayMediaUrl,
                                            slideId: currentPopupSlide?.id,
                                            targetId: popupContent?.targetId,
                                          });
                                        }}
                                        style={{ width: "100%", maxWidth: "320px", borderRadius: "8px" }}
                                        alt={popupContent.title || selectedElement || t.slideMediaAlt}
                                      />
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
                                        onClick={() => void handleRefreshSlideMedia()}
                                        disabled={manualRefreshSlideId === currentPopupSlide?.id}
                                        className="studio-button btn-mint map-popup-action-button"
                                        style={{ fontSize: "12px", padding: "6px 10px" }}
                                      >
                                        {manualRefreshSlideId === currentPopupSlide?.id
                                          ? (lang === "ru" ? "Ищем..." : lang === "he" ? "מחפשים..." : "Searching...")
                                          : (lang === "ru" ? "Найти новую картинку" : lang === "he" ? "למצוא תמונה חדשה" : "Find a new image")}
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
                                        onClick={() => void handleRefreshSlideMedia()}
                                        disabled={manualRefreshSlideId === currentPopupSlide?.id}
                                        className="studio-button btn-mint map-popup-action-button"
                                        style={{ fontSize: "12px", padding: "6px 10px" }}
                                      >
                                        {manualRefreshSlideId === currentPopupSlide?.id
                                          ? (lang === "ru" ? "Ищем..." : lang === "he" ? "מחפשים..." : "Searching...")
                                          : (lang === "ru" ? "Найти новую картинку" : lang === "he" ? "למצוא תמונה חדשה" : "Find a new image")}
                                      </button>
                                    </div>
                                  </div>
                                ) : null}

                                <div className="map-popup-toolbar">
                                  <button
                                    type="button"
                                    onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                                    disabled={safeCurrentSlideIndex === 0}
                                    className="studio-button btn-blue map-popup-nav-button"
                                  >
                                    ←
                                  </button>
                                  <div className="map-popup-toolbar-label">
                                    {safeCurrentSlideIndex + 1} / {popupSlides.length}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setCurrentSlideIndex((prev) => Math.min(popupSlides.length - 1, prev + 1))}
                                    disabled={safeCurrentSlideIndex === popupSlides.length - 1}
                                    className="studio-button btn-yellow map-popup-nav-button"
                                  >
                                    →
                                  </button>
                                </div>

                                {paragraphs.length > 0 ? (
                                  paragraphs.map((paragraph, index) => (
                                    <p key={`${selectedElement}-slide-${safeCurrentSlideIndex}-paragraph-${index}`}>{paragraph}</p>
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
                      })()
                    )}
                  </>
                ) : isPopupOpen ? (
                  isLoading ? (
                    <p>{t.loading}</p>
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
      </div>

      {/* Переместили сюда */}
      <div className="zoom-buttons">
        <button
          onClick={() => {
            setZoom((prev) => {
              const newZoom = Math.min(prev * 1.2, 3);
              currentXRef.current = 0;
              currentYRef.current = 0;
              setPosition({ x: 0, y: 0 });
              return newZoom;
            });
          }}
        >
          ＋
        </button>
        <button
          onClick={() => {
            setZoom((prev) => {
              const newZoom = Math.max(prev / 1.2, 0.5);
              currentXRef.current = 0;
              currentYRef.current = 0;
              setPosition({ x: 0, y: 0 });
              return newZoom;
            });
          }}
        >
          －
        </button>
      </div>
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
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
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
