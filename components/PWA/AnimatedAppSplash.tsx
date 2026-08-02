"use client";

import { useEffect, useRef, useState } from "react";

export const ANIMATED_SPLASH_PATH = "/pwa/splash/laplapla-splash-animated.svg";
export const STATIC_SPLASH_PATH = "/pwa/splash/app-splash-logo-640.webp";
export const SVG_LOAD_TIMEOUT_MS = 1400;
export const DEBUG_SLOW_LOAD_MS = 1800;

const SPARKLE_COLORS = ["cream", "peach", "pink", "aqua", "cream"] as const;

export type SplashDebugMode = "animated" | "static" | "timeout" | "error" | "slow";
export type SplashPresentation = {
  mode: "animated" | "static";
  reason: "svg-loaded" | "saveData" | "reduced-motion" | "slow-connection" | "svg-error" | "timeout" | "debug-static";
};
export type SplashTracePatch = {
  mode?: "animated" | "static";
  reason?: string;
  svg?: "not-mounted" | "loading" | "loaded" | "visible" | "error";
};

export function logSplashTrace(message: string) {
  if (typeof window === "undefined" || !isTraceHost(window.location.hostname)) return;
  console.info(`[LapLapLa splash] ${message} t=${performance.now().toFixed(1)}ms`);
}

function isTraceHost(hostname: string) {
  return process.env.NODE_ENV === "development" || hostname === "localhost" ||
    hostname === "127.0.0.1" || hostname.endsWith(".vercel.app");
}

type NetworkConnection = {
  effectiveType?: string;
  saveData?: boolean;
};

export function getStaticSplashReason(
  reducedMotion: boolean,
  connection?: NetworkConnection,
): SplashPresentation["reason"] | null {
  if (reducedMotion) return "reduced-motion";
  if (connection?.saveData === true) return "saveData";
  if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") {
    return "slow-connection";
  }
  return null;
}

export function shouldSkipAnimatedSplash(
  reducedMotion: boolean,
  connection?: NetworkConnection,
) {
  return getStaticSplashReason(reducedMotion, connection) !== null;
}

type AnimatedAppSplashProps = {
  debugMode?: SplashDebugMode;
  onPresentationReady?: (presentation: SplashPresentation) => void;
  onTrace?: (patch: SplashTracePatch) => void;
};

