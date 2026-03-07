import { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { buildRegionMap } from "@/utils/buildRegionMap";
import { paintRegionFast } from "@/utils/paintRegionFast";
import { waveFill } from "@/utils/waveFill";
// Color seed placed by a paw click
type ColorSeed = {
  x: number;
  y: number;
  regionId: number;
  color: [number, number, number];
};
import ArtGalleryModal from "@/components/ArtGalleryModal";
import { useRouter } from "next/router";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;

type Lesson = {
  title: string;
  category_slug: string;
  steps: {
    frank: string;
    image: string;
  }[];
};

// DogImage component: PNG 10s → optional animated WebP/GIF 5s → PNG …
function DogImage({
  name,
  pose,
  speech,
  size = 220,
}: {
  name: "fibi" | "frank";
  pose: string; // one of your pose filenames without extension
  speech?: string;
  size?: number;
}) {
  const [showAnim, setShowAnim] = useState(false);
  const [animIdx, setAnimIdx] = useState(0);

  // используем постер из Supabase storage в качестве базовой PNG-картинки и GIF-анимацию
  const base = `${SUPA}/storage/v1/object/public/characters/dogs/${name}/anims/`;
  const pngSrc = `${base}/${pose}-poster.png`;

  const animList: string[] = [`${base}/${pose}.gif`];

  // Alternate only if there is any animation for this pose
  useEffect(() => {
    let t: number | undefined;
    let running = true;
    const loop = () => {
      setShowAnim(false);
      t = window.setTimeout(() => {
        if (!running) return;
        if (animList.length > 0) {
          setShowAnim(true);
          setAnimIdx((prev) => (prev + 1) % animList.length);
        }
        t = window.setTimeout(() => running && loop(), 5000);
      }, 10000);
    };
    loop();
    return () => {
      running = false;
      if (t) window.clearTimeout(t);
    };
  }, [pose, name]);

  return (
    <div className="dog-image-wrap" style={{ width: size }}>
      {!showAnim ? (
        <img
          className="dog-image-img"
          src={pngSrc}
          alt={`${name} ${pose}`}
          width={size}
          height={size}
        />
      ) : (
        <img
          className="dog-image-img"
          src={animList[animIdx]}
          alt={`${name} ${pose} anim`}
          width={size}
          height={size}
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

export default function LessonPlayer() {
  const router = useRouter();
  const { slug } = router.query;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  // --- Состояния для галереи ---
  const [showGallery, setShowGallery] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [brushSize, setBrushSize] = useState<number>(5);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [brushColor, setBrushColor] = useState<string>("#000000");
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

  const debugRenderRegions = () => {
    const colorCanvas = colorCanvasRef.current;

    if (!colorCanvas) return;

    const ctx = colorCanvas.getContext("2d");
    if (!ctx) return;

    if (!regionDataRef.current) {
      computeRegionMap();
    }

    const regionData = regionDataRef.current;
    if (!regionData) return;

    const { regionMap, width, height, regionCount } = regionData;

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

    // fill regions using the same wave fill used by the colorizer
    waveFill(ctx, regionData, debugSeeds);
  };

  const isDrawing = useRef(false);
  const [isDrawingState, setIsDrawingState] = useState(false);
  // Для плавных кистей: храним hue и прогресс градиента
  const hueRef = useRef(0);
  const gradientProgressRef = useRef(0);
  // previous point for light bezier smoothing
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const pawImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = "/dog/paw.svg";
    pawImgRef.current = img;
  }, []);

  const computeRegionMap = () => {
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

    console.log(
      "Region map built:",
      regionDataRef.current?.regionCount,
      "regions",
    );
  };

  const handleColorize = () => {
    setShowColorizer(true);
    if (!regionDataRef.current) {
      computeRegionMap();
    }

    const colorCanvas = colorCanvasRef.current;
    const ctx = colorCanvas?.getContext("2d");

    if (!ctx || !regionDataRef.current) return;

    waveFill(ctx, regionDataRef.current, seedsRef.current);
    // убрать лапки после начала раскрашивания
    const pawCanvas = pawOverlayCanvasRef.current;
    const pawCtx = pawCanvas?.getContext("2d");

    if (pawCtx && pawCanvas) {
      pawCtx.clearRect(0, 0, pawCanvas.width, pawCanvas.height);
    }

    // здесь позже запустим анимацию заливки
  };

  // Helper to draw a paw marker for a color seed
  const drawSeedPaw = (
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
  };

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

  // Simple click-to-color prototype: clicking the canvas colors the region that was clicked
  const handleCanvasColorClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // раскраска доступна только после нажатия "Раскрасить"
    if (!showColorizer) return;

    // ignore click if user is currently drawing
    if (isDrawing.current) return;
    const canvas = colorCanvasRef.current;
    if (!canvas) return;

    // ensure region map exists
    if (!regionDataRef.current) {
      computeRegionMap();
    }

    if (!regionDataRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    const { width, regionMap } = regionDataRef.current;

    // --- Use nearest region search ---
    const nearest = findNearestRegion(
      x,
      y,
      regionMap,
      width,
      regionDataRef.current.height,
    );
    if (!nearest) return;

    const { x: seedX, y: seedY, regionId } = nearest;

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
        const hex = brushColorRef.current;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        paintRegionFast(ctx, regionDataRef.current!, regionId, [r, g, b]);
      }
    }

    // create seed color from current brush color
    const hex = brushColorRef.current;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const color: [number, number, number] = [r, g, b];

    // store seed
    seedsRef.current.push({ x: seedX, y: seedY, regionId, color });

    // draw paw marker on overlay canvas with bounce animation
    const pawCanvas = pawOverlayCanvasRef.current;
    const pawCtx = pawCanvas?.getContext("2d");

    if (pawCtx) {
      // draw the paw once (permanent marker)
      drawSeedPaw(pawCtx, seedX, seedY, color);

      const bounceFrames = 8;
      let frame = 0;

      const animate = () => {
        // very soft ripple wave only (no clearing of previous paws)
        const rippleRadius = frame * 4;

        pawCtx.save();
        pawCtx.beginPath();
        pawCtx.arc(seedX, seedY, rippleRadius, 0, Math.PI * 2);
        pawCtx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.10 - frame * 0.02})`;
        pawCtx.lineWidth = 1;
        pawCtx.stroke();
        pawCtx.restore();

        frame++;
        if (frame <= bounceFrames) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    }
  };

  const [fibiSpeech, setFibiSpeech] = useState<string>("");
  const lastFrankRef = useRef<string>("");

  // refs для brushSize, brushColor, brushStyle, isEraser
  const brushSizeRef = useRef(brushSize);
  const brushColorRef = useRef(brushColor);
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

    ctx.strokeStyle = color;

    // watercolor / smooth brushes keep extra softness
    if (style === "watercolor" || style === "smooth") {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
    }
  };

  useEffect(() => {
    // Временно отключаем генерацию речи Фиби через ИИ
    // Позже здесь появится новая механика персонажа
    setFibiSpeech("");
    return () => {};
  }, [lesson, currentStepIndex]);

  const drawStepOnCanvas = (stepIndex: number) => {
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
        const img = new Image();
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
  };

  useEffect(() => {
    if (!slug || typeof slug !== "string") return;

    const fetchLesson = async () => {
      const res = await fetch(`/api/dog-lesson?slug=${slug}`);
      const data = await res.json();
      console.log("Данные урока:", data);
      if (!data || !data.category_slug) {
        console.error("Ошибка: отсутствует category_slug в данных урока");
        return;
      }
      setLesson(data);
      setBrushSize(5);
      if (data.steps.length > 0) {
        setCurrentStepIndex(0);
        setTimeout(() => {
          drawStepOnCanvas(0);
        }, 0);
      }
    };

    fetchLesson();
  }, [slug]);

  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e instanceof TouchEvent) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      } else {
        return {
          x: (e as MouseEvent).clientX - rect.left,
          y: (e as MouseEvent).clientY - rect.top,
        };
      }
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current || !ctx) return;
      // user is dragging → switch cursor to pencil
      if (!isDrawingState) {
        setIsDrawingState(true);
      }
      const { x, y } = getCoordinates(e);

      ctx.globalCompositeOperation = isEraserRef.current
        ? "destination-out"
        : "source-over";
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
        const midX = (prev.x + x) * 0.5;
        const midY = (prev.y + y) * 0.5;

        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);

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
          ctx.strokeStyle = `${color}30`; // добавляем прозрачность к текущему цвету
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.shadowBlur = 0;
        } else {
          ctx.shadowBlur = 0; // Disable any shadow for normal brush
        }

        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(midX, midY);
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
          ctx.strokeStyle = `${color}30`; // добавляем прозрачность к текущему цвету
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.shadowBlur = 0;
        } else {
          ctx.shadowBlur = 0; // Disable any shadow for normal brush
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        lastPointRef.current = { x, y };
      }
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      if (!ctx) return;
      setUndoStack((prev) => {
        const ctxCopy = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return [...prev, ctxCopy];
      });
      isDrawing.current = true;
      // do NOT switch cursor yet; wait until actual movement
      // while drawing we disable color click logic
      const { x, y } = getCoordinates(e);
      ctx.globalCompositeOperation = isEraserRef.current
        ? "destination-out"
        : "source-over";
      applyBrushSettings(ctx);
      ctx.beginPath();
      ctx.moveTo(x, y);
      lastPointRef.current = { x, y };
    };

    const endDrawing = () => {
      isDrawing.current = false;
      setIsDrawingState(false);
      ctx.beginPath();
      lastPointRef.current = null;
      // drawing changed → region map is no longer valid
      regionDataRef.current = null;
    };

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDrawing);
    canvas.addEventListener("mouseleave", endDrawing);

    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchmove", draw);
    canvas.addEventListener("touchend", endDrawing);
    canvas.addEventListener("touchcancel", endDrawing);

    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", endDrawing);
      canvas.removeEventListener("mouseleave", endDrawing);

      canvas.removeEventListener("touchstart", startDrawing);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", endDrawing);
      canvas.removeEventListener("touchcancel", endDrawing);
    };
  }, [hasStarted]);

  // --- Добавляем случайные позы для Фрэнка и Фиби ---
  const frankPoses = [
    "chew-brush",
    "chew-pen",
    "draw",
    "eat-brush",
    "lie",
    "looks-left",
    "paint",
    "run",
    "welcome-bye",
  ];
  const fibiPoses = [
    "chewing-eraser",
    "draw",
    "excited",
    "lie",
    "looks-right",
    "shows-drawing",
    "siting",
    "watch",
    "welcome",
  ];
  const getRandomPose = (poses: string[]) =>
    poses[Math.floor(Math.random() * poses.length)];

  // Новые состояния для поз Фрэнка и Фиби
  const [frankPose, setFrankPose] = useState(getRandomPose(frankPoses));
  const [fibiPose, setFibiPose] = useState(getRandomPose(fibiPoses));

  // Обновлять позы при смене шага
  useEffect(() => {
    setFrankPose(getRandomPose(frankPoses));
    setFibiPose(getRandomPose(fibiPoses));
  }, [currentStepIndex]);

  return (
    <div className="lesson-container">
      {lesson ? (
        <div>
          <h1 className="lessons-title page-title">{lesson.title}</h1>
          <div className="lesson-controls">
            {!hasStarted && (
              <button
                id="start-button"
                className="lesson-button lesson-button-start"
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
                <div className="lesson-start-text">Старт!</div>
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
                  <path d="M30,20 L70,50 L30,80 Z" fill="url(#rainbowGradient)">
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
            <button
              className="lesson-button lesson-button-next"
              onClick={() => {
                const nextIndex = currentStepIndex + 1;
                if (lesson && nextIndex < lesson.steps.length) {
                  setCurrentStepIndex(nextIndex);
                  drawStepOnCanvas(nextIndex);
                  if (!hasStarted) setHasStarted(true);
                }
              }}
            >
              {currentStepIndex < lesson.steps.length - 1
                ? "Следующий шаг 🐾"
                : "Готово!✅"}
            </button>
            {lesson && currentStepIndex === lesson.steps.length - 1 && (
              <div style={{ marginTop: "10px", textAlign: "center" }}>
                <button
                  className="lesson-button lesson-button-colorize"
                  onClick={handleColorize}
                >
                  🌈 Раскрасить скетч!
                </button>

                <button
                  className="lesson-button"
                  style={{ marginTop: "10px" }}
                  onClick={debugRenderRegions}
                >
                  🧪 Debug регионы
                </button>
              </div>
            )}
            <div className="lesson-step-counter">
              {lesson && currentStepIndex >= 0 && (
                <p>
                  {currentStepIndex + 1} шаг из {lesson.steps.length}
                </p>
              )}
            </div>
          </div>
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
                    speech={lesson.steps[currentStepIndex].frank}
                    size={220}
                  />
                ) : (
                  <>
                    <p>
                      Приготовь мышку, стилус, тачпад, или просто листик и
                      карандаш, и жми на Старт!
                    </p>
                    <DogImage
                      name="frank"
                      pose={frankPose}
                      speech="Привет! Я Фрэнк и я помогу тебе научиться рисовать!"
                      size={220}
                    />
                  </>
                )}
              </div>
            </div>
            <div className="lesson-canvas-wrapper">
              {!showColorizer && (
                <canvas
                  id="lesson-canvas"
                  className="lesson-canvas-bg"
                  ref={canvasRef}
                  width={512}
                  height={512}
                ></canvas>
              )}

              <canvas
                id="color-canvas"
                className="lesson-canvas-color"
                ref={colorCanvasRef}
                width={512}
                height={512}
              ></canvas>

              <canvas
                id="paw-overlay-canvas"
                className="lesson-canvas-paw-overlay"
                ref={pawOverlayCanvasRef}
                width={512}
                height={512}
              ></canvas>

              <canvas
                id="drawing-canvas"
                className="lesson-canvas-draw"
                ref={drawingCanvasRef}
                width={512}
                height={512}
                onClick={handleCanvasColorClick}
                style={{
                  cursor: showColorizer
                    ? isDrawingState
                      ? "url('/dog/pencile.png') 0 32, auto"
                      : "url('/dog/paw.svg') 16 16, auto"
                    : "url('/dog/pencile.png') 0 32, auto",
                }}
              ></canvas>
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
                    currentStepIndex === lesson.steps.length - 1
                      ? "А я canvasкто ещё из знаменитых художников такое рисовал!"
                      : fibiSpeech
                  }
                />
              </div>
              {/* Кнопка открытия галереи вынесена отдельно */}
              {currentStepIndex === lesson.steps.length - 1 && (
                <div className="art-gallery-button-wrapper">
                  <button
                    className="art-gallery-open-button"
                    onClick={() => setShowGallery(true)}
                  >
                    Открыть галерею
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="lesson-toolbar">
            <label>Толщина кисти: </label>
            <input
              type="range"
              min={1}
              max={20}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
            <button
              className="lesson-button lesson-button-eraser"
              onClick={() => setIsEraser((prev) => !prev)}
            >
              {isEraser ? "Кисть" : "Ластик"}
            </button>
            <button
              className="lesson-button"
              onClick={() => {
                const canvas = drawingCanvasRef.current;
                const ctx = canvas?.getContext("2d");
                if (canvas && ctx && undoStack.length > 0) {
                  const last = undoStack[undoStack.length - 1];
                  ctx.putImageData(last, 0, 0);
                  setUndoStack((prev) => prev.slice(0, -1));
                }
              }}
            >
              Отменить
            </button>
            <button
              className="lesson-button lesson-button-clear"
              onClick={() => {
                if (
                  confirm(
                    "Уверены, что хотите очистить холст? Это действие нельзя отменить.",
                  )
                ) {
                  const canvas = drawingCanvasRef.current;
                  const ctx = canvas?.getContext("2d");
                  if (canvas && ctx) {
                    const fadeOut = () => {
                      let alpha = 1;
                      const fadeStep = () => {
                        ctx.fillStyle = `rgba(255,255,255,0.1)`;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        alpha -= 0.1;
                        if (alpha > 0) {
                          requestAnimationFrame(fadeStep);
                        } else {
                          ctx.clearRect(0, 0, canvas.width, canvas.height);
                          setUndoStack([]);
                        }
                      };
                      fadeStep();
                    };
                    fadeOut();
                  }
                }
              }}
            >
              Очистить
            </button>
            <button
              className="lesson-button lesson-button-save"
              onClick={() => {
                const drawingCanvas = drawingCanvasRef.current;
                if (!drawingCanvas) return;

                // Создаём временный canvas с белым фоном
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = drawingCanvas.width;
                tempCanvas.height = drawingCanvas.height;
                const tempCtx = tempCanvas.getContext("2d");
                if (!tempCtx) return;

                // Белый фон
                tempCtx.fillStyle = "#ffffff";
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

                // Отрисовываем рисунок с drawingCanvas (без lesson-canvas)
                tempCtx.drawImage(drawingCanvas, 0, 0);

                const link = document.createElement("a");
                link.download = `${lesson?.title || "drawing"}.png`;
                link.href = tempCanvas.toDataURL("image/png");
                link.click();
              }}
            >
              Сохранить
            </button>
          </div>
          <div className="lesson-brush-settings">
            <label>Цвет кисти: </label>
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
            />
            <label style={{ marginLeft: "10px" }}>Стиль кисти: </label>
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
              <option value="smooth">Обычная</option>
              <option value="sparkle">Блёстки</option>
              <option value="rainbow">Радуга</option>
              <option value="chameleon">Хамелеон</option>
              <option value="gradient">Градиент</option>
              <option value="neon">Неон</option>
              <option value="watercolor">Акварель</option>
            </select>
          </div>

          {/* Модалка галереи */}
          {showGallery &&
            lesson &&
            ReactDOM.createPortal(
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
            )}
        </div>
      ) : (
        <p>Загрузка урока...</p>
      )}
    </div>
  );
}
