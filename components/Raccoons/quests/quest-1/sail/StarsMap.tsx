"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getMapSvg } from "@/utils/storageMaps";
import { findStarInfo, getLocalizedStarName } from "@/utils/starInfo";
import { sanitizeSvg } from "@/lib/security/sanitize";
import { useQuest1I18n } from "../i18n";
import { getStarNavigationUi } from "../i18n/dialogs";
import {
  advanceStarNavigation,
  drawStarNavigationLine,
  findStarNavigationTarget,
  getStarMap,
  type StarNavigationPhase,
} from "./starNavigation";
import { getInformationalStarIdAtPoint } from "./starNavigationInfo";

type StepId = "click_merak" | "click_dubhe" | "click_polaris" | "finish" | `wrong-star:${string}`;
export type StarsMapHandle = { startRoute: () => void; getRouteStep: () => "idle" | StarNavigationPhase };

const StarsMap = forwardRef<StarsMapHandle, {
  onStep?: (id: StepId) => void;
  onStarSelect?: (id: string) => void;
}>(function StarsMap({ onStep, onStarSelect }, ref) {
  const { lang } = useQuest1I18n();
  const ui = getStarNavigationUi(lang);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [routeStep, setRouteStep] = useState<"idle" | StarNavigationPhase>("idle");

  useImperativeHandle(ref, () => ({
    startRoute: () => setRouteStep((step) => step === "idle" ? "find_merak" : step),
    getRouteStep: () => routeStep,
  }), [routeStep]);

  useEffect(() => {
    let cancelled = false;
    const map = getStarMap(lang);
    setSvgLoaded(false);
    void getMapSvg(map.path, map.source).then((content) => {
      if (cancelled || !svgContainerRef.current) return;
      svgContainerRef.current.innerHTML = content ? sanitizeSvg(content) : "";
      const svg = svgContainerRef.current.querySelector("svg");
      if (svg) {
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      }
      setSvgLoaded(Boolean(svg));
    });
    return () => { cancelled = true; };
  }, [lang]);

  useEffect(() => {
    if (!svgLoaded) return;
    const svg = svgContainerRef.current?.querySelector("svg");
    if (!svg) return;
    svg.querySelectorAll(".star-glow-strong").forEach((element) => element.classList.remove("star-glow-strong"));
    if (routeStep !== "idle" && routeStep !== "find_merak") svg.querySelector("#Merak-Star")?.classList.add("star-glow-strong");
    if (routeStep === "find_polaris" || routeStep === "completed") svg.querySelector("#Dubhe-Star")?.classList.add("star-glow-strong");
    if (routeStep === "completed") svg.querySelector("#Polar-Star")?.classList.add("star-glow-strong");
    drawStarNavigationLine(svg, routeStep);
    const observer = new ResizeObserver(() => drawStarNavigationLine(svg, routeStep));
    observer.observe(svg);
    return () => observer.disconnect();
  }, [svgLoaded, routeStep]);

  useEffect(() => {
    const host = svgContainerRef.current;
    if (!host || !svgLoaded) return;
    const handleClick = (event: MouseEvent) => {
      const ids: string[] = [];
      let element = event.target as Element | null;
      while (element && element !== host) {
        if (element.id) ids.push(element.id);
        element = element.parentElement;
      }
      const target = findStarNavigationTarget(ids);
      const informationalStarId = getInformationalStarIdAtPoint(host, event.clientX, event.clientY);
      if (informationalStarId) {
        onStarSelect?.(informationalStarId);
        return;
      }
      if (routeStep === "idle" || routeStep === "completed") return;
      const expected = routeStep === "find_merak" ? "merak" : routeStep === "find_dubhe" ? "dubhe" : "polaris";
      if (target !== expected) {
        if (routeStep === "find_polaris") {
          onStep?.("wrong-star:polaris");
        } else {
          const starId = ids.find((id) => findStarInfo(id));
          const info = starId ? findStarInfo(starId) : null;
          const name = info ? getLocalizedStarName(info, lang) : "no_id";
          onStep?.(`wrong-star:${name}`);
        }
        return;
      }
      const starId = target === "merak" ? "Merak-Star" : target === "dubhe" ? "Dubhe-Star" : "Polar-Star";
      onStarSelect?.(starId);
      const next = advanceStarNavigation(routeStep, target);
      setRouteStep(next);
      onStep?.(target === "merak" ? "click_merak" : target === "dubhe" ? "click_dubhe" : "click_polaris");
      if (next === "completed") onStep?.("finish");
    };
    host.addEventListener("click", handleClick);
    return () => host.removeEventListener("click", handleClick);
  }, [svgLoaded, routeStep, onStep, onStarSelect, lang]);

  const instruction = routeStep !== "idle" && routeStep !== "completed" ? ui[routeStep] : null;
  return (
    <div className="star-navigation-section">
      <div className="star-navigation-map-scene" dir="ltr">
        <video className="quest-raccoon-stars-video" aria-hidden="true" autoPlay muted loop playsInline src="/supabase-storage/quests/1_quest/images/sailor-raccoon.webm" />
        <div className="stars-map-frame">
          <div className="stars-map-container">
            <div className="stars-map" dir="ltr"><div ref={svgContainerRef} /></div>
          </div>
        </div>
        <video className="quest-svensen-video" aria-hidden="true" autoPlay muted loop playsInline src="/supabase-storage/quests/1_quest/images/svensen-talks.webm" />
      </div>
      {instruction && <div className="star-navigation-status" dir={lang === "he" ? "rtl" : "ltr"} role="status">
        <p className="star-navigation-instruction">{instruction}</p>
      </div>}
    </div>
  );
});

export default StarsMap;
