import { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { buildRegionMap } from "@/utils/buildRegionMap";
import { paintRegionFast } from "@/utils/paintRegionFast";
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
  const regionDataRef = useRef<ReturnType<typeof buildRegionMap> | null>(null)
  const [showColorizer, setShowColorizer] = useState(false);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const colorCanvasRef = useRef<HTMLCanvasElement>(null);

  const debugRenderRegions = () => {
  const drawingCanvas = drawingCanvasRef.current
  const colorCanvas = colorCanvasRef.current

  if (!drawingCanvas || !colorCanvas) return
  const cctx = colorCanvas.getContext("2d");
  if (!cctx) return;

  if (!regionDataRef.current) {
    computeRegionMap()
  }

  const result = regionDataRef.current
  if (!result) return

  const { width, height, regionMap } = result

    const out = cctx.createImageData(width, height);
    const data = out.data;

    const regionColors: Record<number, [number, number, number]> = {};

    for (let i = 0; i < regionMap.length; i++) {
      const region = regionMap[i];
      const idx = i * 4;

      if (region < 0) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
        continue;
      }

      if (!regionColors[region]) {
        regionColors[region] = [
          Math.floor(Math.random() * 255),
          Math.floor(Math.random() * 255),
          Math.floor(Math.random() * 255),
        ];
      }

      const [r, g, b] = regionColors[region];

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 200;
    }

    cctx.putImageData(out, 0, 0);
  };

  const isDrawing = useRef(false);
  // Для плавных кистей: храним hue и прогресс градиента
  const hueRef = useRef(0);
  const gradientProgressRef = useRef(0);

  const computeRegionMap = () => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;

    const ctx = drawingCanvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(
      0,
      0,
      drawingCanvas.width,
      drawingCanvas.height
    );

    regionDataRef.current = buildRegionMap(imageData);

    console.log(
      "Region map built:",
      regionDataRef.current?.regionCount,
      "regions"
    );
  };

  const handleColorize = () => {
    if (!regionDataRef.current) {
      computeRegionMap();
    }

    const colorCanvas = colorCanvasRef.current
    const ctx = colorCanvas?.getContext("2d")

    if (!ctx || !regionDataRef.current) return

    paintRegionFast(
      ctx,
      regionDataRef.current,
      0,
      [255, 0, 0]
    )

    // здесь позже запустим анимацию заливки
  };

  // Simple click-to-color prototype: clicking the canvas colors the region that was clicked
  const handleCanvasColorClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

    const pixelIndex = y * width + x;
    const regionId = regionMap[pixelIndex];

    if (regionId < 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // random color for testing
    const color: [number, number, number] = [
      Math.floor(Math.random() * 255),
      Math.floor(Math.random() * 255),
      Math.floor(Math.random() * 255),
    ];

    paintRegionFast(ctx, regionDataRef.current, regionId, color);
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
    ctx.lineWidth = brushSizeRef.current;
    // Используем brushStyleRef и brushColorRef внутри условных блоков
    const style = brushStyleRef.current;
    const color = brushColorRef.current;
    ctx.strokeStyle = color;
    const isSmooth = style === "smooth" || style === "watercolor";
    ctx.lineJoin = isSmooth ? "round" : "miter";
    ctx.lineCap = isSmooth ? "round" : "butt";
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
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      if (!ctx) return;
      setUndoStack((prev) => {
        const ctxCopy = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return [...prev, ctxCopy];
      });
      isDrawing.current = true;
      // while drawing we disable color click logic
      const { x, y } = getCoordinates(e);
      ctx.globalCompositeOperation = isEraserRef.current
        ? "destination-out"
        : "source-over";
      applyBrushSettings(ctx);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const endDrawing = () => {
      isDrawing.current = false;
      ctx.beginPath();

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
              <canvas
                id="lesson-canvas"
                className="lesson-canvas-bg"
                ref={canvasRef}
                width={512}
                height={512}
              ></canvas>

              <canvas
                id="color-canvas"
                className="lesson-canvas-color"
                ref={colorCanvasRef}
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
                      ? "А я знаю, кто ещё из знаменитых художников такое рисовал!"
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
