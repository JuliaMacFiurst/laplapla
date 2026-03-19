import { useLayoutEffect, useRef } from "react";

const MAX_FONT_SIZE_PX = 40;
const MIN_FONT_SIZE_PX = 16;

export function useAutoFontSize<T extends HTMLElement>(deps: readonly unknown[] = []) {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const fitText = () => {
      let fontSize = MAX_FONT_SIZE_PX;
      element.style.fontSize = `${fontSize}px`;

      while (element.scrollHeight > element.clientHeight && fontSize > MIN_FONT_SIZE_PX) {
        fontSize -= 1;
        element.style.fontSize = `${fontSize}px`;
      }
    };

    fitText();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", fitText);
      return () => window.removeEventListener("resize", fitText);
    }

    const resizeObserver = new ResizeObserver(() => {
      fitText();
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, deps);

  return ref;
}
