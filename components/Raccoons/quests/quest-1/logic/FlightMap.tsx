"use client";

import React, { useEffect, useRef, useState } from "react";
import { initRouteLogic } from "./initRouteLogic";
import { getMapSvg } from "@/utils/storageMaps";
import countryNames from "@/utils/country_names.json";

const BAD_IDS = new Set([
  "btn-start",
  "btn-end",
  "map-svg-container",
  "route-svg",
  "route-path",
  "map-wrap",
  "route-root",
  "svalbard-marker",
  "__next",
]);

function getCountryRu(id: string): string {
  const entry = (countryNames as Record<string, any>)[id];
  return entry?.ru || id;
}

export default function FlightMap({
  racTextRef,
  routeType,
}: {
  racTextRef: React.RefObject<HTMLDivElement | null>;
  routeType: "straight" | "arc" | "zigzag" | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const routeSvgRef = useRef<SVGSVGElement>(null);
  const routePathRef = useRef<SVGPathElement>(null);
  const pinStartRef = useRef<HTMLDivElement>(null);
  const pinEndRef = useRef<HTMLDivElement>(null);
  const svalMkRef = useRef<HTMLDivElement>(null);

  const [svgLoaded, setSvgLoaded] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0.15, y: 0.65 }); // стартовая точка в состоянии
  const sval = { x: 0.517, y: 0.015 };      // координаты Шпицбергена по твоему указанию

  function toSvg(px: number, py: number) {
    const svg = routeSvgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return { x: 0, y: 0 };
    const vb = svg.viewBox.baseVal;
    const r = wrap.getBoundingClientRect();
    return {
      x: vb.x + (px / r.width) * vb.width,
      y: vb.y + (py / r.height) * vb.height,
    };
  }

  function drawRoute(type: "straight" | "arc" | "zigzag" | null) {
    const path = routePathRef.current;
    const svg = routeSvgRef.current;
    const wrap = wrapRef.current;
    if (!path || !svg || !wrap || !type) {
      if (path) path.setAttribute("d", "");
      return;
    }

    const r = wrap.getBoundingClientRect();
    const A = toSvg(startPoint.x * r.width, startPoint.y * r.height);
    const B = toSvg(sval.x * r.width, sval.y * r.height);

    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const dist = Math.hypot(dx, dy);

    let d = "";
    if (type === "straight") {
      d = `M ${A.x} ${A.y} L ${B.x} ${B.y}`;
    } else if (type === "arc") {
      const mx = (A.x + B.x) / 2;
      const my = (A.y + B.y) / 2 - dist * 0.5;
      d = `M ${A.x} ${A.y} Q ${mx} ${my} ${B.x} ${B.y}`;
    } else if (type === "zigzag") {
      const N = 8;
      const amp = dist * 0.3;
      const ang = Math.atan2(dy, dx);
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const seg = [];
      for (let i = 1; i < N; i++) {
        const t = i / N;
        const bx = A.x + dx * t;
        const by = A.y + dy * t;
        const s = i % 2 === 0 ? 1 : -1;
        seg.push(`L ${bx + nx * amp * s} ${by + ny * amp * s}`);
      }
      d = `M ${A.x} ${A.y} ${seg.join(" ")} L ${B.x} ${B.y}`;
    }

    path.setAttribute("d", d);
    updateRaccoonSpeech(type);
  }

  function getCountriesOnRoute(): string[] {
    const path = routePathRef.current;
    const svg = routeSvgRef.current;
    const wrap = wrapRef.current;
    if (!path || !svg || !wrap) return [];

    const out = new Set<string>();
    const len = path.getTotalLength();
    const STEP = 12;

    for (let L = 0; L <= len; L += STEP) {
      const p = path.getPointAtLength(L);
      const sp = svg.createSVGPoint();
      sp.x = p.x;
      sp.y = p.y;

      const screenPoint = sp.matrixTransform(svg.getScreenCTM()!);

      const prev = path.style.pointerEvents;
      path.style.pointerEvents = "none";

      const el = document.elementFromPoint(screenPoint.x, screenPoint.y);

      path.style.pointerEvents = prev;
      if (!el) continue;

      const hit = (el as HTMLElement).closest("[id]") as HTMLElement | null;
      if (!hit) continue;

      const id = hit.id.toLowerCase();
      if (!BAD_IDS.has(id)) out.add(id);
    }

    return [...out];
  }

  function updateRaccoonSpeech(type: "straight" | "arc" | "zigzag" | null) {
    const racText = racTextRef.current;
    if (!racText) return;

    if (!type) {
      racText.innerHTML = "Енот: «Выбери тип маршрута — прямая, дуга или зигзаг.»";
      return;
    }

    const ids = getCountriesOnRoute();
    if (!ids.length) {
      racText.innerHTML = "Енот щурится: «Похоже, летим над океаном!»";
      return;
    }

    const names = ids.map((id) => getCountryRu(id));
    racText.innerHTML = `Енот ведёт пальцем: «Мы пролетаем над: <strong>${names.join(
      ", "
    )}</strong>»`;
  }

  useEffect(() => {
    async function loadSvg() {
      const svgContent = (await getMapSvg("countries/countries_interactive.svg")) || "";
      if (svgContainerRef.current) {
        svgContainerRef.current.innerHTML = svgContent;
      }
      setSvgLoaded(true);
      if (racTextRef.current) {
  racTextRef.current.innerHTML = "Енот: «Нарисуй маршрут между портом и Шпицбергеном.»";
}
    }
    loadSvg();
  }, []);

  useEffect(() => {
    if (!svgLoaded) return;

    const wrap = wrapRef.current;
    const racText = racTextRef.current;
    const pinStart = pinStartRef.current;
    const pinEnd = pinEndRef.current;

    if (!wrap || !racText || !pinStart || !pinEnd) return;

    // Создаём отдельный объект стартовой точки для initRouteLogic,
    // чтобы он мог его мутировать, а мы будем синхронизировать состояние через onStartMove.
    const start = { ...startPoint };

    // Ждём появления маркера Шпицбергена, он рендерится чуть позже
    const tryInit = () => {
      const svalMk = svalMkRef.current;

      // Ждём появления слоя маршрута (SVG + PATH)
      if (!routeSvgRef.current || !routePathRef.current) {
        setTimeout(tryInit, 10);
        return;
      }

      // Ждём появления маркера Шпицбергена
      if (!svalMk) {
        setTimeout(tryInit, 10);
        return;
      }

      initRouteLogic({
        wrap,
        pinStart,
        pinEnd,
        racText,
        svalMk,
        start,
        sval,
        onStartMove: () => {
          const wrapEl = wrapRef.current;
          const pinStartEl = pinStartRef.current;
          if (!wrapEl || !pinStartEl) {
            drawRoute(routeType);
            updateRaccoonSpeech(routeType);
            return;
          }

          const r = wrapEl.getBoundingClientRect();
          const left = parseFloat(pinStartEl.style.left || "0");
          const top = parseFloat(pinStartEl.style.top || "0");

          if (r.width > 0 && r.height > 0 && !Number.isNaN(left) && !Number.isNaN(top)) {
            const nx = left / r.width;
            const ny = top / r.height;
            setStartPoint({ x: nx, y: ny });
          } else {
            drawRoute(routeType);
            updateRaccoonSpeech(routeType);
          }
        },
      });
    };

    // Стартуем проверку
    tryInit();
  }, [svgLoaded, racTextRef]);

  useEffect(() => {
    if (!svgLoaded) return;
    drawRoute(routeType);
    updateRaccoonSpeech(routeType);
  }, [routeType, startPoint, svgLoaded]);

  useEffect(() => {
    if (!svgLoaded) return;

    function safeDraw() {
        const wrap = wrapRef.current;
        if (!wrap) return;

        const r = wrap.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) {
            requestAnimationFrame(safeDraw);
            return;
        }

        drawRoute(routeType);
        updateRaccoonSpeech(routeType);
    }

    requestAnimationFrame(safeDraw);
  }, [svgLoaded, routeType, startPoint]);

  return (
    <div className="map-center">
      <div className="map-frame">
        <div id="map-wrap" className="quest-map" ref={wrapRef}>
          <div ref={svgContainerRef}></div>
          <div className="quest-pin-start" ref={pinStartRef}></div>
          <div className="quest-pin-end" ref={pinEndRef}></div>
          <div id="svalbard-marker" className="quest-pin-svalbard" ref={svalMkRef}></div>
          <div id="svalbard-label" className="quest-svalbard-label">Шпицберген</div>
          <svg
            ref={routeSvgRef}
            className="quest-route-svg"
            viewBox="0 0 2000 856"
            preserveAspectRatio="none"
          >
            <path ref={routePathRef} className="quest-route-path" />
          </svg>
        </div>

        {/* Raccoon */}
        <div className="raccoon-absolute">
          <video
          className="quest-raccoon-video"
          autoPlay
          muted
          loop
          playsInline
          src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/raccoon-points.webm"
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
          src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/buldog-roland.webm"
        />
      </div>
    </div>
    </div>
  );
}