"use client";

import {useEffect, useRef } from "react";

function waitForSVG(objectEl: HTMLObjectElement, callback: (svgDoc: Document) => void) {
  let tries = 0;
  const timer = setInterval(() => {
    if (objectEl.contentDocument) {
      clearInterval(timer);
      callback(objectEl.contentDocument);
    }
    tries++;
    if (tries > 50) clearInterval(timer);
  }, 50);
}

export default function InstrumentPanel({ onSwitch }: { onSwitch: (id: string) => void }) {
  const svgRef = useRef<HTMLObjectElement>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    function handleLoad() {
      waitForSVG(el!, (svg) => {
        const all = svg.querySelectorAll<HTMLElement>(`
          [data-switch="on"],
          [data-switch="off"]
        `);

        all.forEach((elem) => {
          elem.style.cursor = "pointer";

          elem.addEventListener("click", () => {
            const id = elem.id;
            const numMatch = id.match(/(\d+)$/);
            const num = numMatch ? numMatch[1] : null;
            if (!num) return;

            const onEl = svg.getElementById(`switcher-on-${num}`);
            const offEl = svg.getElementById(`switcher-off-${num}`);
            const lampEl = svg.getElementById(`red-button-${num}`);

            const isOn = id.startsWith("switcher-on-");

            if (isOn) {
              // ON → OFF
              if (onEl) onEl.style.display = "none";
              if (offEl) offEl.style.display = "block";
              if (lampEl) lampEl.querySelectorAll("path").forEach((p) =>
                p.setAttribute("fill", "#F31220")
              );
              onSwitch(`switcher-off-${num}`);
            } else {
              // OFF → ON
              if (onEl) onEl.style.display = "block";
              if (offEl) offEl.style.display = "none";
              if (lampEl) lampEl.querySelectorAll("path").forEach((p) =>
                p.setAttribute("fill", "#11FF00")
              );
              onSwitch(`switcher-on-${num}`);
            }
          });
        });
      });
    }

    el.addEventListener("load", handleLoad);
    return () => el.removeEventListener("load", handleLoad);
  }, []);

  return (
    <div className="instrument-panel">
      <object
        ref={svgRef}
        data="/quests/assets/decorations/pilot-pannel.svg"
        type="image/svg+xml"
        className="instrument-panel-svg"
      />
    </div>
  );
}
