import React, { useEffect, useRef, useState } from "react";
import { getMapSvg } from "@/utils/storageMaps";
import { starInfoList } from "@/utils/starInfo";

export default function StarsMap({
  racTextRef,
}: {
  racTextRef: React.RefObject<HTMLDivElement | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLElement | null>(null);

  const [svgLoaded, setSvgLoaded] = useState(false);

  // Загружаем SVG карты
  useEffect(() => {
    async function loadSvg() {
      const svgContent = await getMapSvg("north-stars/north-stars.svg");

      if (svgContainerRef.current && svgContent) {
        svgContainerRef.current.innerHTML = svgContent;
      }

      setSvgLoaded(true);
    }

    loadSvg();
  }, []);

  // Обработка кликов по звездам → запись в верхний спичклауд
  useEffect(() => {
    if (!svgLoaded || !svgContainerRef.current) return;

    const root = svgContainerRef.current;

    function onClick(e: MouseEvent) {
      const el = e.target as HTMLElement;
      const starEl = el.closest("[id]") as HTMLElement | null;

      console.log("[StarsMap] click", {
        rawTarget: el,
        starEl,
        id: starEl?.id,
      });

      if (!starEl) return;

      // Remove highlight from previously selected star
      if (selectedRef.current) {
        selectedRef.current.classList.remove("star-selected");
      }

      // Add highlight to the new star
      starEl.classList.add("star-selected");
      selectedRef.current = starEl;

      const starId = starEl.id;
      const info = starInfoList.find((s) => s.id === starId);
      if (!info) return;

      if (racTextRef.current) {
        racTextRef.current.innerHTML = `Енот: «${info.name}. ${info.description}»`;
      }
    }

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [svgLoaded, racTextRef]);

  return (
    <div className="map-center">
      <div className="stars-map-frame">
      <div className="stars-map-container">*
        <div className="stars-map" ref={wrapRef}>
          <div ref={svgContainerRef}></div>
        </div>
      </div>

        {/* Raccoon */}
        <div className="raccoon-stars-absolute">
          <video
            className="quest-raccoon-stars-video"
            autoPlay
            muted
            loop
            playsInline
            src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/sailor-raccoon.webm"
          />
        </div>

        {/* Svensen */}
        <div className="svensen-absolute">
          <video
            className="quest-svensen-video"
            autoPlay
            muted
            loop
            playsInline
            src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/svensen-talks.webm"
          />
        </div>

        <div ref={racTextRef} className="raccoon-text"></div>
      </div>
    </div>
  );
}