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

  const [routeStep, setRouteStep] = useState<
    "idle" | "waiting_merak" | "waiting_dubhe"  | "waiting_polaris" | "completed"
  >("idle");

  const [finalLineLocked, setFinalLineLocked] = useState(false);

  const [routeLineProgress, setRouteLineProgress] = useState(0);

  const [linePoints, setLinePoints] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const dragActiveRef = useRef(false);

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
          setTimeout(() => onStep?.("click_dubhe"), 0);
          setTimeout(() => setRouteStep("waiting_polaris"), 0);
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

  useEffect(() => {
    if (routeStep === "waiting_polaris" && svgContainerRef.current) {
      const root = svgContainerRef.current;
      const merakEl = root.querySelector("#Merak-Star") as HTMLElement | null;
      const dubheEl = root.querySelector("#Dubhe-Star") as HTMLElement | null;
      if (merakEl && dubheEl) {
        const merakRect = merakEl.getBoundingClientRect();
        const dubheRect = dubheEl.getBoundingClientRect();
        setLinePoints({
          x1:
            (merakRect.left + merakRect.right) / 2 -
            root.getBoundingClientRect().left,
          y1:
            (merakRect.top + merakRect.bottom) / 2 -
            root.getBoundingClientRect().top,
          x2:
            (dubheRect.left + dubheRect.right) / 2 -
            root.getBoundingClientRect().left,
          y2:
            (dubheRect.top + dubheRect.bottom) / 2 -
            root.getBoundingClientRect().top
        });
      }
      let p = 0;
      const id = setInterval(() => {
        p += 0.02;
        setRouteLineProgress(p);
        if (p >= 1) clearInterval(id);
      }, 30);
      return () => clearInterval(id);
    } else if (!finalLineLocked) {
      setRouteLineProgress(0);
      setLinePoints(null);
    }
  }, [routeStep]);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    function onPointerDown(e: PointerEvent) {
      if (routeStep !== "waiting_polaris") return;
      dragActiveRef.current = true;
      setIsDragging(true);
      const rect = root!.getBoundingClientRect();
      setDragPoint({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragActiveRef.current || routeStep !== "waiting_polaris") return;
      const rect = root!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDragPoint({ x, y });
    }

    function onPointerUp() {
      if (!dragActiveRef.current) return;
      dragActiveRef.current = false;
      setIsDragging(false);

      if (!svgContainerRef.current) return;

      const polarisEl = svgContainerRef.current.querySelector("#Polar-Star") as HTMLElement | null;
      if (!polarisEl) return;

      const starRect = polarisEl.getBoundingClientRect();
      const rootRect = svgContainerRef.current.getBoundingClientRect();

      const starX = (starRect.left + starRect.right) / 2 - rootRect.left;
      const starY = (starRect.top + starRect.bottom) / 2 - rootRect.top;

      const dx = (dragPoint?.x ?? 0) - starX;
      const dy = (dragPoint?.y ?? 0) - starY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 25) {
        setFinalLineLocked(true);
        setRouteStep("completed");

        // Keep the dragPoint exactly on the Polar-Star center
        setDragPoint({ x: starX, y: starY });

        setTimeout(() => onStep?.("click_polaris"), 0);
        setTimeout(() => onStep?.("finish"), 0);
      } else {
        // Collapse back
        setFinalLineLocked(false);
        setDragPoint(null);
        setTimeout(() => onStep?.("wrong_line"), 0);
      }
    }

    root.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      root.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [routeStep, dragPoint, onStep]);

  return (
    <div className="map-center">
      <div className="stars-map-frame">
        <div className="stars-map-container">
          <div className="stars-map" ref={wrapRef}>
            <div ref={svgContainerRef}></div>

            {linePoints && (
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
                  x1={linePoints.x1 - 7}
                  y1={linePoints.y1 - 5}
                  x2={linePoints.x1 - 7 + (linePoints.x2 - linePoints.x1) * Math.min(routeLineProgress, 1)}
                  y2={linePoints.y1 - 5 + (linePoints.y2 - linePoints.y1) * Math.min(routeLineProgress, 1)}
                  stroke="yellow"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                {(isDragging || finalLineLocked) && dragPoint && (
                  <line
                    x1={linePoints.x2 - 7}
                    y1={linePoints.y2 - 5}
                    x2={dragPoint.x - 7}
                    y2={dragPoint.y - 5}
                    stroke="yellow"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                )}
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
