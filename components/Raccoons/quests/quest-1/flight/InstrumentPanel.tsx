"use client";

import React, { useEffect, useRef } from "react";

export default function InstrumentPanel({ onSwitch }: { onSwitch: (id: string) => void }) {
  const svgRef = useRef<HTMLObjectElement>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    function handleLoad() {
      const svg = el.contentDocument;
      if (!svg) return;

      const clickableIds = [
        "switcher-1",
        "switcher-2",
        "switcher-3",
        "switcher-4",
        "switcher-5",
        "switcher-6",
        "switcher-7",
        "switcher-8",
        "switcher-9",
        "switcher-10",
        "switcher-11",
        "switcher-12",
        "switcher-13",
        "switcher-14",
        "red-button-1",
        "red-button-2",
        "red-button-3"
      ];

      clickableIds.forEach((id) => {
        const btn = svg.getElementById(id);
        if (btn) {
          btn.style.cursor = "pointer";
          btn.addEventListener("click", () => onSwitch(id));
        }
      });
    }

    el.addEventListener("load", handleLoad);

    return () => {
      el.removeEventListener("load", handleLoad);
    };
  }, [onSwitch]);

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
