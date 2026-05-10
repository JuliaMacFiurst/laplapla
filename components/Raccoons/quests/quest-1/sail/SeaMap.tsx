import { useCallback, useEffect, useRef, useState } from "react";
import { getMapSvg } from "@/utils/storageMaps";
import seaNames from "@/utils/sea_names.json";
import { useQuest1I18n } from "../i18n";

function translateSea(id: string, lang: "ru" | "en" | "he") {
  const entry = (seaNames as any)[id];
  if (!entry) return id;
  return entry[lang] ?? entry.ru ?? id;
}

const INITIAL_START = { x: 0.15, y: 0.75 };
const TARGET_POINT = { x: 0.535, y: 0.075 };

export default function SeaMap({
  racTextRef,
}: {
  racTextRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { lang, t } = useQuest1I18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const startPinRef = useRef<HTMLDivElement>(null);   // синяя точка
  const targetPinRef = useRef<HTMLDivElement>(null);  // красная точка

  // Устанавливаем текст енота при первом появлении блока диалога
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      const rac = racTextRef.current;
      if (rac) {
        rac.innerHTML = t.day3Sail.mapSpeech.startPrompt;
        clearInterval(timer);
        return;
      }

      tries++;
      if (tries > 40) {
        clearInterval(timer);
      }
    }, 50);

    return () => {
      clearInterval(timer);
    };
  }, [racTextRef, t.day3Sail.mapSpeech.startPrompt]);

    const [svgLoaded, setSvgLoaded] = useState(false);

      // Стартовые координаты (нормированные)
  const [start, setStart] = useState(INITIAL_START);

    // Пользовательский маршрут (список точек нормированных)
  const [route, setRoute] = useState<{ x: number; y: number }[]>([]);

  const [drawing, setDrawing] = useState(false);      // режим рисования
  const [routeFinished, setRouteFinished] = useState(false);

  const [hasStartPoint, setHasStartPoint] = useState(false);
  const hasStartPointRef = useRef(false);

  useEffect(() => {
    hasStartPointRef.current = hasStartPoint;
  }, [hasStartPoint]);

  // ===========================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ===========================

  const pxToNorm = useCallback((px: number, py: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return { x: 0, y: 0 };
    const r = wrap.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (px - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (py - r.top) / r.height)),
    };
  }, []);

  const layoutPins = useCallback(() => {
    const wrap = wrapRef.current;
    const s = startPinRef.current;
    const targetPin = targetPinRef.current;
    if (!wrap || !s || !targetPin) return;

    const r = wrap.getBoundingClientRect();

    s.style.left = start.x * r.width + "px";
    s.style.top = start.y * r.height + "px";

    targetPin.style.left = TARGET_POINT.x * r.width + "px";
    targetPin.style.top = TARGET_POINT.y * r.height + "px";
  }, [start]);

  // Добавляем ResizeObserver для wrapRef, чтобы вызывать layoutPins при изменении размера
  useEffect(() => {
    const wrapEl = wrapRef.current;
    if (!wrapEl) return;

    const resizeObserver = new ResizeObserver(() => {
      layoutPins();
    });
    resizeObserver.observe(wrapEl);

    return () => {
      resizeObserver.unobserve(wrapEl);
    };
  }, [layoutPins]);

  // Проверить, близко ли новая точка к красной (завершение маршрута)
  const isNearTarget = useCallback((nx: number, ny: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return false;

    const tpx = TARGET_POINT.x * wrap.clientWidth;
    const tpy = TARGET_POINT.y * wrap.clientHeight;

    const px = nx * wrap.clientWidth;
    const py = ny * wrap.clientHeight;

    const dist = Math.hypot(px - tpx, py - tpy);
    return dist < 25; // радиус завершения маршрута
  }, []);

  const evaluateRoute = useCallback(() => {
    const wrap = wrapRef.current;
    const rac = racTextRef.current;
    if (!wrap || !rac) return;

    if (route.length < 2) {
      rac.innerHTML = t.day3Sail.mapSpeech.routeTooShort;
      return;
    }

    const touchedSeas = new Set<string>();

    const pointsToCheck = route.slice(0, -1);
    const r = wrap.getBoundingClientRect();

    for (const p of pointsToCheck) {
      if (isNearTarget(p.x, p.y)) {
        continue;
      }
      const screenX = r.left + p.x * r.width;
      const screenY = r.top + p.y * r.height;

      const el = document.elementFromPoint(screenX, screenY);
      if (!el) continue;

      const hit = (el as HTMLElement).closest("[id]") as HTMLElement | null;

      if (hit && hit.id && hit.id !== "__next") {
        touchedSeas.add(hit.id);
      }
    }

    const seas = [...touchedSeas].map(id => translateSea(id, lang)).join(", ");
    rac.innerHTML = t.day3Sail.mapSpeech.routeThroughSeas.replace("{seas}", seas);
  }, [isNearTarget, lang, racTextRef, route, t.day3Sail.mapSpeech.routeThroughSeas, t.day3Sail.mapSpeech.routeTooShort]);

  // Универсальная проверка точки маршрута
  function validatePoint(nx: number, ny: number) {
    // если точка попала в зону красного пина — НЕ проверяем сушу
    if (isNearTarget(nx, ny)) {
      return true;
    }

    const wrap = wrapRef.current;
    const rac = racTextRef.current;
    if (!wrap || !rac) return false;

    const r = wrap.getBoundingClientRect();
    const screenX = r.left + nx * r.width;
    const screenY = r.top + ny * r.height;

    const el = document.elementFromPoint(screenX, screenY);
    if (!el) return false;

    const hit = (el as HTMLElement).closest("[id]") as HTMLElement | null;

    // Проверка суши
    if (!hit || !hit.id || hit.tagName.toLowerCase() !== "path" || hit.classList.contains("land")) {
      rac.innerHTML = t.day3Sail.mapSpeech.landError;
      return false;
    }

    // Проверка достижения цели
    if (isNearTarget(nx, ny)) {
      setDrawing(false);
      setRouteFinished(true);
      rac.innerHTML = t.day3Sail.mapSpeech.routeComplete;
      evaluateRoute();
      return true;
    }

    return true;
  }

  // ===========================
  //  РИСОВАНИЕ МАРШРУТА
  // ===========================

  function onPointerDown(e: React.PointerEvent) {
    if (!wrapRef.current) return;

    const { x, y } = pxToNorm(e.clientX, e.clientY);
    validatePoint(x, y);

    // A. Finish if direct tap on red pin
    if (isNearTarget(x, y)) {
      setRoute((prev) => [...prev, { x, y }]);
      setDrawing(false);
      setRouteFinished(true);
      const rac = racTextRef.current;
      if (rac) rac.innerHTML = t.day3Sail.mapSpeech.routeComplete;
      evaluateRoute();
      return;
    }

    // Если уже есть начальная точка и маршрут НЕ завершён → продолжаем линию
    if (hasStartPointRef.current && !routeFinished && route.length > 0) {
      setDrawing(true);
      setRoute((prev) => [...prev, { x, y }]);
      const rac = racTextRef.current;
      if (rac) rac.innerHTML = t.day3Sail.mapSpeech.continueRoute;
      return;
    }

    // Иначе — начинаем новый маршрут
    setStart({ x, y });
    setHasStartPoint(true);

    setRoute([{ x, y }]);
    setRouteFinished(false);
    setDrawing(true);

    const rac = racTextRef.current;
    if (rac) rac.innerHTML = t.day3Sail.mapSpeech.guideToSpitsbergen;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawing || !wrapRef.current) return;

    const { x, y } = pxToNorm(e.clientX, e.clientY);

    // B. Finish when crossing red pin during drawing
    if (isNearTarget(x, y)) {
      setRoute((prev) => [...prev, { x, y }]);
      setDrawing(false);
      setRouteFinished(true);
      const rac = racTextRef.current;
      if (rac) rac.innerHTML = t.day3Sail.mapSpeech.routeComplete;
      evaluateRoute();
      return;
    }

    setRoute((prev) => [...prev, { x, y }]);
    validatePoint(x, y);
  }

  function onPointerUp(e: React.PointerEvent) {
    const { x, y } = pxToNorm(e.clientX, e.clientY);
    validatePoint(x, y);

    // C. Finish if finger released near red pin
    if (isNearTarget(x, y)) {
      setRoute((prev) => [...prev, { x, y }]);
      setDrawing(false);
      setRouteFinished(true);
      const rac = racTextRef.current;
      if (rac) rac.innerHTML = t.day3Sail.mapSpeech.routeComplete;
      evaluateRoute();
      return;
    }

    setDrawing(false);
  }

  // ===========================
  //   ПРОВЕРКА МАРШРУТА ПО МОРЯМ
  // ===========================

  // ===========================
  //   УДАЛИТЬ МАРШРУТ
  // ===========================

  const resetRoute = useCallback(() => {
    setRoute([]);
    setRouteFinished(false);

    const rac = racTextRef.current;
    if (rac) {
      rac.innerHTML = t.day3Sail.mapSpeech.resetPrompt;
    }
  }, [racTextRef, t.day3Sail.mapSpeech.resetPrompt]);

  useEffect(() => {
    const rac = racTextRef.current;
    if (!rac) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest("#reset-route-btn")) {
        e.preventDefault();
        resetRoute();
      }
    };

    rac.addEventListener("click", handleClick);

    return () => {
      rac.removeEventListener("click", handleClick);
    };
  }, [racTextRef, resetRoute]);

  // ===========================
  // DRAG-логика для точек
  // ===========================

  const makeDraggable = useCallback((
    ref: React.RefObject<HTMLDivElement | null>,
    setter: (xy: { x: number; y: number }) => void
  ) => {
    const el = ref.current;
    if (!el) return () => {};

    let dragging = false;

    const handlePointerDown = (e: PointerEvent) => {
      e.stopPropagation();
      dragging = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      e.stopPropagation();
      if (!(e.buttons & 1)) return;
      if (!dragging) return;

      const wrap = wrapRef.current;
      if (!wrap) return;

      const r = wrap.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;

      setter({
        x: Math.min(1, Math.max(0, nx)),
        y: Math.min(1, Math.max(0, ny)),
      });

      if (ref === startPinRef) {
        setHasStartPoint(true);
        resetRoute();
      }
    };

    const stopDragging = () => {
      dragging = false;
    };

    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerup", stopDragging);
    el.addEventListener("pointercancel", stopDragging);

    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerup", stopDragging);
      el.removeEventListener("pointercancel", stopDragging);
    };
  }, [resetRoute]);

  // ===========================
  //   Монтирование SVG-карты
  // ===========================

  useEffect(() => {
    async function loadSvg() {
      const svgContent = await getMapSvg("seas/seas-colored-bordered.svg");
      if (svgContainerRef.current && svgContent) {
        svgContainerRef.current.innerHTML = svgContent;
      }
      setSvgLoaded(true);
    }
    loadSvg();
  }, []);

  useEffect(() => {
    if (!svgLoaded) return;

    const cleanupDrag = makeDraggable(startPinRef, setStart);

    window.addEventListener("resize", layoutPins);
    layoutPins();

    return () => {
      cleanupDrag();
      window.removeEventListener("resize", layoutPins);
    };
  }, [layoutPins, makeDraggable, svgLoaded]);

  // Обновлять позицию пинов при изменении координат
  useEffect(() => {
    layoutPins();
  }, [layoutPins]);

  useEffect(() => {
    if (routeFinished) {
      evaluateRoute();
    }
  }, [evaluateRoute, routeFinished]);

  // ===========================
  //    РЕНДЕР
  // ===========================

  return (
    <div className="map-center">
      <div className="map-frame">
        <div
          className="quest-map"
          ref={wrapRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* SVG карта */}
          <div ref={svgContainerRef}></div>

          {/* Пины */}
          {hasStartPoint && <div className="quest-pin-start" ref={startPinRef}></div>}
          <div className="quest-pin-end" ref={targetPinRef}></div>

          {/* Рисуем пользовательскую линию */}
          <svg className="quest-route-svg" viewBox="0 0 2000 856" preserveAspectRatio="none">
            <polyline
              points={route
                .map((p) => {
                  const px = p.x * 2000;
                  const py = p.y * 856;
                  return `${px},${py}`;
                })
                .join(" ")}
              stroke="#ff5533"
              strokeWidth="8"
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
         {/* Raccoon */}
          <div className="raccoon-sailor-absolute">
            <video
              className="quest-sialor-video"
              autoPlay
              muted
              loop
              playsInline
              src="/supabase-storage/quests/1_quest/images/sailor-raccoon.webm"
            />
          </div>

          {/* Bulldog */}
          <div className="bulldog-absolute">
            <video
              className="quest-buldog-video"
              autoPlay
              muted
              loop
              playsInline
              src="/supabase-storage/quests/1_quest/images/buldog-roland.webm"
            />
          </div>
        </div></div>
  );
}
