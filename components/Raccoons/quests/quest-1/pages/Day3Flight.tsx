import { useEffect, useRef, useState } from "react";
import { initRouteLogic } from "../logic/initRouteLogic";
import type { PageId } from "../QuestEngine";
import { getMapSvg } from "@/utils/storageMaps";

export default function Day3Flight({ go }: { go: (id: PageId) => void }) {

  // ---------- все useRef ----------
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pinStartRef = useRef<HTMLDivElement>(null);
  const pinEndRef = useRef<HTMLDivElement>(null);
  const racTextRef = useRef<HTMLDivElement>(null);
  const svalMkRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const [svgLoaded, setSvgLoaded] = useState(false);

  const start = { x: 0.33, y: 0.63 };
  const sval = { x: 0.517, y: 0.015 };

  // ---------- загрузка карты из Supabase ----------
  useEffect(() => {
    (async () => {
      const svg = await getMapSvg("countries/countries_interactive.svg");
      if (!svg) return;
      if (svgContainerRef.current) {
        svgContainerRef.current.innerHTML = svg;
        setSvgLoaded(true);
      }
    })();
  }, []);

  // ---------- инициализация логики маршрута ----------
  useEffect(() => {
    if (!svgLoaded) return;

    initRouteLogic({
      wrap: wrapRef.current!,
      pathEl: pathRef.current!,
      routeSvg: svgRef.current!,
      pinStart: pinStartRef.current!,
      pinEnd: pinEndRef.current!,
      racText: racTextRef.current!,
      svalMk: svalMkRef.current!,
      start,
      sval,
    });

  }, [svgLoaded]);
  // ======================================================
  // ✅ RENDER
  // ======================================================
  return (
    <div className="quest-wrapper">

      <div className="quest-story-text">
        <h2 className="page-title quest-center">Прокладываем маршрут</h2>
        <p className="quest-p quest-em">
          Енот надевает лётный шлем и говорит:
          </p>
          <p className="quest-p">
            «Роланд, ставь синюю кнопку на свой дом!»
          </p>
      </div>

      <div className="quest-flex-row">
        <div className="quest-tips">
          <p className="quest-hint-blue">Синяя точка — твой дом.</p>
          <p className="quest-hint-red">Красная точка — Шпицберген.</p>
          <p className="quest-hint-green">
            Когда выберешь маршрут — прямой, дугой или зигзагом — енот покажет,
            над какими странами вы пролетите.
          </p>
        </div>
        <div className="quest-video-conteiner">
        <video
          className="quest-video"
          autoPlay
          loop
          muted
          playsInline
          src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/route.webm"
        />
        </div>
      </div>

      {/* MAP */}
      <div id="map-wrap" ref={wrapRef} className="quest-map">
        <div ref={svgContainerRef}></div>

        <div ref={svalMkRef} id="svalbard-marker" className="quest-pin-svalbard"></div>
        <div id="svalbard-label" className="quest-svalbard-label">Шпицберген</div>

        <svg
          ref={svgRef}
          id="route-svg"
          className="quest-route-svg"
          viewBox="0 0 2000 856"
          preserveAspectRatio="xMidYMid meet"
        >
          <path ref={pathRef} id="route-path" className="quest-route-path"></path>
        </svg>

        <div ref={pinStartRef} id="btn-start" className="quest-pin-start"></div>
        <div ref={pinEndRef} id="btn-end" className="quest-pin-end"></div>
      </div>

      {/* BUTTONS */}
      <div className="quest-controls">
        <button className="quest-route-btn" data-type="straight">Прямая</button>
        <button className="quest-route-btn" data-type="arc">Дуга</button>
        <button className="quest-route-btn" data-type="zigzag">Зигзаг</button>
      </div>

      {/* RACCOON */}
      <div className="quest-raccoon">
        <video
          className="quest-raccoon-video"
          autoPlay
          muted
          loop
          playsInline
          src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/raccoon-points.webm"
        />
        <div ref={racTextRef} id="raccoonText" className="quest-speech">
          Енот: «Выбери тип маршрута.»
        </div>
      </div>
    </div>
  );
}