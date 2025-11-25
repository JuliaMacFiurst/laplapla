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

  // Устанавливаем текст енота при первом появлении блока диалога
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      const rac = racTextRef.current;
      if (rac) {
        rac.innerHTML =
          "Енот: «Отметь на карте своё местоположение и построй морской маршрут до Шпицбергена (красный пин).»";
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
  }, [racTextRef]);

    const [svgLoaded, setSvgLoaded] = useState(false);

      // Стартовые координаты (нормированные)
  const [start, setStart] = useState({ x: 0.15, y: 0.75 });
  const [target] = useState({ x: 0.535, y: 0.075 });

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

  // Добавляем ResizeObserver для wrapRef, чтобы вызывать layoutPins при изменении размера
  useEffect(() => {
    if (!wrapRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      layoutPins();
    });
    resizeObserver.observe(wrapRef.current);

    return () => {
      if (wrapRef.current) resizeObserver.unobserve(wrapRef.current);
    };
  }, []);

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
      rac.innerHTML =
        'Енот хмурится: «Маршрут идёт по суше! <button id="reset-route-btn" class="dialog-next-btn">Перестроить маршрут</button>';
      return false;
    }

    // Проверка достижения цели
    if (isNearTarget(nx, ny)) {
      setDrawing(false);
      setRouteFinished(true);
      rac.innerHTML = "Енот: «Маршрут завершён!»";
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
      if (rac) rac.innerHTML = "Енот: «Маршрут завершён!»";
      evaluateRoute();
      return;
    }

    // Если уже есть начальная точка и маршрут НЕ завершён → продолжаем линию
    if (hasStartPointRef.current && !routeFinished && route.length > 0) {
      setDrawing(true);
      setRoute((prev) => [...prev, { x, y }]);
      const rac = racTextRef.current;
      if (rac) rac.innerHTML = "Енот: «Продолжаем маршрут!»";
      return;
    }

    // Иначе — начинаем новый маршрут
    setStart({ x, y });
    setHasStartPoint(true);

    setRoute([{ x, y }]);
    setRouteFinished(false);
    setDrawing(true);

    const rac = racTextRef.current;
    if (rac) rac.innerHTML = "Енот: «Теперь веди линию к Шпицбергену!»";
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
      if (rac) rac.innerHTML = "Енот: «Маршрут завершён!»";
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
      if (rac) rac.innerHTML = "Енот: «Маршрут завершён!»";
      evaluateRoute();
      return;
    }

    setDrawing(false);
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

    const touchedSeas = new Set<string>();

    // берём все точки кроме последней
    const pointsToCheck = route.slice(0, -1);

    const r = wrap.getBoundingClientRect();

    for (const p of pointsToCheck) {
      // если точка лежит в радиусе красного пина — игнорируем
      if (isNearTarget(p.x, p.y)) {
        continue;
      }
      const screenX = r.left + p.x * r.width;
      const screenY = r.top + p.y * r.height;

      const el = document.elementFromPoint(screenX, screenY);
      if (!el) continue;

      const hit = (el as HTMLElement).closest("[id]") as HTMLElement | null;

      if (hit && hit.id) {
        if (hit.id !== "__next") {
          touchedSeas.add(hit.id);
        }
      }
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
  }, []);

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

    const container = svgContainerRef.current;
    if (!container) return;

    makeDraggable(startPinRef, setStart);

    window.addEventListener("resize", layoutPins);

    return () => {
      window.removeEventListener("resize", layoutPins);
    };
  }, [svgLoaded]);

  // Обновлять позицию пинов при изменении координат
  useEffect(() => {
    layoutPins();
  }, [start, target]);

  useEffect(() => {
    if (routeFinished) {
      evaluateRoute();
    }
  }, [routeFinished, route]);

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