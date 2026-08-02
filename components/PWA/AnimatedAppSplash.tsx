"use client";

import { useEffect, useRef, useState } from "react";

const ANIMATED_SPLASH_PATH = "/pwa/splash/laplapla-splash-animated.svg";
const STATIC_SPLASH_PATH = "/pwa/splash/app-splash-logo-640.webp";
const SVG_LOAD_TIMEOUT_MS = 900;
const SPARKLE_COLORS = ["cream", "peach", "pink", "aqua", "cream"] as const;

type NetworkConnection = {
  effectiveType?: string;
  saveData?: boolean;
};

export function shouldSkipAnimatedSplash(
  reducedMotion: boolean,
  connection?: NetworkConnection,
) {
  return Boolean(
    reducedMotion ||
    connection?.saveData ||
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g",
  );
}

export default function AnimatedAppSplash() {
  const [mountSvg, setMountSvg] = useState(false);
  const [svgVisible, setSvgVisible] = useState(false);
  const svgTimedOut = useRef(false);
  const timeoutId = useRef(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;
    if (shouldSkipAnimatedSplash(reducedMotion, connection)) {
      return;
    }

    setMountSvg(true);
    timeoutId.current = window.setTimeout(() => {
      svgTimedOut.current = true;
      setSvgVisible(false);
    }, SVG_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId.current);
  }, []);

  const showSvg = () => {
    if (svgTimedOut.current) {
      return;
    }
    window.clearTimeout(timeoutId.current);
    setSvgVisible(true);
  };

  const keepStaticFallback = () => {
    svgTimedOut.current = true;
    window.clearTimeout(timeoutId.current);
    setSvgVisible(false);
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
