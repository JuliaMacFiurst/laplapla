import React, { useEffect, useRef, useState } from "react";
import { getMapSvg } from "@/utils/storageMaps";

export default function SeaMap({
  racTextRef,
}: {
  racTextRef: React.RefObject<HTMLDivElement | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

    const startPinRef = useRef<HTMLDivElement>(null);   // синяя точка
  const targetPinRef = useRef<HTMLDivElement>(null);  // красная точка

    const [svgLoaded, setSvgLoaded] = useState(false);

      // Стартовые координаты (нормированные)
  const [start, setStart] = useState({ x: 0.15, y: 0.75 });
  const [target, setTarget] = useState({ x: 0.535, y: 0.075 });

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

  function pxToNorm(px: number, py: number) {
    const wrap = wrapRef.current;
    if (!wrap) return { x: 0, y: 0 };
    const r = wrap.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (px - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (py - r.top) / r.height)),
    };
  }

  function normToPx(nx: number, ny: number) {
    const wrap = wrapRef.current;
    if (!wrap) return { x: 0, y: 0 };
    const r = wrap.getBoundingClientRect();
    return {
      x: nx * r.width,
      y: ny * r.height,
    };
  }

  function layoutPins() {
    const wrap = wrapRef.current;
    const s = startPinRef.current;
    const t = targetPinRef.current;
    if (!wrap || !s || !t) return;

    const r = wrap.getBoundingClientRect();

    s.style.left = start.x * r.width + "px";
    s.style.top = start.y * r.height + "px";

    t.style.left = target.x * r.width + "px";
    t.style.top = target.y * r.height + "px";
  }

  // Проверить, близко ли новая точка к красной (завершение маршрута)
  function isNearTarget(nx: number, ny: number) {
    const wrap = wrapRef.current;
    if (!wrap) return false;

    const tpx = target.x * wrap.clientWidth;
    const tpy = target.y * wrap.clientHeight;

    const px = nx * wrap.clientWidth;
    const py = ny * wrap.clientHeight;

    const dist = Math.hypot(px - tpx, py - tpy);
    return dist < 25; // радиус завершения маршрута
  }

  // ===========================
  //   ПРОВЕРКА МАРШРУТА ПО МОРЯМ
  // ===========================

  function evaluateRoute() {
    const wrap = wrapRef.current;
    const rac = racTextRef.current;
    if (!wrap || !rac) return;

    if (route.length < 2) {
      rac.innerHTML = "Енот: «Маршрут слишком короткий.»";
      return;
    }

    // Собираем моря
    const touchedSeas = new Set<string>();

    const r = wrap.getBoundingClientRect();

    for (const p of route) {
      const screenX = r.left + p.x * r.width;
      const screenY = r.top + p.y * r.height;

      const el = document.elementFromPoint(screenX, screenY);
      if (!el) continue;

      const hit = (el as HTMLElement).closest("[id]") as HTMLElement | null;

      // Нет id → суша → ошибка
      if (!hit || !hit.id) {
        rac.innerHTML =
          'Енот хмурится: «Маршрут идёт по суше! Выбери кнопку <button id="reset-route-btn" class="dialog-next-btn">Перестроить маршрут</button>».';
        return;
      }

      touchedSeas.add(hit.id);
    }

    // Если дошли сюда — маршрут успешный
    rac.innerHTML =
      "Енот улыбается: «Мы проплыли через: <strong>" +
      [...touchedSeas].join(", ") +
      "</strong>»";
  }

  // ===========================
  //   УДАЛИТЬ МАРШРУТ
  // ===========================

  function resetRoute() {
    setRoute([]);
    setRouteFinished(false);

    const rac = racTextRef.current;
    if (rac) {
      rac.innerHTML = "Енот: «Нарисуй маршрут между портом и Шпицбергеном.»";
    }
  }

  // ===========================
  // DRAG-логика для точек
  // ===========================

  function makeDraggable(
    ref: React.RefObject<HTMLDivElement | null>,
    setter: (xy: { x: number; y: number }) => void
  ) {
    const el = ref.current;
    if (!el) return;

    let dragging = false;

    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      dragging = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    });

    el.addEventListener("pointermove", (e) => {
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
    });

    el.addEventListener("pointerup", () => (dragging = false));
    el.addEventListener("pointercancel", () => (dragging = false));
  }

  // ===========================
  //  РИСОВАНИЕ МАРШРУТА
  // ===========================

  function onPointerDown(e: React.PointerEvent) {
    if (!wrapRef.current) return;

    const { x, y } = pxToNorm(e.clientX, e.clientY);

    // Всегда пересоздаём синюю точку в месте начала новой линии
    setStart({ x, y });
    setHasStartPoint(true);

    // Начинаем новую линию с этой точки
    setRoute([{ x, y }]);
    setRouteFinished(false);
    setDrawing(true);

    const rac = racTextRef.current;
    if (rac) rac.innerHTML = "Енот: «Теперь веди линию к Шпицбергену!»";
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawing || !wrapRef.current) return;

    const { x, y } = pxToNorm(e.clientX, e.clientY);

    // Add point to route
    setRoute((prev) => [...prev, { x, y }]);

    if (isNearTarget(x, y)) {
      setDrawing(false);
      setRouteFinished(true);
      evaluateRoute();
    }
  }

  function onPointerUp() {
    setDrawing(false);
  }

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

    layoutPins();
    makeDraggable(startPinRef, setStart);
    makeDraggable(targetPinRef, setTarget);

    window.addEventListener("resize", layoutPins);
  }, [svgLoaded]);

  // Обновлять позицию пинов при изменении координат
  useEffect(() => {
    layoutPins();
  }, [start, target]);

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
        </div></div></div>
  );
}