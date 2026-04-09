import { useLayoutEffect, useRef } from "react";

const DEFAULT_MAX_FONT_SIZE_PX = 40;
const DEFAULT_MIN_FONT_SIZE_PX = 11;

export function useAutoFontSize<T extends HTMLElement>(deps: readonly unknown[] = []) {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const fitText = () => {
      const computedFontSize = Number.parseFloat(window.getComputedStyle(element).fontSize);
      let fontSize = Number.isFinite(computedFontSize) ? computedFontSize : DEFAULT_MAX_FONT_SIZE_PX;

      element.style.fontSize = `${fontSize}px`;

      while (element.scrollHeight > element.clientHeight && fontSize > DEFAULT_MIN_FONT_SIZE_PX) {
        fontSize -= 1;
        element.style.fontSize = `${fontSize}px`;
      }
    };

    fitText();

    const parentElement = element.parentElement;

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", fitText);
      return () => window.removeEventListener("resize", fitText);
    }

    const resizeObserver = new ResizeObserver(() => {
      fitText();
    });

    resizeObserver.observe(element);
    if (parentElement) {
      resizeObserver.observe(parentElement);
    }
    return () => resizeObserver.disconnect();
  }, deps);

  return ref;
}
