"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const PANEL_SVG_PATH = "/quests/assets/decorations/pilot-pannel.svg";

export default function InstrumentPanel({ onSwitch }: { onSwitch: (id: string) => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onSwitchRef = useRef(onSwitch);
  const [isInteractiveReady, setIsInteractiveReady] = useState(false);

  useEffect(() => {
    onSwitchRef.current = onSwitch;
  }, [onSwitch]);

  useEffect(() => {
    const panelNode = panelRef.current;
    if (!panelNode) return undefined;
    const root: HTMLDivElement = panelNode;

    const controller = new AbortController();
    const cleanups: Array<() => void> = [];

    const setSwitchState = (num: string, isUp: boolean) => {
      const onEl = root.querySelector<HTMLElement>(`#switcher-on-${num}`);
      const offEl = root.querySelector<HTMLElement>(`#switcher-off-${num}`);
      const lampEl = root.querySelector<HTMLElement>(`#red-button-${num}`);

      if (onEl) onEl.style.display = isUp ? "block" : "none";
      if (offEl) offEl.style.display = isUp ? "none" : "block";
      if (lampEl) {
        lampEl.querySelectorAll("path").forEach((path) => {
          path.setAttribute("fill", isUp ? "#11FF00" : "#F31220");
        });
      }
    };

    async function loadPanel() {
      try {
        const response = await fetch(PANEL_SVG_PATH, { signal: controller.signal });
        if (!response.ok) return;

        const svgMarkup = await response.text();
        if (controller.signal.aborted) return;

        root.innerHTML = svgMarkup;

        const switches = root.querySelectorAll<HTMLElement>(`
          [data-switch="on"],
          [data-switch="off"]
        `);

        for (let num = 1; num <= 14; num += 1) {
          setSwitchState(String(num), false);
        }

        setIsInteractiveReady(true);

        switches.forEach((elem) => {
          elem.style.cursor = "pointer";

          const handleClick = () => {
            const id = elem.id;
            const numMatch = id.match(/(\d+)$/);
            const num = numMatch ? numMatch[1] : null;
            if (!num) return;

            const isOn = id.startsWith("switcher-on-");

            if (isOn) {
              setSwitchState(num, false);
              onSwitchRef.current(`switcher-off-${num}`);
              return;
            }

            setSwitchState(num, true);
            onSwitchRef.current(`switcher-on-${num}`);
          };

          elem.addEventListener("click", handleClick);
          cleanups.push(() => elem.removeEventListener("click", handleClick));
        });
      } catch {
        if (!controller.signal.aborted) {
          root.innerHTML = "";
          setIsInteractiveReady(false);
        }
      }
    }

    void loadPanel();

    return () => {
      controller.abort();
      cleanups.forEach((cleanup) => cleanup());
      root.innerHTML = "";
      setIsInteractiveReady(false);
    };
  }, []);

  return (
    <div className="instrument-panel">
      <div className="instrument-panel-svg" aria-label="Flight control panel">
        <Image
          src={PANEL_SVG_PATH}
          alt=""
          fill
          unoptimized
          className={`instrument-panel-fallback ${isInteractiveReady ? "is-hidden" : ""}`}
        />
        <div
          ref={panelRef}
          className={`instrument-panel-inline ${isInteractiveReady ? "is-ready" : ""}`}
        />
      </div>
    </div>
  );
}
