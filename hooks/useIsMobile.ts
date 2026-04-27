import { useEffect, useState } from "react";

export function useIsMobile(maxWidth = 767) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const coarsePointerQuery = window.matchMedia("(pointer: coarse) and (hover: none)");

    const sync = () => {
      const matchesPhoneViewport = Math.min(window.innerWidth, window.innerHeight) <= maxWidth;
      setIsMobile(mediaQuery.matches || (coarsePointerQuery.matches && matchesPhoneViewport));
    };

    sync();

    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", sync);
      coarsePointerQuery.addEventListener("change", sync);
      return () => {
        window.removeEventListener("resize", sync);
        window.removeEventListener("orientationchange", sync);
        mediaQuery.removeEventListener("change", sync);
        coarsePointerQuery.removeEventListener("change", sync);
      };
    }

    mediaQuery.addListener(sync);
    coarsePointerQuery.addListener(sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      mediaQuery.removeListener(sync);
      coarsePointerQuery.removeListener(sync);
    };
  }, [maxWidth]);

  return isMobile;
}
