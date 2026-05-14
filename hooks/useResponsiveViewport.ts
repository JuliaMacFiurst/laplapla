import { useEffect, useState } from "react";

export type ResponsiveDeviceClass = "mobile" | "tablet" | "desktop";
export type ResponsiveOrientation = "portrait" | "landscape";

export type ResponsiveViewportState = {
  width: number;
  height: number;
  deviceClass: ResponsiveDeviceClass;
  orientation: ResponsiveOrientation;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isCoarsePointer: boolean;
  isStandalonePwa: boolean;
};

const MOBILE_MAX_WIDTH = 767;
const TABLET_MAX_WIDTH = 1199;

const SSR_VIEWPORT: ResponsiveViewportState = {
  width: 0,
  height: 0,
  deviceClass: "desktop",
  orientation: "landscape",
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isCoarsePointer: false,
  isStandalonePwa: false,
};

function readViewport(): ResponsiveViewportState {
  if (typeof window === "undefined") {
    return SSR_VIEWPORT;
  }

  const width = Math.round(window.visualViewport?.width ?? window.innerWidth);
  const height = Math.round(window.visualViewport?.height ?? window.innerHeight);
  const shortestSide = Math.min(width, height);
  const widestSide = Math.max(width, height);
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const isNoHover = window.matchMedia("(hover: none)").matches;
  const deviceClass: ResponsiveDeviceClass =
    width <= MOBILE_MAX_WIDTH
      ? "mobile"
      : width <= TABLET_MAX_WIDTH || (isCoarsePointer && isNoHover && shortestSide <= TABLET_MAX_WIDTH && widestSide <= 1366)
        ? "tablet"
        : "desktop";
  const standaloneNavigator = "standalone" in window.navigator
    ? Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    : false;

  return {
    width,
    height,
    deviceClass,
    orientation: width > height ? "landscape" : "portrait",
    isMobile: deviceClass === "mobile",
    isTablet: deviceClass === "tablet",
    isDesktop: deviceClass === "desktop",
    isCoarsePointer,
    isStandalonePwa: standaloneNavigator || window.matchMedia("(display-mode: standalone)").matches,
  };
}

export function useResponsiveViewport() {
  const [viewport, setViewport] = useState<ResponsiveViewportState>(SSR_VIEWPORT);

  useEffect(() => {
    const sync = () => {
      const next = readViewport();
      setViewport((current) => (
        current.width === next.width &&
        current.height === next.height &&
        current.deviceClass === next.deviceClass &&
        current.orientation === next.orientation &&
        current.isCoarsePointer === next.isCoarsePointer &&
        current.isStandalonePwa === next.isStandalonePwa
          ? current
          : next
      ));

      document.documentElement.style.setProperty("--app-viewport-height", `${next.height}px`);
      document.documentElement.dataset.viewportClass = next.deviceClass;
      document.documentElement.dataset.viewportOrientation = next.orientation;
      document.documentElement.dataset.pointer = next.isCoarsePointer ? "coarse" : "fine";
      document.documentElement.dataset.displayMode = next.isStandalonePwa ? "standalone" : "browser";
    };

    sync();

    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");

    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    window.visualViewport?.addEventListener("resize", sync);

    if (typeof coarsePointerQuery.addEventListener === "function") {
      coarsePointerQuery.addEventListener("change", sync);
      standaloneQuery.addEventListener("change", sync);
    } else {
      coarsePointerQuery.addListener(sync);
      standaloneQuery.addListener(sync);
    }

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      window.visualViewport?.removeEventListener("resize", sync);

      if (typeof coarsePointerQuery.removeEventListener === "function") {
        coarsePointerQuery.removeEventListener("change", sync);
        standaloneQuery.removeEventListener("change", sync);
      } else {
        coarsePointerQuery.removeListener(sync);
        standaloneQuery.removeListener(sync);
      }
    };
  }, []);

  return viewport;
}

export function useStudioViewportMode() {
  const viewport = useResponsiveViewport();

  return {
    ...viewport,
    usesTouchStudioLayout: viewport.deviceClass !== "desktop",
    usesPhonePortraitLock: viewport.deviceClass === "mobile",
  };
}
