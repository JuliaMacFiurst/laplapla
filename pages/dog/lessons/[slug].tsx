import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import Image from "next/image";
import SEO from "@/components/SEO";
import { buildRegionMap } from "@/utils/buildRegionMap";
import { autoColorRegions } from "@/utils/autoColorRegions";
import { paintRegionFast } from "@/utils/paintRegionFast";
import { drawLapLapLaWatermark } from "@/utils/drawLapLapLaWatermark";
import { getRandomArtFact } from "@/lib/artFacts/getRandomArtFact";
import TranslationWarning from "@/components/TranslationWarning";
import { buildLocalizedHref, getCurrentLang } from "@/lib/i18n/routing";
import { buildSupabasePublicUrl } from "@/lib/publicAssetUrls";
import { devLog } from "@/utils/devLog";
import { dictionaries, Lang } from "../../../i18n";
// Color seed placed by a paw click
type ColorSeed = {
  x: number;
  y: number;
  regionId: number;
  color: [number, number, number];
};
import ArtGalleryModal from "@/components/ArtGalleryModal";
import MobileArtGallery from "@/components/Dogs/MobileArtGallery";
import { useRouter } from "next/router";
import BackButton from "@/components/BackButton";
import PuzzleCanvas from "@/components/Dogs/Puzzle/PuzzleCanvas";
import ReplayCanvas from "@/components/Dogs/Replay/ReplayCanvas";
import MobilePortraitLock from "@/components/mobile/MobilePortraitLock";
import { useIsMobile } from "@/hooks/useIsMobile";
import type {
  ReplayAction,
  ReplayActionGroup,
  ReplayBrushSettings,
  ReplayRegionData,
} from "@/components/Dogs/Replay/types";

type Lesson = {
  id?: string;
  title: string;
  category_slug: string;
  steps: {
    frank: string;
    image: string;
  }[];
};

type DogLessonDraft = {
  version: 1;
  slug: string;
  lang: Lang;
  savedAt: number;
  currentStepIndex: number;
  hasStarted: boolean;
  showColorizer: boolean;
  hasCompletedFirstColoring: boolean;
  artworkSaved: boolean;
  hasUnsavedChanges: boolean;
  brushSize: number;
  brushColor: string;
  brushOpacity: number;
  brushStyle:
    | "normal"
    | "smooth"
    | "sparkle"
    | "rainbow"
    | "chameleon"
    | "gradient"
    | "neon"
    | "watercolor";
  isEraser: boolean;
  seeds: ColorSeed[];
  drawingDataUrl: string;
  colorDataUrl: string;
  pawDataUrl: string;
};

function getDogLessonDraftKey(slug: string, lang: Lang) {
  return `dog-lesson-draft:${lang}:${slug}`;
}

const FRANK_POSES = [
  "chew-brush",
  "chew-pen",
  "draw",
  "eat-brush",
  "lie",
  "looks-left",
  "paint",
  "run",
  "welcome-bye",
] as const;

const FIBI_POSES = [
  "chewing-eraser",
  "draw",
  "excited",
  "lie",
  "looks-right",
  "shows-drawing",
  "siting",
  "watch",
  "welcome",
] as const;

async function drawCanvasSnapshot(canvas: HTMLCanvasElement | null, dataUrl: string) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!dataUrl) return;

  await new Promise<void>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    image.onerror = () => reject(new Error("Failed to restore lesson draft image"));
    image.src = dataUrl;
  });
}

type MobileColorState = {
  hue: number;
  darkness: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = hue / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;

  if (hPrime >= 0 && hPrime < 1) {
    r = c;
    g = x;
  } else if (hPrime < 2) {
    r = x;
    g = c;
  } else if (hPrime < 3) {
    g = c;
    b = x;
  } else if (hPrime < 4) {
    g = x;
    b = c;
  } else if (hPrime < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const m = l - c / 2;
  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): MobileColorState {
  const cleaned = hex.replace("#", "");
  const normalized = cleaned.length === 3
    ? cleaned.split("").map((char) => `${char}${char}`).join("")
    : cleaned.padEnd(6, "0").slice(0, 6);

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) {
      hue = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      hue = 60 * ((b - r) / delta + 2);
    } else {
      hue = 60 * ((r - g) / delta + 4);
    }
  }

  return {
    hue: (hue + 360) % 360,
    darkness: Math.round((1 - lightness) * 100),
  };
}

function buildColorFromState(state: MobileColorState) {
  return hslToHex(state.hue, 100, clamp(100 - state.darkness, 18, 82));
}

// DogImage component: PNG 10s → optional animated WebP/GIF 5s → PNG …
function DogImage({
  name,
  pose,
  speech,
  size = 220,
}: {
  name: "fibi" | "frank";
  pose: string; // one of your pose filenames without extension
  speech?: React.ReactNode;
  size?: number;
}) {
  const [showAnim, setShowAnim] = useState(false);
  const [animIdx, setAnimIdx] = useState(0);

  // используем постер из Supabase storage в качестве базовой PNG-картинки и GIF-анимацию
  const base = buildSupabasePublicUrl("characters", `dogs/${name}/anims`);
  const pngSrc = `${base}/${pose}-poster.png`;

  const animList: string[] = [`${base}/${pose}.gif`];
  const animCount = animList.length;

  // Alternate only if there is any animation for this pose
  useEffect(() => {
    let t: number | undefined;
    let running = true;
    const loop = () => {
      setShowAnim(false);
      t = window.setTimeout(() => {
        if (!running) return;
        if (animCount > 0) {
          setShowAnim(true);
          setAnimIdx((prev) => (prev + 1) % animCount);
        }
        t = window.setTimeout(() => running && loop(), 5000);
      }, 10000);
    };
    loop();
    return () => {
      running = false;
      if (t) window.clearTimeout(t);
    };
  }, [animCount, name, pose]);

  return (
    <div className="dog-image-wrap" style={{ width: size }}>
      {!showAnim ? (
        <Image
          className="dog-image-img"
          src={pngSrc}
          alt={`${name} ${pose}`}
          width={size}
          height={size}
          unoptimized
        />
      ) : (
        <Image
          className="dog-image-img"
          src={animList[animIdx]}
          alt={`${name} ${pose} anim`}
          width={size}
          height={size}
          unoptimized
        />
      )}
      {speech ? (
        <div className="dog-bubble" data-role="speech">
          {speech}
        </div>
      ) : null}
    </div>
  );
}

