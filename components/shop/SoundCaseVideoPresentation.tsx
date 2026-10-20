import Image from "next/image";
import { useState } from "react";

import type { Lang } from "@/i18n";
import type { SoundCaseVideoPresentationCopy } from "@/lib/shop/soundCaseProductDetail";

const SOUND_CASE_VIDEO_IDS: Record<Lang, string> = {
  ru: "R2jlbxceyVI",
  en: "opM6GSS7rdI",
  he: "opM6GSS7rdI",
};

export const getSoundCaseVideoPresentationMedia = (lang: Lang) => {
  const videoId = SOUND_CASE_VIDEO_IDS[lang];

  return {
    videoId,
    posterUrl: `https://i.ytimg.com/vi/${videoId}/oar2.jpg`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`,
  };
};

export function SoundCaseVideoPresentation({
  lang,
  copy,
}: {
  lang: Lang;
  copy: SoundCaseVideoPresentationCopy;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const media = getSoundCaseVideoPresentationMedia(lang);

  return (
    <section
      className="sound-case-product__video sound-case-product__section"
      aria-labelledby="sound-case-video-title"
    >
      <div className="sound-case-product__video-copy" dir={lang === "he" ? "rtl" : "ltr"}>
        <p className="sound-case-product__section-kicker">{copy.label}</p>
        <h2 id="sound-case-video-title">{copy.heading}</h2>
        <p>{copy.description}</p>
      </div>

      <div className="sound-case-product__video-frame">
        {isPlaying ? (
          <iframe
            src={media.embedUrl}
            title={copy.iframeTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="sound-case-product__video-poster"
            aria-label={copy.playLabel}
            onClick={() => setIsPlaying(true)}
          >
            <Image
              src={media.posterUrl}
              alt=""
              fill
              sizes="(max-width: 640px) min(300px, calc(100vw - 3rem)), (max-width: 900px) 300px, 350px"
              loading="lazy"
              unoptimized
            />
            <span className="sound-case-product__video-play" aria-hidden="true">
              <span />
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
