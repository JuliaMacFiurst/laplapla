"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef
} from "react";
import { getMapSvg } from "@/utils/storageMaps";
import { starInfoList } from "@/utils/starInfo";
import { StarDialogueStep } from "@/utils/starRouteDialogs";

type StepId =
  | "first_click"
  | "click_merak"
  | "click_dubhe"
  | "correct_line"
  | "wrong_line"
  | "click_polaris"
  | "finish"
  | `wrong-star:${string}`;

const StarsMap = forwardRef(function StarsMap(
  {
    racTextRef,
    onStep
  }: {
    racTextRef: React.RefObject<HTMLDivElement | null>;
    onStep?: (id: StepId) => void;
  },
  ref
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const [svgLoaded, setSvgLoaded] = useState(false);

  const [foundStars, setFoundStars] = useState<string[]>([]);

  const [routeStep, setRouteStep] = useState<
    "idle" | "waiting_merak" | "waiting_dubhe"  | "waiting_polaris" | "completed"
  >("idle");

  const [routeLine, setRouteLine] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  useImperativeHandle(ref, () => ({
  startRoute() {
    setRouteStep("waiting_merak");
  },
  getRouteStep() {
    return routeStep;
  }
}));

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

  useEffect(() => {
    if (!svgLoaded || !svgContainerRef.current) return;

    const root = svgContainerRef.current;

    function onClick(e: MouseEvent) {
      // Предварительный клик до старта маршрута (routeStep === "idle")
      if (routeStep === "idle") {
        setTimeout(() => onStep?.("first_click"), 0);
      }
      const el = e.target as HTMLElement;
      const starEl = el.closest("[id]") as HTMLElement | null;

      // Ошибка: клик мимо — для Мерака
      if (!starEl && routeStep === "waiting_merak") {
        setTimeout(() => onStep?.("wrong-star:merak_no_id"), 0);
        return;
      }

      // Ошибка: клик мимо — для Дубхе
      if (!starEl && routeStep === "waiting_dubhe") {
        setTimeout(() => onStep?.("wrong-star:dubhe_no_id"), 0);
        return;
      }

      if (!starEl) return;

      const starId = starEl.id;
      // === Всегда обновляем информацию енота о звезде ===
      const info = starInfoList.find((s) => s.id === starId);
      if (info && racTextRef.current) {
        racTextRef.current.innerHTML = `Енот: «${info.name}. ${info.description}»`;
      }

      if (routeStep === "waiting_merak") {
        if (starId === "Merak-Star") {
          starEl.classList.add("star-glow-strong");
          setFoundStars((prev) => [...prev, starId]);
          setTimeout(() => onStep?.("click_merak"), 0);
          setRouteStep("waiting_dubhe");
          return;
        }
        if (starId !== "Merak-Star") {
          const infoWrong = starInfoList.find((s) => s.id === starId);
          const human = infoWrong ? infoWrong.name : "неизвестная звезда";
          setTimeout(() => onStep?.(`wrong-star:${human}` as StepId), 0);
          return;
        }
      }

      if (routeStep === "waiting_dubhe") {
        if (starId === "Dubhe-Star") {
          starEl.classList.add("star-glow-strong");
          setFoundStars((prev) => [...prev, starId]);
          setTimeout(() => onStep?.("click_dubhe"), 0);
          setRouteStep("waiting_polaris");
          return;
        }
        if (starId !== "Dubhe-Star") {
          const infoWrong = starInfoList.find((s) => s.id === starId);
          const human = infoWrong ? infoWrong.name : "неизвестная звезда";
          setTimeout(() => onStep?.(`wrong-star:${human}` as StepId), 0);
          return;
        }
      }

      if (routeStep === "waiting_polaris" && starId === "Polar-Star") {
        const merakEl = root.querySelector("#Merak-Star") as HTMLElement | null;
        const dubheEl = root.querySelector("#Dubhe-Star") as HTMLElement | null;
        const polarisEl = root.querySelector("#Polar-Star") as HTMLElement | null;
        if (merakEl && dubheEl && polarisEl) {
          const merakRect = merakEl.getBoundingClientRect();
          const dubheRect = dubheEl.getBoundingClientRect();
          const polarisRect = polarisEl.getBoundingClientRect();

          const x1 =
            (merakRect.left + merakRect.right + dubheRect.left + dubheRect.right) /
              4 -
            root.getBoundingClientRect().left;
          const y1 =
            (merakRect.top + merakRect.bottom + dubheRect.top + dubheRect.bottom) /
              4 -
            root.getBoundingClientRect().top;
          const x2 =
            (polarisRect.left + polarisRect.right) / 2 -
            root.getBoundingClientRect().left;
          const y2 =
            (polarisRect.top + polarisRect.bottom) / 2 -
            root.getBoundingClientRect().top;

          setRouteLine({ x1, y1, x2, y2 });
          polarisEl.classList.add("star-glow-strong");

          setTimeout(() => onStep?.("click_polaris"), 0);
          setTimeout(() => onStep?.("finish"), 0);

          setRouteStep("completed");
        }
      }

    }

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [svgLoaded, routeStep, onStep, racTextRef]);

  return (
    <div className="map-center">
      <div className="stars-map-frame">
        <div className="stars-map-container">
          <div className="stars-map" ref={wrapRef}>
            <div ref={svgContainerRef}></div>

            {routeLine && (
              <svg
                className="route-line"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  pointerEvents: "none",
                  width: "100%",
                  height: "100%"
                }}
              >
                <line
                  x1={routeLine.x1}
                  y1={routeLine.y1}
                  x2={routeLine.x2}
                  y2={routeLine.y2}
                  stroke="yellow"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        </div>

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
});

export default StarsMap;