function LessonPlayerDesktop() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const lang = getCurrentLang(router) as Lang;
  const dict = dictionaries[lang] || dictionaries["ru"];
  const t = dict.dogs.dogLesson;
  const seo = dict.seo.dogs.lesson;
  const { slug } = router.query;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/dog/lessons";
  const seoTitle = lesson?.title ? `${lesson.title} — ${seo.titleSuffix}` : seo.defaultTitle;
  const seoDescription = seo.defaultDescription;
  const [isLessonTranslated, setIsLessonTranslated] = useState(true);
  // --- Состояния для галереи ---
  const [showGallery, setShowGallery] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [brushSize, setBrushSize] = useState<number>(5);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  type UndoState = {
    drawing: ImageData;
    color: ImageData;
    paw: ImageData;
    seeds: ColorSeed[];
  };
  const HISTORY_LIMIT = 50;

  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const [redoStack, setRedoStack] = useState<UndoState[]>([]);
  const [brushColor, setBrushColor] = useState<string>("#000000");
  const [brushOpacity, setBrushOpacity] = useState<number>(1);
  const [brushStyle, setBrushStyle] = useState<
    | "normal"
    | "smooth"
    | "sparkle"
    | "rainbow"
    | "chameleon"
    | "gradient"
    | "neon"
    | "watercolor"
  >("normal");
  const [hasStarted, setHasStarted] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [animationMenuOpen, setAnimationMenuOpen] = useState(false);
  const [animationMode, setAnimationMode] = useState<
    "puzzle" | "flow" | "mix" | "replay" | null
  >(null);
  const [mobilePanel, setMobilePanel] = useState<
    "brushes" | "coloring" | "animate" | "save" | null
  >(null);
  const [mobileBrushColor, setMobileBrushColor] = useState<MobileColorState>(
    () => hexToHsl("#000000"),
  );
  const [replayAutoExport, setReplayAutoExport] = useState<
    "video" | "gif" | null
  >(null);
  const [artworkSaved, setArtworkSaved] = useState(false);
  const [hasCompletedFirstColoring, setHasCompletedFirstColoring] = useState(false);
  const [mobileFibiAdviceReady, setMobileFibiAdviceReady] = useState(false);
  const [mobileFibiFact, setMobileFibiFact] = useState("");
  const [replayExportDone, setReplayExportDone] = useState<{
    video: boolean;
    gif: boolean;
  }>({ video: false, gif: false });
  const [, setReplayRevision] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mobileFillTooltip, setMobileFillTooltip] = useState<string | null>(null);
  const [colorSeedCount, setColorSeedCount] = useState(0);
  const draftSaveTimeoutRef = useRef<number | null>(null);
  const restoredDraftKeyRef = useRef<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const regionDataRef = useRef<ReturnType<typeof buildRegionMap> | null>(null);
  // stored paw seeds
  const seedsRef = useRef<ColorSeed[]>([]);
  // кэш размеров регионов (чтобы не считать каждый раз)
  const regionSizeCacheRef = useRef<Map<number, number>>(new Map());

  const [showColorizer, setShowColorizer] = useState(false);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const colorCanvasRef = useRef<HTMLCanvasElement>(null);
  const pawOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const puzzleSourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const replayCommittedGroupsRef = useRef<ReplayActionGroup[]>([]);
  const replayRedoGroupsRef = useRef<ReplayActionGroup[]>([]);
  const replayCurrentGroupRef = useRef<ReplayActionGroup | null>(null);
  const replayGroupIdRef = useRef(1);
  const regionMapsRef = useRef<Map<number, ReplayRegionData>>(new Map());
  const regionMapIdRef = useRef(1);
  const draftKey = typeof slug === "string" ? getDogLessonDraftKey(slug, lang) : null;

  const debugRenderRegions = () => {
    setHasUnsavedChanges(true);
    setHasCompletedFirstColoring(true);
    const colorCanvas = colorCanvasRef.current;
    // On tablets / touch devices we clear seed history to prevent slowdown
    const isTouchDevice =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    if (isTouchDevice) {
      seedsRef.current = [];
      setColorSeedCount(0);
      setUndoStack([]);
      setRedoStack([]);
      clearReplayHistory();
    }

    if (!colorCanvas) return;

    const ctx = colorCanvas.getContext("2d");
    if (!ctx) return;

    if (!regionDataRef.current) {
      computeRegionMap();
    }

    const regionData = regionDataRef.current;
    if (!regionData) return;

    const { regionMap, width, height } = regionData;

    // clear canvas
    ctx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);

    // distribute seeds across the canvas so waveFill spreads everywhere
    const debugSeeds: ColorSeed[] = [];

    // place roughly one seed per visual block (~2cm area)
    const STEP = 80;

    for (let by = 0; by < height; by += STEP) {
      for (let bx = 0; bx < width; bx += STEP) {
        let found = false;

        // search inside the block for a valid region pixel
        for (let y = by; y < Math.min(by + STEP, height) && !found; y++) {
          for (let x = bx; x < Math.min(bx + STEP, width) && !found; x++) {
            const idx = y * width + x;
            const regionId = regionMap[idx];

            if (regionId < 0) continue;

            const color: [number, number, number] = [
              Math.floor(Math.random() * 255),
              Math.floor(Math.random() * 255),
              Math.floor(Math.random() * 255),
            ];

            debugSeeds.push({ x, y, regionId, color });
            found = true;
          }
        }
      }
    }

    // fill regions using the same pipeline as replay
    autoColorRegions(ctx, regionData, debugSeeds);

    // Log replay actions on next tick to preserve chronological order after stroke commits.
    const seedsSnapshot = debugSeeds.map((seed) => ({
      x: seed.x,
      y: seed.y,
      regionId: seed.regionId,
      color: [seed.color[0], seed.color[1], seed.color[2]] as [
        number,
        number,
        number,
      ],
    }));
    const regionMapSnapshot = new Int32Array(regionData.regionMap);
    const widthSnapshot = regionData.width;
    const heightSnapshot = regionData.height;

    window.setTimeout(() => {
      const regionMapId = regionMapIdRef.current++;
      regionMapsRef.current.set(regionMapId, {
        width: widthSnapshot,
        height: heightSnapshot,
        regionMap: regionMapSnapshot,
      });

      beginReplayGroup();
      appendReplayAction({
        type: "autoColorStart",
        seeds: seedsSnapshot,
        regionMapId,
      });
      commitReplayGroup();
    }, 0);
  };

  const isDrawing = useRef(false);
  const [isDrawingState, setIsDrawingState] = useState(false);
  const activePointerIdRef = useRef<number | null>(null);
  const pointerMovedRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  // Для плавных кистей: храним hue и прогресс градиента
  const hueRef = useRef(0);
  const gradientProgressRef = useRef(0);
  // previous point for light bezier smoothing
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastReplayStrokePointRef = useRef<{ x: number; y: number } | null>(
    null,
  );
  const pawImgRef = useRef<HTMLImageElement | null>(null);
  const allowNavigationRef = useRef(false);
  const leaveWarningMessage =
    lang === "he"
      ? "אם תצאו עכשיו, הציור שלא נשמר יאבד."
      : lang === "en"
        ? "If you leave now, your unsaved drawing will be lost."
        : "Если выйти сейчас, несохранённый рисунок потеряется.";
  const fillLockedMessage =
    lang === "he"
      ? "אפשר לצבוע רק אחרי שכל שלבי השיעור הושלמו."
      : lang === "en"
        ? "Coloring unlocks only after you finish every lesson step."
        : "Раскрашивание откроется только после завершения всех шагов урока.";
  const placePawsHint =
    lang === "he"
      ? "פזרו כפות צבעוניות על הקנבס ואז לחצו על הכפתור."
      : lang === "en"
        ? "Place colorful paws on the canvas, then tap the button."
        : "Расставь цветные лапки на холсте и нажми на кнопку.";
  const fibiGalleryHint =
    lang === "he"
      ? "אני יודעת הרבה על אמנים! לחצו על הכפתור פתח גלריה."
      : lang === "en"
        ? "I know a lot about artists! Tap Open Gallery."
        : "А я знаю много о художниках! Нажми на кнопку Открыть Галерею.";
  const fibiAdviceButtonLabel =
    lang === "he"
      ? "טיפ של אמן"
      : lang === "en"
        ? "Artist tip"
        : "Совет художника";
  const replayDoneLabel =
    lang === "he"
      ? "נשמר"
      : lang === "en"
        ? "Done"
        : "Сохранено";
  const savingOverlayLabel =
    lang === "he"
      ? "שומר..."
      : lang === "en"
        ? "Saving..."
        : "Сохранение...";
  const shouldWarnBeforeExit = isMobile
    ? Boolean(lesson) && currentStepIndex >= 0
    : hasUnsavedChanges;

  const confirmLessonLeave = useCallback(() => {
    if (!shouldWarnBeforeExit) {
      return true;
    }

    const confirmed = window.confirm(leaveWarningMessage);
    if (confirmed) {
      allowNavigationRef.current = true;
    }

    return confirmed;
  }, [leaveWarningMessage, shouldWarnBeforeExit]);

  const getReplayBrushSettings = (): ReplayBrushSettings => ({
    size: brushSizeRef.current,
    color: brushColorRef.current,
    opacity: brushOpacityRef.current,
    style: brushStyleRef.current,
    isEraser: isEraserRef.current,
  });

  const beginReplayGroup = useCallback(() => {
    replayCurrentGroupRef.current = {
      id: replayGroupIdRef.current++,
      actions: [],
    };
  }, []);

  const appendReplayAction = useCallback((action: ReplayAction) => {
    if (!replayCurrentGroupRef.current) {
      beginReplayGroup();
    }

    replayCurrentGroupRef.current?.actions.push(action);
  }, [beginReplayGroup]);

  const commitReplayGroup = useCallback(() => {
    const group = replayCurrentGroupRef.current;
    replayCurrentGroupRef.current = null;

    if (!group || group.actions.length === 0) return;

    replayCommittedGroupsRef.current.push(group);
    replayRedoGroupsRef.current = [];
    setReplayRevision((prev) => prev + 1);
  }, []);

  const discardReplayGroup = useCallback(() => {
    replayCurrentGroupRef.current = null;
  }, []);

  const undoReplayGroup = () => {
    const last = replayCommittedGroupsRef.current.pop();
    if (!last) return;
    replayRedoGroupsRef.current.push(last);
    setReplayRevision((prev) => prev + 1);
  };

  const redoReplayGroup = () => {
    const group = replayRedoGroupsRef.current.pop();
    if (!group) return;
    replayCommittedGroupsRef.current.push(group);
    setReplayRevision((prev) => prev + 1);
  };

  const captureCanvasState = (): UndoState | null => {
    const drawingCanvas = drawingCanvasRef.current;
    const colorCanvas = colorCanvasRef.current;
    const pawCanvas = pawOverlayCanvasRef.current;

    const dCtx = drawingCanvas?.getContext("2d");
    const cCtx = colorCanvas?.getContext("2d");
    const pCtx = pawCanvas?.getContext("2d");

    if (
      !drawingCanvas ||
      !colorCanvas ||
      !pawCanvas ||
      !dCtx ||
      !cCtx ||
      !pCtx
    ) {
      return null;
    }

    return {
      drawing: dCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height),
      color: cCtx.getImageData(0, 0, colorCanvas.width, colorCanvas.height),
      paw: pCtx.getImageData(0, 0, pawCanvas.width, pawCanvas.height),
      seeds: [...seedsRef.current],
    };
  };

  const restoreCanvasState = (state: UndoState) => {
    const drawingCanvas = drawingCanvasRef.current;
    const colorCanvas = colorCanvasRef.current;
    const pawCanvas = pawOverlayCanvasRef.current;

    const dCtx = drawingCanvas?.getContext("2d");
    const cCtx = colorCanvas?.getContext("2d");
    const pCtx = pawCanvas?.getContext("2d");

    if (
      !drawingCanvas ||
      !colorCanvas ||
      !pawCanvas ||
      !dCtx ||
      !cCtx ||
      !pCtx
    ) {
      return false;
    }

    dCtx.putImageData(state.drawing, 0, 0);
    cCtx.putImageData(state.color, 0, 0);
    pCtx.putImageData(state.paw, 0, 0);
    seedsRef.current = [...state.seeds];
    setColorSeedCount(state.seeds.length);
    setHasUnsavedChanges(true);
    return true;
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    const currentState = captureCanvasState();

    if (!restoreCanvasState(previous)) {
      return;
    }

    setUndoStack((prev) => prev.slice(0, -1));
    if (currentState) {
      setRedoStack((prev) => [...prev, currentState]);
    }
    undoReplayGroup();
  };

  const handleRedo = () => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;

      const state = prevRedo[prevRedo.length - 1];
      const currentState = captureCanvasState();

      if (!restoreCanvasState(state)) {
        return prevRedo;
      }

      if (currentState) {
        setUndoStack((prevUndo) => {
          const next = [...prevUndo, currentState];
          return next.slice(-HISTORY_LIMIT);
        });
      }
      redoReplayGroup();

      return prevRedo.slice(0, -1);
    });
  };

  const clearReplayHistory = useCallback(() => {
    replayCommittedGroupsRef.current = [];
    replayRedoGroupsRef.current = [];
    replayCurrentGroupRef.current = null;
    replayGroupIdRef.current = 1;
    regionMapsRef.current.clear();
    regionMapIdRef.current = 1;
    setReplayRevision((prev) => prev + 1);
  }, []);

  const persistLessonDraft = useCallback(async () => {
    if (!draftKey || !lesson) return;

    const drawingCanvas = drawingCanvasRef.current;
    const colorCanvas = colorCanvasRef.current;
    const pawCanvas = pawOverlayCanvasRef.current;
    if (!drawingCanvas || !colorCanvas || !pawCanvas) return;

    const draft: DogLessonDraft = {
      version: 1,
      slug: String(slug),
      lang,
      savedAt: Date.now(),
      currentStepIndex: Math.max(0, currentStepIndex),
      hasStarted,
      showColorizer,
      hasCompletedFirstColoring,
      artworkSaved,
      hasUnsavedChanges,
      brushSize,
      brushColor,
      brushOpacity,
      brushStyle,
      isEraser,
      seeds: [...seedsRef.current],
      drawingDataUrl: drawingCanvas.toDataURL("image/png"),
      colorDataUrl: colorCanvas.toDataURL("image/png"),
      pawDataUrl: pawCanvas.toDataURL("image/png"),
    };

    try {
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (error) {
      console.error("Failed to persist dog lesson draft", error);
    }
  }, [
    artworkSaved,
    brushColor,
    brushOpacity,
    brushSize,
    brushStyle,
    currentStepIndex,
    draftKey,
    hasCompletedFirstColoring,
    hasStarted,
    hasUnsavedChanges,
    isEraser,
    lang,
    lesson,
    showColorizer,
    slug,
  ]);

  const scheduleLessonDraftSave = useCallback((delay = 250) => {
    if (!draftKey || !lesson) return;

    if (draftSaveTimeoutRef.current !== null) {
      window.clearTimeout(draftSaveTimeoutRef.current);
    }

    draftSaveTimeoutRef.current = window.setTimeout(() => {
      draftSaveTimeoutRef.current = null;
      void persistLessonDraft();
    }, delay);
  }, [draftKey, lesson, persistLessonDraft]);

  useEffect(() => {
    const img = new window.Image();
    img.src = "/dog/paw.svg";
    pawImgRef.current = img;

    return () => {
      if (draftSaveTimeoutRef.current !== null) {
        window.clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!shouldWarnBeforeExit) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = leaveWarningMessage;
      return leaveWarningMessage;
    };

    const handleRouteChangeStart = (url: string) => {
      if (allowNavigationRef.current || !shouldWarnBeforeExit || url === router.asPath) {
        return;
      }

      if (confirmLessonLeave()) {
        return;
      }

      router.events.emit("routeChangeError");
      throw new Error("Navigation aborted due to unsaved drawing");
    };

    const resetAllowNavigation = () => {
      allowNavigationRef.current = false;
    };

    const originalBeforePopState = router.beforePopState;
    router.beforePopState(({ as }) => {
      if (allowNavigationRef.current || !shouldWarnBeforeExit || as === router.asPath) {
        return true;
      }

      if (confirmLessonLeave()) {
        return true;
      }

      return false;
    });

    window.addEventListener("beforeunload", handleBeforeUnload);
    router.events.on("routeChangeStart", handleRouteChangeStart);
    router.events.on("routeChangeComplete", resetAllowNavigation);
    router.events.on("routeChangeError", resetAllowNavigation);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      router.events.off("routeChangeStart", handleRouteChangeStart);
      router.events.off("routeChangeComplete", resetAllowNavigation);
      router.events.off("routeChangeError", resetAllowNavigation);
      router.beforePopState(() => true);
      void originalBeforePopState;
    };
  }, [confirmLessonLeave, leaveWarningMessage, router, shouldWarnBeforeExit]);

  useEffect(() => {
    const flushDraft = () => {
      void persistLessonDraft();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushDraft();
      }
    };

    window.addEventListener("pagehide", flushDraft);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushDraft);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [persistLessonDraft]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.body.classList.toggle("dog-lesson-mobile-page", isMobile);

    return () => {
      document.body.classList.remove("dog-lesson-mobile-page");
    };
  }, [isMobile]);

  useEffect(() => {
    if (!mobileFillTooltip) return;

    const timeoutId = window.setTimeout(() => {
      setMobileFillTooltip(null);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [mobileFillTooltip]);

  useEffect(() => {
    const lessonFinished = lesson
      ? currentStepIndex === lesson.steps.length - 1
      : false;
    const shouldShowMobileFibi = isMobile && hasCompletedFirstColoring && lessonFinished;
    if (!shouldShowMobileFibi) {
      setMobileFibiAdviceReady(false);
      setMobileFibiFact("");
      return;
    }

    setMobileFibiFact("");
    const timerId = window.setTimeout(() => {
      setMobileFibiAdviceReady(true);
    }, 60_000);

    return () => window.clearTimeout(timerId);
  }, [currentStepIndex, hasCompletedFirstColoring, isMobile, lesson]);

  const computeRegionMap = useCallback(() => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;

    const ctx = drawingCanvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(
      0,
      0,
      drawingCanvas.width,
      drawingCanvas.height,
    );

    regionDataRef.current = buildRegionMap(imageData);

    devLog(
      "Region map built:",
      regionDataRef.current?.regionCount,
      "regions",
    );
  }, []);

  const handleColorize = () => {
    setHasUnsavedChanges(true);
    setShowColorizer(true);
    setHasCompletedFirstColoring(true);
    if (!regionDataRef.current) {
      computeRegionMap();
    }

    const colorCanvas = colorCanvasRef.current;
    const ctx = colorCanvas?.getContext("2d");

    if (!ctx || !regionDataRef.current) return;

    if (seedsRef.current.length > 0) {
      // fill all placed paw seeds using the same shared pipeline as replay
      autoColorRegions(ctx, regionDataRef.current, seedsRef.current);
    }
    // убрать лапки после начала раскрашивания
    const pawCanvas = pawOverlayCanvasRef.current;
    const pawCtx = pawCanvas?.getContext("2d");

    if (pawCtx && pawCanvas) {
      pawCtx.clearRect(0, 0, pawCanvas.width, pawCanvas.height);
    }

    const seedsSnapshot = seedsRef.current.map((seed) => ({
      x: seed.x,
      y: seed.y,
      regionId: seed.regionId,
      color: [seed.color[0], seed.color[1], seed.color[2]] as [
        number,
        number,
        number,
      ],
    }));
    const regionData = regionDataRef.current;
    const regionMapSnapshot = new Int32Array(regionData.regionMap);
    const widthSnapshot = regionData.width;
    const heightSnapshot = regionData.height;

    // Log replay actions on next tick to avoid ordering races with stroke group commits.
    window.setTimeout(() => {
      const regionMapId = regionMapIdRef.current++;
      regionMapsRef.current.set(regionMapId, {
        width: widthSnapshot,
        height: heightSnapshot,
        regionMap: regionMapSnapshot,
      });

      beginReplayGroup();
      appendReplayAction({
        type: "autoColorStart",
        seeds: seedsSnapshot,
        regionMapId,
      });
      appendReplayAction({ type: "clearPaws" });
      commitReplayGroup();
    }, 0);

    // здесь позже запустим анимацию заливки
  };

  // Helper to draw a paw marker for a color seed
  const drawSeedPaw = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: [number, number, number],
  ) => {
    const img = pawImgRef.current;
    if (!img || !img.complete) return;

    const [r, g, b] = color;
    const size = 26;

    ctx.save();
    ctx.translate(x, y);

    // small natural paw rotation (-18° .. +18°)
    const angle = (Math.random() - 0.5) * 0.6;
    ctx.rotate(angle);

    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;

    const offCtx = off.getContext("2d");
    if (!offCtx) {
      ctx.restore();
      return;
    }

    // рисуем SVG
    offCtx.drawImage(img, 0, 0, size, size);

    // перекрашиваем лапку
    offCtx.globalCompositeOperation = "source-in";
    offCtx.fillStyle = `rgb(${r},${g},${b})`;
    offCtx.fillRect(0, 0, size, size);

    ctx.drawImage(off, -size / 2, -size / 2);

    ctx.restore();
  }, []);

  // if user clicks on a line or anti-aliased border, try to find nearest fillable region
  const findNearestRegion = (
    x: number,
    y: number,
    regionMap: Int32Array,
    width: number,
    height: number,
    radius = 4,
  ) => {
    const start = y * width + x;
    if (regionMap[start] >= 0) return { x, y, regionId: regionMap[start] };

    for (let r = 1; r <= radius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

          const idx = ny * width + nx;
          const region = regionMap[idx];

          if (region >= 0) {
            return { x: nx, y: ny, regionId: region };
          }
        }
      }
    }

    return null;
  };

  const placeColorSeedAt = useCallback((x: number, y: number) => {
    // раскраска доступна только после нажатия "Раскрасить"
    // и должна быть полностью отключена в режиме пазла
    if (!showColorizer || animationMode === "puzzle") return;

    // ignore click if user is currently drawing
    if (isDrawing.current) return;
    const canvas = colorCanvasRef.current;
    if (!canvas) return;

    // ensure region map exists
    if (!regionDataRef.current) {
      computeRegionMap();
    }

    if (!regionDataRef.current) return;

    const localX = Math.max(
      0,
      Math.min(regionDataRef.current.width - 1, Math.floor(x)),
    );
    const localY = Math.max(
      0,
      Math.min(regionDataRef.current.height - 1, Math.floor(y)),
    );

    const { width, regionMap } = regionDataRef.current;

    // --- Use nearest region search ---
    const nearest = findNearestRegion(
      localX,
      localY,
      regionMap,
      width,
      regionDataRef.current.height,
    );
    if (!nearest) return;

    const { x: seedX, y: seedY, regionId } = nearest;
    const hex = brushColorRef.current;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const color: [number, number, number] = [r, g, b];
    beginReplayGroup();
    setHasUnsavedChanges(true);

    // --- проверяем, не является ли область очень маленькой ---
    let regionSize = regionSizeCacheRef.current.get(regionId);

    if (regionSize === undefined) {
      const { regionMap } = regionDataRef.current!;
      let count = 0;

      for (let i = 0; i < regionMap.length; i++) {
        if (regionMap[i] === regionId) count++;
      }

      regionSize = count;
      regionSizeCacheRef.current.set(regionId, regionSize);
    }

    const TINY_REGION_THRESHOLD = 12;

    if (regionSize < TINY_REGION_THRESHOLD) {
      const colorCanvas = colorCanvasRef.current;
      const ctx = colorCanvas?.getContext("2d");

      if (ctx) {
        paintRegionFast(ctx, regionDataRef.current!, regionId, color);
        appendReplayAction({
          type: "fillRegion",
          regionId,
          color,
          seedX,
          seedY,
        });
      }
    }

    // save undo state before placing a new color seed
    const drawingCanvas = drawingCanvasRef.current;
    const colorCanvas = colorCanvasRef.current;
    const pawCanvas = pawOverlayCanvasRef.current;

    if (drawingCanvas && colorCanvas && pawCanvas) {
      const dCtx = drawingCanvas.getContext("2d")!;
      const cCtx = colorCanvas.getContext("2d")!;
      const pCtx = pawCanvas.getContext("2d")!;

      setRedoStack([]);
      setUndoStack((prev) => {
        const next = [
          ...prev,
          {
            drawing: dCtx.getImageData(
              0,
              0,
              drawingCanvas.width,
              drawingCanvas.height,
            ),
            color: cCtx.getImageData(
              0,
              0,
              colorCanvas.width,
              colorCanvas.height,
            ),
            paw: pCtx.getImageData(0, 0, pawCanvas.width, pawCanvas.height),
            seeds: [...seedsRef.current],
          },
        ];
        return next.slice(-HISTORY_LIMIT); // ограничиваем историю
      });
    }

    // store seed
    seedsRef.current.push({ x: seedX, y: seedY, regionId, color });
    setColorSeedCount(seedsRef.current.length);

    // ограничиваем количество лапок чтобы планшеты не тормозили
    const MAX_SEEDS = 80;
    if (seedsRef.current.length > MAX_SEEDS) {
      seedsRef.current.shift();
    }

    // draw paw marker on overlay canvas with bounce animation
    const pawOverlay = pawOverlayCanvasRef.current;
    const pawCtx = pawOverlay?.getContext("2d");

    if (pawCtx) {
      // draw the paw once (permanent marker)
      drawSeedPaw(pawCtx, seedX, seedY, color);
      appendReplayAction({
        type: "pawPlace",
        x: seedX,
        y: seedY,
        regionId,
        color,
      });
      commitReplayGroup();

      const bounceFrames = 8;
      let frame = 0;

      // ограничиваем количество ripple анимаций
      const MAX_RIPPLES = 5;

      if (!(window as any)._activeRipples) {
        (window as any)._activeRipples = 0;
      }

      if ((window as any)._activeRipples >= MAX_RIPPLES) return;

      (window as any)._activeRipples++;

      const animate = () => {
        // very soft ripple wave only (no clearing of previous paws)
        const rippleRadius = frame * 4;

        pawCtx.save();
        pawCtx.beginPath();
        pawCtx.arc(seedX, seedY, rippleRadius, 0, Math.PI * 2);
        pawCtx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.1 - frame * 0.02})`;
        pawCtx.lineWidth = 1;
        pawCtx.stroke();
        pawCtx.restore();

        frame++;
        if (frame <= bounceFrames) {
          requestAnimationFrame(animate);
        } else {
          (window as any)._activeRipples--;
        }
      };

      animate();
      return;
    }

    discardReplayGroup();
  }, [
    animationMode,
    appendReplayAction,
    beginReplayGroup,
    commitReplayGroup,
    computeRegionMap,
    discardReplayGroup,
    drawSeedPaw,
    showColorizer,
  ]);

  const [randomArtFact, setRandomArtFact] = useState("");

  // --- Fibi intro phrase logic ---
  const introVariants = useMemo(
    () => [
      t.introVariants.fibiIntroSecret,
      t.introVariants.fibiIntroListen,
      t.introVariants.fibiIntroTheySay,
      t.introVariants.fibiIntroDidYouKnow,
      t.introVariants.fibiIntroPsst,
      t.introVariants.fibiIntroGuessWhat,
    ],
    [t.introVariants],
  );
  const lastIntroRef = useRef<number | null>(null);
  const [fibiIntro, setFibiIntro] = useState(introVariants[0]);

  useEffect(() => {
    setRandomArtFact(getRandomArtFact(lang));

    // choose intro phrase different from the previous one
    let nextIndex = Math.floor(Math.random() * introVariants.length);
    if (lastIntroRef.current !== null && introVariants.length > 1) {
      while (nextIndex === lastIntroRef.current) {
        nextIndex = Math.floor(Math.random() * introVariants.length);
      }
    }
    lastIntroRef.current = nextIndex;
    setFibiIntro(introVariants[nextIndex]);
  }, [currentStepIndex, introVariants, lang]);

  // refs для brushSize, brushColor, brushStyle, isEraser
  const brushSizeRef = useRef(brushSize);
  const brushColorRef = useRef(brushColor);
  const brushOpacityRef = useRef(brushOpacity);
  const brushStyleRef = useRef(brushStyle);
  const isEraserRef = useRef(isEraser);
  // useEffect для обновления ref при изменении brushSize
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);
  // useEffect для обновления ref при изменении brushColor
  useEffect(() => {
    brushColorRef.current = brushColor;
  }, [brushColor]);
  useEffect(() => {
    setMobileBrushColor(hexToHsl(brushColor));
  }, [brushColor]);
  useEffect(() => {
    brushOpacityRef.current = brushOpacity;
  }, [brushOpacity]);
  // useEffect для обновления ref при изменении brushStyle
  useEffect(() => {
    brushStyleRef.current = brushStyle;
  }, [brushStyle]);
  // useEffect для обновления ref при изменении isEraser
  useEffect(() => {
    isEraserRef.current = isEraser;
  }, [isEraser]);
  // Применяем настройки кисти один раз при маунте
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    applyBrushSettings(ctx);
  }, []);
  // Функция для применения текущих настроек кисти к контексту
  const applyBrushSettings = (ctx: CanvasRenderingContext2D) => {
    // base width
    ctx.lineWidth = brushSizeRef.current;

    // enable canvas smoothing so edges are less pixelated
    ctx.imageSmoothingEnabled = true;

    const style = brushStyleRef.current;
    const color = brushColorRef.current;

    // Always use round geometry to avoid sharp pixel corners
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.globalAlpha = brushOpacityRef.current;
    ctx.strokeStyle = color;

    // watercolor / smooth brushes keep extra softness
    if (style === "watercolor" || style === "smooth") {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
    }
  };

  const drawStepOnCanvas = useCallback((stepIndex: number) => {
    if (
      !lesson ||
      !canvasRef.current ||
      stepIndex < 0 ||
      stepIndex >= lesson.steps.length
    )
      return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawImage = (src: string, alpha: number): Promise<void> => {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => {
          ctx.globalAlpha = alpha;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve();
        };
      });
    };

    const drawAllSteps = async () => {
      for (let i = 0; i <= stepIndex; i++) {
        const step = lesson.steps[i];
        const alpha = i === stepIndex ? 1.0 : 0.3;
        await drawImage(step.image, alpha);
      }
    };

    drawAllSteps();
  }, [lesson]);

  useEffect(() => {
    if (!slug || typeof slug !== "string") return;

    const fetchLesson = async () => {
      const response = await fetch(`/api/dog-lesson?slug=${encodeURIComponent(slug)}&lang=${lang}`);
      const payload = await response.json() as { lesson?: Lesson; translated?: boolean; error?: string };

      if (!response.ok || !payload.lesson) {
        console.error("Ошибка загрузки урока:", payload.error);
        return;
      }

      const translatedLesson = payload.lesson;
      if (!translatedLesson.category_slug) {
        console.error("Ошибка: отсутствует category_slug в данных урока");
        return;
      }
      setLesson(translatedLesson);
      setIsLessonTranslated(Boolean(payload.translated));
      setBrushSize(5);
      setHasUnsavedChanges(false);
      setColorSeedCount(0);
      setArtworkSaved(false);
      setHasCompletedFirstColoring(false);
      setReplayExportDone({ video: false, gif: false });
      clearReplayHistory();
      restoredDraftKeyRef.current = null;
    };

    fetchLesson().catch((error) => {
      console.error("Ошибка загрузки урока:", error);
    });
  }, [clearReplayHistory, lang, slug]);

  useEffect(() => {
    if (!lesson || !draftKey || restoredDraftKeyRef.current === draftKey) {
      return;
    }

    restoredDraftKeyRef.current = draftKey;

    const restoreDraft = async () => {
      const drawingCanvas = drawingCanvasRef.current;
      const colorCanvas = colorCanvasRef.current;
      const pawCanvas = pawOverlayCanvasRef.current;
      if (!drawingCanvas || !colorCanvas || !pawCanvas) return;

      let draft: DogLessonDraft | null = null;
      try {
        const rawDraft = window.localStorage.getItem(draftKey);
        if (rawDraft) {
          draft = JSON.parse(rawDraft) as DogLessonDraft;
        }
      } catch (error) {
        console.error("Failed to parse dog lesson draft", error);
      }

      const safeStepIndex = draft
        ? Math.min(Math.max(draft.currentStepIndex, 0), Math.max(lesson.steps.length - 1, 0))
        : 0;

      setCurrentStepIndex(safeStepIndex);
      drawStepOnCanvas(safeStepIndex);

      if (!draft) {
        return;
      }

      setHasStarted(draft.hasStarted);
      setShowColorizer(draft.showColorizer);
      setHasCompletedFirstColoring(draft.hasCompletedFirstColoring);
      setArtworkSaved(draft.artworkSaved);
      setHasUnsavedChanges(draft.hasUnsavedChanges);
      setBrushSize(draft.brushSize);
      setBrushColor(draft.brushColor);
      setBrushOpacity(draft.brushOpacity);
      setBrushStyle(draft.brushStyle);
      setIsEraser(draft.isEraser);
      seedsRef.current = [...draft.seeds];
      setColorSeedCount(draft.seeds.length);
      regionDataRef.current = null;

      try {
        await Promise.all([
          drawCanvasSnapshot(drawingCanvas, draft.drawingDataUrl),
          drawCanvasSnapshot(colorCanvas, draft.colorDataUrl),
          drawCanvasSnapshot(pawCanvas, draft.pawDataUrl),
        ]);
      } catch (error) {
        console.error("Failed to restore dog lesson draft", error);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void restoreDraft();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftKey, drawStepOnCanvas, lesson]);

  useEffect(() => {
    if (!lesson || !draftKey || restoredDraftKeyRef.current !== draftKey) {
      return;
    }

    scheduleLessonDraftSave();
  }, [draftKey, lesson, scheduleLessonDraftSave]);

  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const getCoordinates = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const draw = (e: PointerEvent) => {
      if (
        !isDrawing.current ||
        !ctx ||
        activePointerIdRef.current === null ||
        e.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

      e.preventDefault();
      // user is dragging → switch cursor to pencil
      if (!isDrawingState) {
        setIsDrawingState(true);
      }
      const { x, y } = getCoordinates(e.clientX, e.clientY);
      const pointerStart = pointerStartRef.current;
      if (pointerStart) {
        const travel = Math.hypot(x - pointerStart.x, y - pointerStart.y);
        if (travel > 3) {
          pointerMovedRef.current = true;
        }
      }
      const lastReplayPoint = lastReplayStrokePointRef.current;
      if (!lastReplayPoint) {
        appendReplayAction({
          type: "strokePoint",
          x,
          y,
        });
        lastReplayStrokePointRef.current = { x, y };
      } else {
        const dxReplay = x - lastReplayPoint.x;
        const dyReplay = y - lastReplayPoint.y;
        const replayDistance = Math.hypot(dxReplay, dyReplay);

        if (replayDistance > 2) {
          appendReplayAction({
            type: "strokePoint",
            x,
            y,
          });
          lastReplayStrokePointRef.current = { x, y };
        }
      }
      // if eraser is active, also erase from the color canvas
      const colorCanvas = colorCanvasRef.current;
      const colorCtx = colorCanvas?.getContext("2d");

      const erasing = isEraserRef.current;

      ctx.globalCompositeOperation = erasing
        ? "destination-out"
        : "source-over";

      if (colorCtx && erasing) {
        colorCtx.globalCompositeOperation = "destination-out";
        colorCtx.lineWidth = brushSizeRef.current;
        colorCtx.lineJoin = "round";
        colorCtx.lineCap = "round";
      }
      applyBrushSettings(ctx);

      // --- Обновляем hue и gradientProgress для плавных кистей ---
      hueRef.current = (hueRef.current + 1) % 360;
      gradientProgressRef.current = (gradientProgressRef.current + 0.01) % 1;

      // Используем style и color из ref
      const style = brushStyleRef.current;
      const color = brushColorRef.current;

      // --- Very light Bezier smoothing for drawn lines ---
      const prev = lastPointRef.current;
      if (prev) {
        // Interpolate intermediate points to prevent gaps in fast moves
        const dx = x - prev.x;
        const dy = y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // dynamic taper for normal brush (line narrows at stroke end)
        const styleNow = brushStyleRef.current;
        if (styleNow === "smooth" || styleNow === "normal") {
          const base = brushSizeRef.current;
          const speedFactor = Math.min(dist * 0.05, 0.6);
          const dynamicWidth = base * (1 - speedFactor);
          ctx.lineWidth = Math.max(base * 0.35, dynamicWidth);
        }

        const step = Math.max(1, brushSizeRef.current * 0.4);
        const segments = Math.ceil(dist / step);

        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const ix = prev.x + dx * t;
          const iy = prev.y + dy * t;

          ctx.lineTo(ix, iy);
        }

        if (style === "sparkle") {
          for (let i = 0; i < 5; i++) {
            const offsetX = Math.random() * 10 - 5;
            const offsetY = Math.random() * 10 - 5;
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.beginPath();
            ctx.arc(
              x + offsetX,
              y + offsetY,
              1 + Math.random() * 1.5,
              0,
              2 * Math.PI,
            );
            ctx.fill();
          }
        } else if (style === "rainbow") {
          ctx.strokeStyle = `hsl(${hueRef.current}, 100%, 50%)`;
          ctx.shadowBlur = 0;
          ctx.shadowColor = "transparent";
        } else if (style === "chameleon") {
          ctx.strokeStyle = `hsl(${(hueRef.current + 180) % 360}, 70%, 50%)`;
        } else if (style === "gradient") {
          const r = Math.floor(
            255 * (1 - gradientProgressRef.current) +
              100 * gradientProgressRef.current,
          );
          const g = Math.floor(
            100 * (1 - gradientProgressRef.current) +
              200 * gradientProgressRef.current,
          );
          const b = Math.floor(
            150 * (1 - gradientProgressRef.current) +
              255 * gradientProgressRef.current,
          );
          ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`;
        } else if (style === "neon") {
          ctx.strokeStyle = `hsl(${hueRef.current}, 100%, 70%)`;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 10;
        } else if (style === "watercolor") {
          // watercolor spreading effect

          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.strokeStyle = color;

          // base wet stroke
          ctx.globalAlpha = 0.15;
          ctx.lineWidth = brushSizeRef.current * 2.4;
          ctx.shadowColor = color;
          ctx.shadowBlur = brushSizeRef.current * 0.8;
          ctx.stroke();

          // soft diffusion layer
          ctx.globalAlpha = 0.08;
          ctx.lineWidth = brushSizeRef.current * 3.8;
          ctx.shadowBlur = brushSizeRef.current * 1.8;
          ctx.stroke();

          // outer water bloom
          ctx.globalAlpha = 0.04;
          ctx.lineWidth = brushSizeRef.current * 5.5;
          ctx.shadowBlur = brushSizeRef.current * 3;
          ctx.stroke();

          // pigment diffusion particles
          for (let i = 0; i < 8; i++) {
            const dx = x + (Math.random() - 0.5) * brushSizeRef.current * 4;
            const dy = y + (Math.random() - 0.5) * brushSizeRef.current * 4;

            ctx.globalAlpha = 0.03 + Math.random() * 0.05;

            ctx.beginPath();
            ctx.arc(
              dx,
              dy,
              Math.random() * brushSizeRef.current * 0.7,
              0,
              Math.PI * 2,
            );

            ctx.fillStyle = color;
            ctx.fill();
          }
        } else {
          ctx.shadowBlur = 0; // Disable any shadow for normal brush
        }

        ctx.stroke();
        if (colorCtx && erasing && prev) {
          colorCtx.beginPath();
          colorCtx.moveTo(prev.x, prev.y);
          colorCtx.lineTo(x, y);
          colorCtx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(x, y);
        lastPointRef.current = { x, y };
      } else {
        ctx.lineTo(x, y);
        if (style === "sparkle") {
          for (let i = 0; i < 5; i++) {
            const offsetX = Math.random() * 10 - 5;
            const offsetY = Math.random() * 10 - 5;
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.beginPath();
            ctx.arc(
              x + offsetX,
              y + offsetY,
              1 + Math.random() * 1.5,
              0,
              2 * Math.PI,
            );
            ctx.fill();
          }
        } else if (style === "rainbow") {
          ctx.strokeStyle = `hsl(${hueRef.current}, 100%, 50%)`;
          ctx.shadowBlur = 0;
          ctx.shadowColor = "transparent";
        } else if (style === "chameleon") {
          ctx.strokeStyle = `hsl(${(hueRef.current + 180) % 360}, 70%, 50%)`;
        } else if (style === "gradient") {
          const r = Math.floor(
            255 * (1 - gradientProgressRef.current) +
              100 * gradientProgressRef.current,
          );
          const g = Math.floor(
            100 * (1 - gradientProgressRef.current) +
              200 * gradientProgressRef.current,
          );
          const b = Math.floor(
            150 * (1 - gradientProgressRef.current) +
              255 * gradientProgressRef.current,
          );
          ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`;
        } else if (style === "neon") {
          ctx.strokeStyle = `hsl(${hueRef.current}, 100%, 70%)`;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 10;
        } else if (style === "watercolor") {
          // watercolor spreading effect

          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.strokeStyle = color;

          // base wet stroke
          ctx.globalAlpha = 0.15;
          ctx.lineWidth = brushSizeRef.current * 2.4;
          ctx.shadowColor = color;
          ctx.shadowBlur = brushSizeRef.current * 0.8;
          ctx.stroke();

          // soft diffusion layer
          ctx.globalAlpha = 0.08;
          ctx.lineWidth = brushSizeRef.current * 3.8;
          ctx.shadowBlur = brushSizeRef.current * 1.8;
          ctx.stroke();

          // outer water bloom
          ctx.globalAlpha = 0.04;
          ctx.lineWidth = brushSizeRef.current * 5.5;
          ctx.shadowBlur = brushSizeRef.current * 3;
          ctx.stroke();

          // pigment diffusion particles
          for (let i = 0; i < 8; i++) {
            const dx = x + (Math.random() - 0.5) * brushSizeRef.current * 4;
            const dy = y + (Math.random() - 0.5) * brushSizeRef.current * 4;

            ctx.globalAlpha = 0.03 + Math.random() * 0.05;

            ctx.beginPath();
            ctx.arc(
              dx,
              dy,
              Math.random() * brushSizeRef.current * 0.7,
              0,
              Math.PI * 2,
            );

            ctx.fillStyle = color;
            ctx.fill();
          }
        } else {
          ctx.shadowBlur = 0; // Disable any shadow for normal brush
        }
        ctx.stroke();
        if (colorCtx && erasing) {
          colorCtx.beginPath();
          colorCtx.arc(x, y, brushSizeRef.current * 0.5, 0, Math.PI * 2);
          colorCtx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(x, y);
        lastPointRef.current = { x, y };
      }
    };

    const startDrawing = (e: PointerEvent) => {
      if (!ctx) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      setHasUnsavedChanges(true);

      // новое действие → очищаем redo
      setRedoStack([]);
      setUndoStack((prev) => {
        const drawing = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const colorCanvas = colorCanvasRef.current;
        const pawCanvas = pawOverlayCanvasRef.current;

        const color = colorCanvas
          ? colorCanvas
              .getContext("2d")!
              .getImageData(0, 0, canvas.width, canvas.height)
          : drawing;

        const paw = pawCanvas
          ? pawCanvas
              .getContext("2d")!
              .getImageData(0, 0, canvas.width, canvas.height)
          : drawing;

        const next = [
          ...prev,
          {
            drawing,
            color,
            paw,
            seeds: [...seedsRef.current],
          },
        ];
        return next.slice(-HISTORY_LIMIT);
      });
      isDrawing.current = true;
      activePointerIdRef.current = e.pointerId;
      pointerMovedRef.current = false;
      // do NOT switch cursor yet; wait until actual movement
      // while drawing we disable color click logic
      const { x, y } = getCoordinates(e.clientX, e.clientY);
      pointerStartRef.current = { x, y };
      if (typeof canvas.setPointerCapture === "function") {
        canvas.setPointerCapture(e.pointerId);
      }
      beginReplayGroup();
      appendReplayAction({
        type: "strokeStart",
        x,
        y,
        brush: getReplayBrushSettings(),
      });
      lastReplayStrokePointRef.current = { x, y };
      ctx.globalCompositeOperation = isEraserRef.current
        ? "destination-out"
        : "source-over";
      applyBrushSettings(ctx);
      ctx.beginPath();
      ctx.moveTo(x, y);
      lastPointRef.current = { x, y };
    };

    const endDrawing = (e: PointerEvent) => {
      if (
        activePointerIdRef.current !== null &&
        e.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

      e.preventDefault();
      const wasDrawing = isDrawing.current;
      const shouldPlaceColorSeed =
        wasDrawing &&
        showColorizer &&
        !pointerMovedRef.current &&
        !isEraserRef.current &&
        pointerStartRef.current;

      isDrawing.current = false;
      activePointerIdRef.current = null;
      setIsDrawingState(false);
      ctx.beginPath();
      lastPointRef.current = null;
      lastReplayStrokePointRef.current = null;
      // drawing changed → region map is no longer valid
      regionDataRef.current = null;

      if (typeof canvas.releasePointerCapture === "function") {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          // Pointer capture may already be released.
        }
      }

      if (shouldPlaceColorSeed && pointerStartRef.current) {
        discardReplayGroup();
        placeColorSeedAt(pointerStartRef.current.x, pointerStartRef.current.y);
      } else if (wasDrawing) {
        appendReplayAction({ type: "strokeEnd" });
        commitReplayGroup();
      } else {
        discardReplayGroup();
      }

      pointerStartRef.current = null;
      pointerMovedRef.current = false;
    };

    canvas.addEventListener("pointerdown", startDrawing);
    canvas.addEventListener("pointermove", draw);
    canvas.addEventListener("pointerup", endDrawing);
    canvas.addEventListener("pointercancel", endDrawing);
    canvas.addEventListener("pointerleave", endDrawing);

    return () => {
      canvas.removeEventListener("pointerdown", startDrawing);
      canvas.removeEventListener("pointermove", draw);
      canvas.removeEventListener("pointerup", endDrawing);
      canvas.removeEventListener("pointercancel", endDrawing);
      canvas.removeEventListener("pointerleave", endDrawing);
    };
  }, [
    appendReplayAction,
    beginReplayGroup,
    commitReplayGroup,
    discardReplayGroup,
    hasStarted,
    isDrawingState,
    placeColorSeedAt,
    showColorizer,
  ]);

  // --- Добавляем случайные позы для Фрэнка и Фиби ---
  const getRandomPose = (poses: string[]) =>
    poses[Math.floor(Math.random() * poses.length)];

  // Новые состояния для поз Фрэнка и Фиби
  const [frankPose, setFrankPose] = useState(getRandomPose([...FRANK_POSES]));
  const [fibiPose, setFibiPose] = useState(getRandomPose([...FIBI_POSES]));

  // Обновлять позы при смене шага
  useEffect(() => {
    setFrankPose(getRandomPose([...FRANK_POSES]));
    setFibiPose(getRandomPose([...FIBI_POSES]));
  }, [currentStepIndex]);

  const [frankSpeechOverride, setFrankSpeechOverride] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.text) {
        setFrankSpeechOverride(e.detail.text);

        // auto‑clear the message after a few seconds
        setTimeout(() => {
          setFrankSpeechOverride(null);
        }, 3500);
      }
    };

    window.addEventListener("frank-speech", handler);

    return () => {
      window.removeEventListener("frank-speech", handler);
    };
  }, []);

  useEffect(() => {
    const handlePuzzleWin = () => {
      // play victory sound
      const audio = new Audio("/sounds/you-win.mp3");
      audio.volume = 0.8;
      audio.play().catch(() => {});

      // after celebration, return to normal canvas mode
      setTimeout(() => {
        setAnimationMode(null);
      }, 2200);
    };

    window.addEventListener("puzzle-win", handlePuzzleWin);

    return () => {
      window.removeEventListener("puzzle-win", handlePuzzleWin);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const isUndo =
        (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z";

      const isRedo =
        (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z";

      if (isUndo) {
        e.preventDefault();
        const btn = document.querySelector(
          ".lesson-button img[src='/dog/backward.png']",
        )?.parentElement as HTMLButtonElement | null;

        btn?.click();
      }

      if (isRedo) {
        e.preventDefault();
        const btn = document.querySelector(
          ".lesson-button-redo",
        ) as HTMLButtonElement | null;

        btn?.click();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // --- Custom restart logic for lesson ---
  const restartLesson = () => {
    const drawingCanvas = drawingCanvasRef.current;
    const colorCanvas = colorCanvasRef.current;
    const pawCanvas = pawOverlayCanvasRef.current;

    setShowColorizer(false);

    const dCtx = drawingCanvas?.getContext("2d");
    const cCtx = colorCanvas?.getContext("2d");
    const pCtx = pawCanvas?.getContext("2d");

    if (drawingCanvas && dCtx) {
      dCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    }

    if (colorCanvas && cCtx) {
      cCtx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);
    }

    if (pawCanvas && pCtx) {
      pCtx.clearRect(0, 0, pawCanvas.width, pawCanvas.height);
    }

    setUndoStack([]);
    setRedoStack([]);
    clearReplayHistory();
    setArtworkSaved(false);
    setHasCompletedFirstColoring(false);
    setReplayExportDone({ video: false, gif: false });

    seedsRef.current = [];
    setColorSeedCount(0);
    regionDataRef.current = null;

    setCurrentStepIndex(0);
    setHasUnsavedChanges(false);

    setTimeout(() => {
      drawStepOnCanvas(0);
    }, 0);

    setShowRestartConfirm(false);
  };

  const replayActionGroups = replayCommittedGroupsRef.current.map((group) => ({
    id: group.id,
    actions: [...group.actions],
  }));

  const isLessonComplete = lesson
    ? currentStepIndex === lesson.steps.length - 1
    : false;

  const frankSpeech = frankSpeechOverride
    ? frankSpeechOverride
    : animationMenuOpen
      ? t.frankChooseAction
      : animationMode === "puzzle"
        ? t.frankPuzzle
        : showColorizer && colorSeedCount === 0
          ? placePawsHint
        : animationMode === "flow"
          ? typeof window !== "undefined" &&
            ("ontouchstart" in window || navigator.maxTouchPoints > 0)
            ? t.frankFlowTouch
            : t.frankFlowDesktop
          : animationMode === "mix"
            ? t.frankMix
            : animationMode === "replay"
              ? t.frankReplay
              : isLessonComplete
                ? `🎨 ${t.frankColor}`
                : currentStepIndex >= 0 && lesson?.steps[currentStepIndex]?.frank
                  ? lesson.steps[currentStepIndex].frank
                  : t.frankWelcome;

  const handleAdvanceLesson = () => {
    if (!lesson) return;

    if (!hasStarted) {
      setHasStarted(true);
      setCurrentStepIndex(0);
      drawStepOnCanvas(0);
      return;
    }

    if (currentStepIndex === lesson.steps.length - 1) {
      setShowRestartConfirm(true);
      return;
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < lesson.steps.length) {
      setCurrentStepIndex(nextIndex);
      drawStepOnCanvas(nextIndex);
    }
  };

  const handleLockedFillAction = () => {
    setMobileFillTooltip(fillLockedMessage);
  };

  const closeMobilePanel = () => {
    if (mobilePanel === "animate") {
      setAnimationMode(null);
      setAnimationMenuOpen(false);
    }

    setMobilePanel(null);
  };

  const closeMagicMode = () => {
    setAnimationMode(null);
    setAnimationMenuOpen(false);
    setMobilePanel(null);
  };

  const saveArtwork = async () => {
    const drawingCanvas = drawingCanvasRef.current;
    const colorCanvas = colorCanvasRef.current;
    const pawCanvas = pawOverlayCanvasRef.current;

    if (!drawingCanvas) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = drawingCanvas.width;
    tempCanvas.height = drawingCanvas.height;

    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    tempCtx.fillStyle = "#ffffff";
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    if (colorCanvas) {
      tempCtx.drawImage(colorCanvas, 0, 0);
    }

    tempCtx.drawImage(drawingCanvas, 0, 0);

    if (pawCanvas) {
      tempCtx.drawImage(pawCanvas, 0, 0);
    }

    await drawLapLapLaWatermark(tempCtx, tempCanvas);

    const link = document.createElement("a");
    link.download = `${lesson?.title || "drawing"}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
    setArtworkSaved(true);
    setHasUnsavedChanges(false);
  };

  const clearArtwork = () => {
    if (!confirm(t.confirmClear)) return;

    const drawingCanvas = drawingCanvasRef.current;
    const colorCanvas = colorCanvasRef.current;
    const pawCanvas = pawOverlayCanvasRef.current;

    const dCtx = drawingCanvas?.getContext("2d");
    const cCtx = colorCanvas?.getContext("2d");
    const pCtx = pawCanvas?.getContext("2d");

    if (drawingCanvas && dCtx) {
      const fadeOut = () => {
        let alpha = 1;

        const fadeStep = () => {
          dCtx.fillStyle = `rgba(255,255,255,0.1)`;
          dCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);

          alpha -= 0.1;

          if (alpha > 0) {
            requestAnimationFrame(fadeStep);
          } else {
            dCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

            if (colorCanvas && cCtx) {
              cCtx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);
            }

            if (pawCanvas && pCtx) {
              pCtx.clearRect(0, 0, pawCanvas.width, pawCanvas.height);
            }

            seedsRef.current = [];
            setColorSeedCount(0);
            setUndoStack([]);
            setRedoStack([]);
            clearReplayHistory();
            setArtworkSaved(false);
            setHasCompletedFirstColoring(false);
            setReplayExportDone({ video: false, gif: false });
            setHasUnsavedChanges(false);
          }
        };

        fadeStep();
      };

      fadeOut();
    }
  };

  const openPuzzleMode = () => {
    setFrankPose(getRandomPose([...FRANK_POSES]));

    const drawing = drawingCanvasRef.current;
    const color = colorCanvasRef.current;
    const paw = pawOverlayCanvasRef.current;
    if (!drawing) return;

    const combined = document.createElement("canvas");
    combined.width = drawing.width;
    combined.height = drawing.height;

    const cctx = combined.getContext("2d");

    if (cctx) {
      cctx.fillStyle = "#ffffff";
      cctx.fillRect(0, 0, combined.width, combined.height);

      if (color) cctx.drawImage(color, 0, 0);
      if (drawing) cctx.drawImage(drawing, 0, 0);
      if (paw) cctx.drawImage(paw, 0, 0);
    }

    puzzleSourceCanvasRef.current = combined;
    setAnimationMode("puzzle");
    setAnimationMenuOpen(false);
    setMobilePanel(isMobile ? null : "animate");
  };

  const openReplayMode = (autoExport: "video" | "gif" | null = null) => {
    setFrankPose(getRandomPose([...FRANK_POSES]));
    setReplayAutoExport(autoExport);
    setAnimationMode("replay");
    setAnimationMenuOpen(false);
    if (!autoExport) {
      setMobilePanel("save");
    }
  };

  const navigateBackToLessons = () => {
    const targetHref = `/dog/lessons?category=${lesson?.category_slug ?? ""}`;
    const localizedHref = buildLocalizedHref(targetHref, lang);
    if (!confirmLessonLeave()) return;
    void router.push(localizedHref, undefined, { locale: lang });
  };

  const updateBrushColorFromClientPoint = (
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    const wheel = event.currentTarget;
    const touch = event.touches[0];
    if (!touch) return;

    const rect = wheel.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX);
    const hue = ((angle * 180) / Math.PI + 360) % 360;

    setMobileBrushColor((prev) => {
      const next = {
        ...prev,
        hue,
      };
      setBrushColor(buildColorFromState(next));
      return next;
    });
  };

  return (
    <>
      <SEO title={seoTitle} description={seoDescription} path={seoPath} />
      <MobilePortraitLock lang={lang} enabled={isMobile} />
      <div className="lesson-container">
        {!isMobile ? (
          <BackButton
            href={`/dog/lessons?category=${lesson?.category_slug ?? ""}`}
          />
        ) : null}
        {lesson ? (
          <div>
          <h1 className="lessons-title page-title">{lesson.title}</h1>
          {!isMobile && !isLessonTranslated && lang !== "ru" && <TranslationWarning lang={lang} />}
          {isMobile ? (
            <div className="lesson-mobile-shell">
              <div className="lesson-mobile-topbar">
                <div className="lesson-mobile-topbar-main">
                  <div className="lesson-mobile-action-row">
                    <button
                      type="button"
                      className="lesson-mobile-inline-back"
                      aria-label="Back to lessons"
                      onClick={navigateBackToLessons}
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      className="lesson-mobile-primary"
                      onClick={handleAdvanceLesson}
                    >
                      {!hasStarted
                        ? t.startLesson
                        : isLessonComplete
                          ? t.repeatLesson
                          : `${t.nextStep} 🐾`}
                    </button>
                    {isLessonComplete ? (
                      <button
                        type="button"
                        className="lesson-mobile-gallery"
                        onClick={() => setShowGallery(true)}
                      >
                        🖼 {t.openGallery}
                      </button>
                    ) : null}
                  </div>
                  <div className="lesson-mobile-frank">
                    <Image
                      src="/dog/frank.webp"
                      alt={t.frankName}
                      className="lesson-mobile-frank-avatar"
                      width={84}
                      height={84}
                    />
                    <div className="lesson-mobile-frank-bubble">
                      {frankSpeech}
                    </div>
                  </div>
                  {hasCompletedFirstColoring && isLessonComplete ? (
                    <div className="lesson-mobile-fibi">
                    <Image
                      src="/dog/fibi.webp"
                      alt={t.fibiName}
                      className="lesson-mobile-fibi-avatar"
                      width={84}
                      height={84}
                    />
                    <div className="lesson-mobile-fibi-bubble">
                        {mobileFibiAdviceReady ? (
                          <>
                            {mobileFibiFact ? (
                              <div className="lesson-mobile-fibi-fact">{mobileFibiFact}</div>
                            ) : null}
                            <button
                              type="button"
                              className="lesson-mobile-fibi-advice"
                              onClick={() => setMobileFibiFact(getRandomArtFact(lang))}
                            >
                              {fibiAdviceButtonLabel}
                            </button>
                          </>
                        ) : (
                          fibiGalleryHint
                        )}
                    </div>
                  </div>
                  ) : null}
                </div>
              </div>

              <div
                className={`lesson-mobile-stage ${
                  mobilePanel === "coloring" && showColorizer
                    ? "lesson-mobile-stage-raised"
                    : animationMode === "puzzle"
                      ? "lesson-mobile-stage-puzzle"
                      : ""
                }`}
              >
                <div className="lesson-canvas-wrapper lesson-canvas-wrapper-mobile">
                  {!hasStarted && (
                    <button
                      id="start-button-mobile"
                      className="lesson-button-start"
                      onClick={() => {
                        setCurrentStepIndex(0);
                        drawStepOnCanvas(0);
                        const canvas = drawingCanvasRef.current;
                        const ctx = canvas?.getContext("2d");
                        if (ctx) applyBrushSettings(ctx);
                        setHasStarted(true);
                      }}
                    >
                      <div className="lesson-start-text">{t.start}</div>
                    </button>
                  )}

                  {!showColorizer && (
                    <canvas
                      id="lesson-canvas-mobile"
                      className="lesson-canvas-bg"
                      ref={canvasRef}
                      width={512}
                      height={512}
                    />
                  )}
                  <canvas
                    id="color-canvas-mobile"
                    className="lesson-canvas-color"
                    ref={colorCanvasRef}
                    width={512}
                    height={512}
                  />
                  <canvas
                    id="paw-overlay-canvas-mobile"
                    className="lesson-canvas-paw-overlay"
                    ref={pawOverlayCanvasRef}
                    width={512}
                    height={512}
                  />
                  <canvas
                    id="drawing-canvas-mobile"
                    className="lesson-canvas-draw"
                    ref={drawingCanvasRef}
                    width={512}
                    height={512}
                    style={{
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      touchAction: "none",
                      cursor: showColorizer
                        ? isDrawingState
                          ? "url('/dog/pencile.png') 0 32, auto"
                          : "url('/dog/paw.svg') 16 16, auto"
                        : "url('/dog/pencile.png') 0 32, auto",
                    }}
                  />

                  {animationMode === "puzzle" ? (
                    <div className="lesson-puzzle-mode lesson-puzzle-mode-mobile">
                      <div className="lesson-puzzle-board lesson-puzzle-board-mobile">
                        <PuzzleCanvas
                          sourceCanvas={puzzleSourceCanvasRef.current!}
                          traySelector=".lesson-puzzle-tray-inner-mobile-active"
                        />
                      </div>
                      <button
                        type="button"
                        className="lesson-mobile-mode-close"
                        onClick={closeMagicMode}
                        aria-label="Close puzzle mode"
                      >
                        ✕
                      </button>
                    </div>
                  ) : null}

                  {animationMode === "replay" ? (
                    <div className="lesson-puzzle-mode lesson-puzzle-mode-mobile">
                      <ReplayCanvas
                        actionGroups={replayActionGroups}
                        regionMaps={regionMapsRef.current}
                        width={512}
                        height={512}
                        autoExport={replayAutoExport}
                        onAutoExportDone={() => setReplayAutoExport(null)}
                        onExportComplete={(type) => {
                          setReplayExportDone((prev) => ({
                            ...prev,
                            [type]: true,
                          }));
                        }}
                        savingLabel={savingOverlayLabel}
                        onClose={() => {
                          setReplayAutoExport(null);
                          setAnimationMode(null);
                        }}
                      />
                    </div>
                  ) : null}

                  {animationMode !== "puzzle" && animationMode !== "replay" ? (
                    <div className="lesson-mobile-canvas-topbar">
                      {hasStarted ? (
                        <div className="lesson-mobile-history-controls" aria-label="History controls">
                          <button
                            type="button"
                            className="lesson-mobile-history-button"
                            onClick={handleUndo}
                            disabled={undoStack.length === 0}
                            aria-label={t.undo}
                          >
                            <Image src="/dog/backward.png" alt="" aria-hidden="true" width={24} height={24} />
                          </button>
                          <button
                            type="button"
                            className="lesson-mobile-history-button"
                            onClick={handleRedo}
                            disabled={redoStack.length === 0}
                            aria-label={t.redo}
                          >
                            <Image src="/dog/forward.png" alt="" aria-hidden="true" width={24} height={24} />
                          </button>
                        </div>
                      ) : (
                        <div />
                      )}
                      {showColorizer ? (
                        <div className="lesson-mobile-canvas-topbar-center">
                          <button
                            type="button"
                            className="lesson-mobile-colorize-cta"
                            onClick={handleColorize}
                          >
                            🌈 {t.colorizeSketch}
                          </button>
                        </div>
                      ) : null}
                      <div className="lesson-step-counter lesson-step-counter-mobile">
                        {currentStepIndex >= 0 ? (
                          <p>
                            <strong>{currentStepIndex + 1}</strong> {t.stepOf} {lesson.steps.length}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className={`lesson-mobile-panel-shell ${mobilePanel ? "open" : ""}`}>
                <div className={`lesson-mobile-panel-content ${mobilePanel ? "open" : ""}`}>
                  {mobilePanel ? (
                    <button
                      type="button"
                      className="lesson-mobile-panel-close"
                      onClick={closeMobilePanel}
                      aria-label="Close menu"
                    >
                      ✕
                    </button>
                  ) : null}
                  {mobilePanel === "brushes" ? (
                    <div className="lesson-mobile-section">
                      <div className="lesson-mobile-field">
                        <label>{t.brushStyle}</label>
                        <select
                          value={brushStyle}
                          onChange={(e) =>
                            setBrushStyle(
                              e.target.value as
                                | "normal"
                                | "smooth"
                                | "sparkle"
                                | "rainbow"
                                | "chameleon"
                                | "gradient"
                                | "neon"
                                | "watercolor",
                            )
                          }
                        >
                          <option value="smooth">{t.brushNormal}</option>
                          <option value="sparkle">{t.brushSparkle}</option>
                          <option value="rainbow">{t.brushRainbow}</option>
                          <option value="chameleon">{t.brushChameleon}</option>
                          <option value="gradient">{t.brushGradient}</option>
                          <option value="neon">{t.brushNeon}</option>
                          <option value="watercolor">{t.brushWatercolor}</option>
                        </select>
                      </div>
                      <div className="lesson-mobile-field lesson-mobile-field-inline">
                        <label>{t.brushColor}</label>
                        <button
                          type="button"
                          className="lesson-mobile-chip"
                          onClick={() => setIsEraser((prev) => !prev)}
                        >
                          {isEraser ? t.brush : t.eraser}
                        </button>
                      </div>
                      <div className="lesson-mobile-color-picker">
                        <div className="lesson-mobile-color-picker__header">
                          <div className="lesson-mobile-color-picker__title">Color</div>
                          <div className="lesson-mobile-color-picker__meta">
                            {[
                              { label: "White", hex: "#ffffff" },
                              { label: "Black", hex: "#000000" },
                            ].map((quickColor) => (
                              <button
                                key={quickColor.hex}
                                type="button"
                                aria-label={quickColor.label}
                                onClick={() => {
                                  setBrushColor(quickColor.hex);
                                  setMobileBrushColor(hexToHsl(quickColor.hex));
                                }}
                                className="lesson-mobile-quick-color"
                                style={{ background: quickColor.hex }}
                              />
                            ))}
                            <div
                              className="lesson-mobile-color-preview"
                              style={{ background: brushColor }}
                            />
                          </div>
                        </div>
                        <div
                          className="lesson-mobile-color-wheel"
                          onTouchStart={updateBrushColorFromClientPoint}
                          onTouchMove={(e) => {
                            e.preventDefault();
                            updateBrushColorFromClientPoint(e);
                          }}
                        />
                        <label className="lesson-mobile-field">
                          <span>Darkness</span>
                          <input
                            type="range"
                            min="0"
                            max="82"
                            value={mobileBrushColor.darkness}
                            onChange={(e) => {
                              const darkness = Number(e.target.value);
                              setMobileBrushColor((prev) => {
                                const next = { ...prev, darkness };
                                setBrushColor(buildColorFromState(next));
                                return next;
                              });
                            }}
                          />
                        </label>
                      </div>
                      <div className="lesson-mobile-field">
                        <label>{t.brushSize}</label>
                        <input
                          type="range"
                          min={1}
                          max={20}
                          value={brushSize}
                          onChange={(e) => setBrushSize(Number(e.target.value))}
                        />
                      </div>
                      <div className="lesson-mobile-field">
                        <label>{t.opacity}</label>
                        <input
                          type="range"
                          min={0.05}
                          max={1}
                          step={0.05}
                          value={brushOpacity}
                          onChange={(e) => setBrushOpacity(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  ) : null}

                  {mobilePanel === "coloring" ? (
                    <div className="lesson-mobile-section">
                      {mobileFillTooltip ? (
                        <div className="lesson-mobile-tooltip" role="status" aria-live="polite">
                          {mobileFillTooltip}
                        </div>
                      ) : null}
                      <div className="lesson-mobile-button-grid">
                        <button
                          type="button"
                          className={`lesson-mobile-action lesson-mobile-action-accent ${
                            !isLessonComplete ? "is-locked" : ""
                          }`}
                          onClick={() => {
                            if (!isLessonComplete) {
                              handleLockedFillAction();
                              return;
                            }
                            handleColorize();
                          }}
                          aria-disabled={!isLessonComplete}
                          title={!isLessonComplete ? fillLockedMessage : undefined}
                        >
                          🌈 {t.colorizeSketch}
                        </button>
                        <button
                          type="button"
                          className={`lesson-mobile-action ${
                            !isLessonComplete ? "is-locked" : ""
                          }`}
                          onClick={() => {
                            if (!isLessonComplete) {
                              handleLockedFillAction();
                              return;
                            }
                            debugRenderRegions();
                          }}
                          aria-disabled={!isLessonComplete}
                          title={!isLessonComplete ? fillLockedMessage : undefined}
                        >
                          🧪 {t.autoColorize}
                        </button>
                      </div>
                      {showColorizer ? (
                        <div className="lesson-mobile-color-picker lesson-mobile-color-picker-fill">
                          <div className="lesson-mobile-color-picker__header">
                            <span className="lesson-mobile-color-picker__title">
                              {t.brushColor}
                            </span>
                            <div className="lesson-mobile-color-picker__meta">
                              {[
                                { label: "White", hex: "#ffffff" },
                                { label: "Black", hex: "#000000" },
                              ].map((quickColor) => (
                                <button
                                  key={quickColor.hex}
                                  type="button"
                                  className="lesson-mobile-quick-color"
                                  style={{ background: quickColor.hex }}
                                  onClick={() => {
                                    setBrushColor(quickColor.hex);
                                    setMobileBrushColor(hexToHsl(quickColor.hex));
                                  }}
                                  aria-label={quickColor.label}
                                />
                              ))}
                              <button
                                type="button"
                                className="lesson-mobile-color-preview"
                                style={{ background: brushColor }}
                                aria-label={`Current color ${brushColor}`}
                              />
                            </div>
                          </div>
                          <div
                            className="lesson-mobile-color-wheel"
                            onTouchStart={updateBrushColorFromClientPoint}
                            onTouchMove={(e) => {
                              e.preventDefault();
                              updateBrushColorFromClientPoint(e);
                            }}
                          />
                          <label className="lesson-mobile-field">
                            <span>Darkness</span>
                            <input
                              type="range"
                              min="0"
                              max="82"
                              value={mobileBrushColor.darkness}
                              onChange={(e) => {
                                const darkness = Number(e.target.value);
                                setMobileBrushColor((prev) => {
                                  const next = { ...prev, darkness };
                                  setBrushColor(buildColorFromState(next));
                                  return next;
                                });
                              }}
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {mobilePanel === "animate" ? (
                    <div className="lesson-mobile-section">
                      <div className="lesson-mobile-button-grid">
                        <button
                          type="button"
                          className="lesson-mobile-action lesson-mobile-action-accent"
                          onClick={openPuzzleMode}
                        >
                          🧩 {t.makePuzzle}
                        </button>
                        <button
                          type="button"
                          className="lesson-mobile-action"
                          onClick={() => alert(t.comingSoon)}
                        >
                          🌊 {t.paintFlow}
                        </button>
                        <button
                          type="button"
                          className="lesson-mobile-action"
                          onClick={() => alert(t.comingSoon)}
                        >
                          🎨 {t.mixPaints}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {mobilePanel === "save" ? (
                    <div className="lesson-mobile-section">
                      <div className="lesson-mobile-button-grid">
                        <button
                          type="button"
                          className="lesson-mobile-action lesson-mobile-action-accent"
                          onClick={() => {
                            void saveArtwork();
                          }}
                        >
                          {artworkSaved ? replayDoneLabel : `💾 ${t.save}`}
                        </button>
                        <button
                          type="button"
                          className="lesson-mobile-action"
                          onClick={() => openReplayMode()}
                        >
                          🎬 {t.replayProcess}
                        </button>
                        <button
                          type="button"
                          className="lesson-mobile-action"
                          onClick={() => openReplayMode("video")}
                        >
                          {replayExportDone.video ? replayDoneLabel : "⬇ Video"}
                        </button>
                        <button
                          type="button"
                          className="lesson-mobile-action"
                          onClick={() => openReplayMode("gif")}
                        >
                          {replayExportDone.gif ? replayDoneLabel : "⬇ GIF"}
                        </button>
                      </div>
                      <div className="lesson-mobile-danger">
                        <div className="lesson-mobile-danger-label">Danger zone</div>
                        <button
                          type="button"
                          className="lesson-mobile-danger-button"
                          onClick={clearArtwork}
                        >
                          🗑 {t.clear}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {animationMode !== "puzzle" ? (
                <nav className="lesson-mobile-nav" aria-label="Lesson mobile tools">
                  {[
                    ["brushes", "Brush"],
                    ["coloring", "Fill"],
                    ["animate", "Magic"],
                    ["save", "Save"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={mobilePanel === key ? "active" : ""}
                      onClick={() =>
                        setMobilePanel((current) =>
                          current === key ? null : (key as "brushes" | "coloring" | "animate" | "save"),
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                </nav>
                ) : null}
              </div>

              {animationMode === "puzzle" ? (
                <div className="lesson-mobile-puzzle-dock">
                  <button
                    type="button"
                    className="lesson-puzzle-scroll-left"
                    onClick={() => {
                      const el = document.querySelector(
                        ".lesson-puzzle-tray-inner-mobile-active",
                      ) as HTMLElement | null;
                      el?.scrollBy({ left: -200, behavior: "smooth" });
                    }}
                  >
                    ◀
                  </button>
                  <div className="lesson-puzzle-tray-inner lesson-puzzle-tray-inner-mobile lesson-puzzle-tray-inner-mobile-active" />
                  <button
                    type="button"
                    className="lesson-puzzle-scroll-right"
                    onClick={() => {
                      const el = document.querySelector(
                        ".lesson-puzzle-tray-inner-mobile-active",
                      ) as HTMLElement | null;
                      el?.scrollBy({ left: 200, behavior: "smooth" });
                    }}
                  >
                    ▶
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
          <div className="lesson-controls">
            <button
              className="lesson-button lesson-button-next"
              onClick={handleAdvanceLesson}
            >
              {!hasStarted ? (
                t.startLesson
              ) : currentStepIndex === lesson.steps.length - 1 ? (
                t.repeatLesson
              ) : (
                <>{t.nextStep} 🐾</>
              )}
            </button>
            {lesson && isLessonComplete && (
              <div className="lesson-color-controls">
                <button
                  className={`lesson-button lesson-button-colorize ${
                    currentStepIndex === lesson.steps.length - 1
                      ? "active"
                      : "disabled"
                  }`}
                  onClick={handleColorize}
                  disabled={currentStepIndex !== lesson.steps.length - 1}
                >
                  🌈 {t.colorizeSketch}
                </button>

                <button
                  className={`lesson-button lesson-button-colorize-auto ${
                    currentStepIndex === lesson.steps.length - 1
                      ? "active"
                      : "disabled"
                  }`}
                  onClick={debugRenderRegions}
                >
                  🧪 {t.autoColorize}
                </button>

                <button
                  className="lesson-button lesson-button-animate"
                  onClick={() => {
                    setAnimationMenuOpen(true);
                  }}
                >
                  <span className="sparkle">✨</span>
                  {t.animatePicture} ✨
                </button>
              </div>
            )}
          </div>
          )}
          {animationMenuOpen && (
            <div className="lesson-animation-menu">
              <button
                className="lesson-animation-button btn-mint"
                onClick={openPuzzleMode}
              >
                🧩 {t.makePuzzle}
              </button>

              <button
                className="lesson-animation-button btn-blue"
                onClick={() => {
                  setFrankPose(getRandomPose([...FRANK_POSES]));
                  setAnimationMenuOpen(false);
                  alert(t.comingSoon);
                }}
              >
                🌊 {t.paintFlow}
              </button>

              <button
                className="lesson-animation-button btn-pink"
                onClick={() => {
                  setFrankPose(getRandomPose([...FRANK_POSES]));
                  setAnimationMenuOpen(false);
                  alert(t.comingSoon);
                }}
              >
                🎨 {t.mixPaints}
              </button>

              <button
                className="lesson-animation-button btn-yellow"
                onClick={() => openReplayMode()}
              >
                🎬 {t.replayProcess}
              </button>
            </div>
          )}
          {!isMobile ? (
          <div className="lesson-main-row">
            <div
              className="lesson-frank"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
            >
              <div className="lesson-frank-tip" style={{ marginTop: "270px" }}>
                {currentStepIndex >= 0 &&
                lesson?.steps[currentStepIndex]?.frank ? (
                  <DogImage
                    name="frank"
                    pose={frankPose}
                    speech={
                      frankSpeech
                    }
                    size={220}
                  />
                ) : (
                  <>
                    <p>
                      { t.prepareTools }
                    </p>
                    <DogImage
                      name="frank"
                      pose={frankPose}
                      speech=<> {t.frankWelcome} "🐶✏️" </>
                      size={220}
                    />
                  </>
                )}
                <div className="lesson-dog-name"> {t.frankName} </div>
              </div>
            </div>
            <div className="lesson-canvas-wrapper">
              {!hasStarted && (
                <button
                  id="start-button"
                  className="lesson-button-start"
                  onClick={() => {
                    setCurrentStepIndex(0);
                    drawStepOnCanvas(0);
                    // --- Применяем настройки кисти для drawingCanvasRef сразу при старте ---
                    const canvas = drawingCanvasRef.current;
                    const ctx = canvas?.getContext("2d");
                    if (ctx) applyBrushSettings(ctx);
                    setHasStarted(true);
                  }}
                >
                  <div className="lesson-start-text">{t.start}</div>
                  <svg
                    width="200"
                    height="200"
                    viewBox="0 0 100 100"
                    className="lesson-play-icon"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient
                        id="rainbowGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="40%" stopColor="#d7c5f0" />
                        <stop offset="60%" stopColor="#c5e9f7" />
                        <stop offset="80%" stopColor="#ffd1a6" />
                        <stop offset="100%" stopColor="#ffe1d6" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M30,20 L70,50 L30,80 Z"
                      fill="url(#rainbowGradient)"
                    >
                      <animate
                        attributeName="fill-opacity"
                        values="1;0.5;1"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </path>
                  </svg>
                </button>
              )}
              {animationMenuOpen ||
              (animationMode && animationMode !== "replay") ? (
                <button
                  className="lesson-puzzle-close"
                  onClick={() => {
                    setAnimationMode(null);
                    setAnimationMenuOpen(false);
                  }}
                >
                  ✕
                </button>
              ) : (
                <div className="lesson-step-counter">
                  {lesson && currentStepIndex >= 0 && (
                    <p>
                      <strong>{currentStepIndex + 1}</strong> {t.stepOf}{" "}
                      {lesson.steps.length}
                    </p>
                  )}
                </div>
              )}

              {animationMode === "replay" ? (
                <ReplayCanvas
                  actionGroups={replayActionGroups}
                  regionMaps={regionMapsRef.current}
                  width={512}
                  height={512}
                  savingLabel={savingOverlayLabel}
                  onClose={() => setAnimationMode(null)}
                />
              ) : animationMode === "puzzle" ? (
                <div className="lesson-puzzle-mode">
                  <div className="lesson-puzzle-board">
                    <PuzzleCanvas
                      sourceCanvas={puzzleSourceCanvasRef.current!}
                    />
                  </div>

                  {/* tray for puzzle pieces (махсан) */}
                  <div
                    className="lesson-puzzle-tray"
                    style={{
                      position: "fixed",
                      bottom: 0,
                      left: 0,
                      width: "100vw",
                      zIndex: 20,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px",
                    }}
                  >
                    <button
                      className="lesson-puzzle-scroll-left"
                      onClick={() => {
                        const el = document.querySelector(
                          ".lesson-puzzle-tray-inner",
                        ) as HTMLElement | null;
                        el?.scrollBy({ left: -200, behavior: "smooth" });
                      }}
                    >
                      ◀
                    </button>

                    <div
                      className="lesson-puzzle-tray-inner"
                      style={{
                        overflowX: "auto",
                        overflowY: "hidden",
                        whiteSpace: "nowrap",
                        flex: 1,
                        display: "flex",
                        gap: "10px",
                        padding: "4px 10px",
                      }}
                    >
                      {/* pieces will appear here later */}
                    </div>

                    <button
                      className="lesson-puzzle-scroll-right"
                      onClick={() => {
                        const el = document.querySelector(
                          ".lesson-puzzle-tray-inner",
                        ) as HTMLElement | null;
                        el?.scrollBy({ left: 200, behavior: "smooth" });
                      }}
                    >
                      ▶
                    </button>
                  </div>
                </div>
              ) : (
                !showColorizer && (
                  <canvas
                    id="lesson-canvas"
                    className="lesson-canvas-bg"
                    ref={canvasRef}
                    width={512}
                    height={512}
                  ></canvas>
                )
              )}

              <>
                <canvas
                  id="color-canvas"
                  className="lesson-canvas-color"
                  ref={colorCanvasRef}
                  width={512}
                  height={512}
                  style={{
                    display:
                      animationMode === "puzzle" || animationMode === "replay"
                        ? "none"
                        : "block",
                  }}
                ></canvas>

                <canvas
                  id="paw-overlay-canvas"
                  className="lesson-canvas-paw-overlay"
                  ref={pawOverlayCanvasRef}
                  width={512}
                  height={512}
                  style={{
                    display:
                      animationMode === "puzzle" || animationMode === "replay"
                        ? "none"
                        : "block",
                  }}
                ></canvas>

                <canvas
                  id="drawing-canvas"
                  className="lesson-canvas-draw"
                  ref={drawingCanvasRef}
                  width={512}
                  height={512}
                  style={{
                    display:
                      animationMode === "puzzle" || animationMode === "replay"
                        ? "none"
                        : "block",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    touchAction: "none",
                    cursor: showColorizer
                      ? isDrawingState
                        ? "url('/dog/pencile.png') 0 32, auto"
                        : "url('/dog/paw.svg') 16 16, auto"
                      : "url('/dog/pencile.png') 0 32, auto",
                  }}
                ></canvas>
              </>
            </div>
            <div
              className="lesson-fibi"
              style={{ display: "flex", flexDirection: "column" }}
            >
              <div style={{ marginTop: "270px" }}>
                <DogImage
                  name="fibi"
                  pose={fibiPose}
                  size={220}
                  speech={
                    currentStepIndex === lesson.steps.length - 1 ? (
                      <>
                        <div>
                          🎨 {t.fibiArtistHint}
                        </div>
                        <button
                          className="art-gallery-open-button"
                          onClick={() => setShowGallery(true)}
                          style={{ marginTop: "8px" }}
                        >
                          🖼 {t.openGallery}
                        </button>
                      </>
                    ) : (
                      <div>
                        🎨 {fibiIntro}
                        <br />
                        {randomArtFact}
                      </div>
                    )
                  }
                />
                {/* Кнопка открытия галереи вынесена отдельно */}

                <div className="lesson-dog-name">{t.fibiName}</div>
              </div>
            </div>
          </div>
          ) : null}

          {!isMobile && animationMode !== "puzzle" && animationMode !== "replay" && (
            <div className="lesson-tools-panel">
              <div className="lesson-tools-panel-1">
                <button
                  className="lesson-button lesson-button-eraser"
                  onClick={() => setIsEraser((prev) => !prev)}
                >
                  <>
                    <Image
                      src={isEraser ? "/dog/brush.png" : "/dog/erraser.png"}
                      alt={isEraser ? t.brush : t.eraser}
                      className="lesson-tool-icon"
                      width={24}
                      height={24}
                    />
                    {isEraser ? t.brush : t.eraser}
                  </>
                </button>
                <button
                  className="lesson-button"
                  onClick={handleUndo}
                >
                  <>
                    <Image
                      src="/dog/backward.png"
                      alt={t.undo}
                      className="lesson-tool-icon"
                      width={24}
                      height={24}
                    />
                    {t.undo}
                  </>
                </button>
                <button
                  className="lesson-button lesson-button-redo"
                  onClick={handleRedo}
                >
                  <>
                    <Image
                      src="/dog/forward.png"
                      alt={t.redo}
                      className="lesson-tool-icon"
                      width={24}
                      height={24}
                    />
                    {t.redo}
                  </>
                </button>
                <button
                  className="lesson-button lesson-button-clear"
                  onClick={clearArtwork}
                >
                  <>
                    <Image
                      src="/dog/clear.png"
                      alt={t.clear}
                      className="lesson-tool-icon"
                      width={24}
                      height={24}
                    />
                    {t.clear}
                  </>
                </button>
                <button
                  className="lesson-button lesson-button-save"
                  onClick={() => {
                    void saveArtwork();
                  }}
                >
                  <>
                    <Image
                      src="/dog/save.png"
                      alt={t.save}
                      className="lesson-tool-icon"
                      width={24}
                      height={24}
                    />
                    {t.save}
                  </>
                </button>
              </div>

              <div className="lesson-tools-panel-1">
                <label>{t.brushSize}: </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                />

                <div className="lesson-brush-settings">
                  <label>{t.brushColor}: </label>
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                  />
                  <label style={{ marginLeft: "10px" }}>{t.opacity}: </label>
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={brushOpacity}
                    onChange={(e) => setBrushOpacity(Number(e.target.value))}
                  />
                  <label style={{ marginLeft: "10px" }}>{t.brushStyle}: </label>
                  <select
                    value={brushStyle}
                    onChange={(e) =>
                      setBrushStyle(
                        e.target.value as
                          | "normal"
                          | "smooth"
                          | "sparkle"
                          | "rainbow"
                          | "chameleon"
                          | "gradient"
                          | "neon"
                          | "watercolor",
                      )
                    }
                  >
                    <option value="smooth">{t.brushNormal}</option>
                    <option value="sparkle">{t.brushSparkle}</option>
                    <option value="rainbow">{t.brushRainbow}</option>
                    <option value="chameleon">{t.brushChameleon}</option>
                    <option value="gradient">{t.brushGradient}</option>
                    <option value="neon">{t.brushNeon}</option>
                    <option value="watercolor">{t.brushWatercolor}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Custom restart confirmation modal */}
          {showRestartConfirm && (
            <div className="lesson-restart-modal">
              <div className="lesson-restart-modal-box">
                <div className="lesson-restart-frank">
                  <div className="lesson-restart-frank-bubble">
                    <> {t.restartConfirm} 🐾</> 
                  </div>

                  <Image src="/dog/frank.webp" alt="Frank" width={180} height={180} />
                </div>

                <div className="lesson-restart-modal-buttons">
                  <button
                    className="lesson-button"
                    onClick={() => setShowRestartConfirm(false)}
                  >
                    {t.cancel}
                  </button>

                  <button
                    className="lesson-button lesson-button-clear"
                    onClick={restartLesson}
                  >
                    {t.erase}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Модалка галереи */}
          {showGallery &&
            lesson &&
            (isMobile ? (
              <MobileArtGallery
                categorySlug={lesson.category_slug}
                isOpen={showGallery}
                onClose={() => setShowGallery(false)}
              />
            ) : ReactDOM.createPortal(
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ArtGalleryModal
                    categorySlug={lesson.category_slug}
                    onClose={() => setShowGallery(false)}
                  />
                </div>,
                document.getElementById("modal-root")!,
              ))}
          </div>
        ) : (
          <p>{t.loadingLesson}</p>
        )}
      </div>
    </>
  );
}

export default function LessonPlayer() {
  return <LessonPlayerDesktop />;
}
