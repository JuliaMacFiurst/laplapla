import { useEffect, useState } from "react";

export function useIsTabletViewport(maxWidth = 1366) {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const query = [
      "(pointer: coarse)",
      "(hover: none)",
      "(min-width: 900px)",
      `(max-width: ${maxWidth}px)`,
    ].join(" and ");
    const mediaQuery = window.matchMedia(query);

    const sync = () => {
      setIsTablet((wasTablet) => wasTablet || mediaQuery.matches);
    };

    sync();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", sync);
      return () => mediaQuery.removeEventListener("change", sync);
    }

    mediaQuery.addListener(sync);
    return () => mediaQuery.removeListener(sync);
  }, [maxWidth]);

  return isTablet;
}
