import React, { useEffect, useRef, useState } from "react";

export function RaccoonGuide({
  wiggle,
  raccoonLine,
}: {
  wiggle: boolean;
  raccoonLine: string;
}) {
  // GIF-анимации (живые еноты)
  const gifs = [
    "/images/raccoons/raccoon_with_map/raccoon-with-map.gif",
    "/images/raccoons/raccoon_with_map/raccoon-shakes-map.gif",
    "/images/raccoons/raccoon_with_map/raccoon-rollup-map.gif",
    "/images/raccoons/raccoon_with_map/raccoon-puts-map-in-bottle.gif",
  ];

  // PNG (статичные позы)
  const pngs = [
    "/images/raccoons/raccoon_with_map/raccoon-with-map.png",
    "/images/raccoons/raccoon_with_map/raccoon-shakes-map.png",
    "/images/raccoons/raccoon_with_map/raccoon-rollup-map.png",
    "/images/raccoons/raccoon_with_map/raccoon-puts-map-in-bottle.png",
  ];

  const [showGif, setShowGif] = useState(false);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const scheduleNext = (isGifPhase: boolean) => {
      const delay = isGifPhase ? 5000 : 10000; // GIF 5s → PNG 10s

      timerRef.current = window.setTimeout(() => {
        if (cancelled) return;

        setIndex((prev) => {
          let next = Math.floor(Math.random() * gifs.length);
          if (gifs.length > 1 && next === prev)
            next = (next + 1) % gifs.length;
          return next;
        });

        setShowGif(!isGifPhase);
        scheduleNext(!isGifPhase);
      }, delay);
    };

    scheduleNext(false); // старт → PNG

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const src = showGif ? gifs[index] : pngs[index];

  return (
    <div className="raccoon-container">
      <img
        src={src}
        alt="Енот-гид"
        className={`raccoon-image ${wiggle ? "is-wiggle" : ""}`}
      />
    </div>
  );
}