export default function AnimatedAppSplash({
  debugMode,
  onPresentationReady,
  onTrace,
}: AnimatedAppSplashProps) {
  // The normal path deliberately includes <object> on the first render, so its
  // request is not delayed by an effect. Effects only opt out for explicit
  // accessibility/data-saving signals and deterministic debug modes.
  const [mountSvg, setMountSvg] = useState(debugMode !== "static");
  const [svgVisible, setSvgVisible] = useState(false);
  const timeoutId = useRef(0);
  const delayedLoadId = useRef(0);
  const failed = useRef(false);

  const report = (presentation: SplashPresentation) => {
    onPresentationReady?.(presentation);
    onTrace?.({ mode: presentation.mode, reason: presentation.reason });
    logSplashTrace(presentation.mode === "animated"
      ? "selected mode: animated reason=svg-loaded"
      : `selected mode: static reason=${presentation.reason}`);
  };

  useEffect(() => {
    logSplashTrace("WebP mounted");
  }, []);

  useEffect(() => {
    if (!mountSvg) {
      onTrace?.({ svg: "not-mounted" });
      return;
    }
    logSplashTrace("SVG object mounted");
    logSplashTrace("SVG request started");
    onTrace?.({ svg: "loading" });
  }, [mountSvg, onTrace]);

  useEffect(() => {
    if (debugMode === "static") {
      setMountSvg(false);
      report({ mode: "static", reason: "debug-static" });
      return;
    }

    const forceAnimated = Boolean(debugMode);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;
    logSplashTrace(`reduced motion: ${reducedMotion}`);
    logSplashTrace(`saveData: ${connection?.saveData === true}`);
    logSplashTrace(`effectiveType: ${connection?.effectiveType ?? "unknown"}`);
    setMountSvg(true);
    const staticReason = forceAnimated ? null : getStaticSplashReason(reducedMotion, connection);
    if (staticReason) {
      setMountSvg(false);
      report({ mode: "static", reason: staticReason });
      return;
    }
    const animatedReason = debugMode ? `debug-${debugMode}` : "normal-connection";
    logSplashTrace(`selected mode: animated reason=${animatedReason}`);
    onTrace?.({ mode: "animated", reason: animatedReason });

    timeoutId.current = window.setTimeout(() => {
      if (!failed.current && !svgVisible) {
        // Keep the in-flight object alive. A cold TWA load that succeeds after
        // this diagnostic threshold may still hand over to SVG while visible.
        report({ mode: "static", reason: "timeout" });
      }
    }, SVG_LOAD_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId.current);
      window.clearTimeout(delayedLoadId.current);
    };
    // svgVisible is intentionally read only by the timer created for this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugMode]);

  const showSvg = () => {
    if (debugMode === "timeout") return;
    if (debugMode === "error") {
      failed.current = true;
      window.clearTimeout(timeoutId.current);
      logSplashTrace("SVG error");
      onTrace?.({ svg: "error" });
      report({ mode: "static", reason: "svg-error" });
      return;
    }
    logSplashTrace("SVG load");
    onTrace?.({ svg: "loaded" });

    const reveal = () => {
      if (failed.current) return;
      window.clearTimeout(timeoutId.current);
      setSvgVisible(true);
      logSplashTrace("SVG visible");
      onTrace?.({ svg: "visible" });
      report({ mode: "animated", reason: "svg-loaded" });
    };
    if (debugMode === "slow") {
      delayedLoadId.current = window.setTimeout(reveal, DEBUG_SLOW_LOAD_MS);
    } else {
      reveal();
    }
  };

  const keepStaticFallback = () => {
    failed.current = true;
    window.clearTimeout(timeoutId.current);
    setSvgVisible(false);
    logSplashTrace("SVG error");
    onTrace?.({ svg: "error" });
    report({ mode: "static", reason: "svg-error" });
  };

  return (
    <div
      className={`app-splash__visual${svgVisible ? " app-splash__visual--animated" : ""}`}
      aria-hidden="true"
    >
      <span className="app-splash__glow" />
      <div className="app-splash__stars">
        {SPARKLE_COLORS.map((color, index) => (
          <span key={index} className={`app-splash__star app-splash__star--${index + 1}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                className={`app-splash__star-shape app-splash__star-shape--${color}`}
                d="M12 1.5c1.15 5.75 4.75 9.35 10.5 10.5-5.75 1.15-9.35 4.75-10.5 10.5C10.85 16.75 7.25 13.15 1.5 12 7.25 10.85 10.85 7.25 12 1.5Z"
              />
              <ellipse className="app-splash__star-highlight" cx="9.2" cy="8.5" rx="2.1" ry="1.25" />
            </svg>
          </span>
        ))}
      </div>
      <div className="app-splash__logo-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`app-splash__logo app-splash__logo--static${svgVisible ? " app-splash__logo--hidden" : ""}`}
          src={STATIC_SPLASH_PATH}
          alt=""
          width={640}
          height={640}
        />
        {mountSvg ? (
          <object
            className={`app-splash__logo app-splash__logo--animated${svgVisible ? " app-splash__logo--loaded" : ""}`}
            data={ANIMATED_SPLASH_PATH}
            type="image/svg+xml"
            tabIndex={-1}
            onLoad={showSvg}
            onError={keepStaticFallback}
          />
        ) : null}
      </div>
      <div className="app-splash__confetti">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className={`app-splash__confetti-piece app-splash__confetti-piece--${index + 1}`} />
        ))}
      </div>
    </div>
  );
}
