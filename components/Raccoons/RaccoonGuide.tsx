import Image from "next/image";
import {useEffect, useMemo, useRef, useState } from "react";
import { buildSupabasePublicUrl } from "@/lib/publicAssetUrls";

const base = buildSupabasePublicUrl("characters", "raccoons/raccoon_with_map");

export function RaccoonGuide({
  wiggle,
  alt,
}: {
  wiggle: boolean;
  raccoonLine: string;
  alt?: string;
}) {
  // GIF-анимации (живые еноты)
  const gifs = useMemo(
    () => [
      `${base}/raccoon-with-map.gif`,
      `${base}/raccoon-shakes-map.gif`,
      `${base}/raccoon-rollup-map.gif`,
      `${base}/raccoon-puts-map-in-bottle.gif`,
    ],
    [],
  );

  // PNG (статичные позы)
  const pngs = useMemo(
    () => [
      `${base}/raccoon-with-map.png`,
      `${base}/raccoon-shakes-map.png`,
      `${base}/raccoon-rollup-map.png`,
      `${base}/raccoon-puts-map-in-bottle.png`,
    ],
    [],
  );

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
  }, [gifs]);

  const src = showGif ? gifs[index] : pngs[index];

  return (
    <div className="raccoon-container">
      <Image
        src={src}
        alt={alt || "Raccoon guide"}
        width={180}
        height={180}
        className={`raccoon-image ${wiggle ? "is-wiggle" : ""}`}
        unoptimized
      />
    </div>
  );
}
