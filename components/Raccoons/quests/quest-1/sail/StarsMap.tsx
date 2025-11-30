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
  | "click_merak"
  | "click_dubhe"
  | "correct_line"
  | "wrong_line"
  | "click_polaris"
  | "finish";

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
    "idle" | "waiting_merak_dubhe" | "waiting_polaris" | "completed"
  >("idle");

  const [routeLine, setRouteLine] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    startRoute() {
      console.log("[StarsMap] startRoute()");
      setRouteStep("waiting_merak_dubhe");
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
      const el = e.target as HTMLElement;
      const starEl = el.closest("[id]") as HTMLElement | null;
      if (!starEl) return;

      const starId = starEl.id;

      if (routeStep === "waiting_merak_dubhe") {
        if (starId === "Merak") {
          starEl.classList.add("star-glow-strong");
          setFoundStars((prev) => {
            const updated = prev.includes(starId) ? prev : [...prev, starId];
            if (updated.includes("Merak") && updated.includes("Dubhe")) {
              onStep?.("correct_line");
              setRouteStep("waiting_polaris");
            }
            return updated;
          });
          onStep?.("click_merak");
        }
        if (starId === "Dubhe") {
          starEl.classList.add("star-glow-strong");
          setFoundStars((prev) => {
            const updated = prev.includes(starId) ? prev : [...prev, starId];
            if (updated.includes("Merak") && updated.includes("Dubhe")) {
              onStep?.("correct_line");
              setRouteStep("waiting_polaris");
            }
            return updated;
          });
          onStep?.("click_dubhe");
        }
      }
      if (routeStep === "waiting_merak_dubhe" && starId !== "Merak" && starId !== "Dubhe") {
        onStep?.("wrong_line");
      }

      if (routeStep === "waiting_polaris" && starId === "Polaris") {
        const merakEl = root.querySelector("#Merak") as HTMLElement | null;
        const dubheEl = root.querySelector("#Dubhe") as HTMLElement | null;
        const polarisEl = root.querySelector("#Polaris") as HTMLElement | null;
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

          onStep?.("click_polaris");
          onStep?.("finish");

          setRouteStep("completed");
        }
      }

      const info = starInfoList.find((s) => s.id === starId);
      if (info && racTextRef.current) {
        racTextRef.current.innerHTML = `Енот: «${info.name}. ${info.description}»`;
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
