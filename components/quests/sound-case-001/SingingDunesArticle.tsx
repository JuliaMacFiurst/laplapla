/* eslint-disable @next/next/no-img-element */
import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { SOUND_CASE_001_HUB_PUBLIC_PATH } from "@/lib/shop/quests/sound-case-001/finale";
import {
  getSingingDunesArticleCopy,
  type SingingDunesArticleCopy,
  SINGING_DUNE_SOURCES,
  SINGING_DUNE_STICKERS,
} from "@/lib/quests/singingDunesArticle";

const SINGING_DUNE_AUDIO_URL = requireQuestAssetUrl(
  SOUND_CASE_001_ASSET_MANIFEST.assets["stage-1-unknown-recording"],
);

type AudioState = "idle" | "loading" | "playing" | "error";

function SingingDuneAudioPlayer({ copy }: { copy: SingingDunesArticleCopy["audio"] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const isPlaying = audioState === "playing";

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    if (audio.ended) audio.currentTime = 0;
    setAudioState("loading");
    try {
      await audio.play();
    } catch {
      setAudioState("error");
    }
  };

  return (
    <aside className={`singing-dunes-audio${isPlaying ? " is-playing" : ""}`} aria-label={copy.caption}>
      <audio
        ref={audioRef}
        src={SINGING_DUNE_AUDIO_URL}
        preload="metadata"
        onPlay={() => setAudioState("playing")}
        onPause={(event) => {
          if (!event.currentTarget.ended) setAudioState("idle");
        }}
        onEnded={() => setAudioState("idle")}
        onError={() => setAudioState("error")}
      />
      <div className="singing-dunes-audio__heading">
        <span aria-hidden="true">🎧</span>
        <div>
          <strong>{copy.title}</strong>
          <small>{copy.caption}</small>
        </div>
      </div>
      <div className="singing-dunes-audio__controls">
        <button
          type="button"
          onClick={() => void togglePlayback()}
          aria-label={isPlaying ? copy.pauseLabel : copy.playLabel}
          aria-pressed={isPlaying}
          disabled={audioState === "loading"}
        >
          <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
        </button>
        <span className="singing-dunes-audio__wave" aria-hidden="true" dir="ltr">
          {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
        </span>
      </div>
      <p>{copy.note}</p>
      {audioState === "error" ? <span className="singing-dunes-audio__error" role="status">{copy.error}</span> : null}
    </aside>
  );
}

export function SingingDunesArticle({ lang }: { lang: Lang }) {
  const text = getSingingDunesArticleCopy(lang);

  return (
    <main className="singing-dunes-article" lang={lang} dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="singing-dunes-article__sand" aria-hidden="true" />
      <article className="singing-dunes-article__paper">
        <Link className="singing-dunes-article__back" href={buildLocalizedPublicPath(SOUND_CASE_001_HUB_PUBLIC_PATH, lang)} locale={lang}>
          <span aria-hidden="true">←</span> {text.back}
        </Link>

        <header className="singing-dunes-article__hero">
          <div className="singing-dunes-article__hero-copy">
            <p className="singing-dunes-article__eyebrow">{text.eyebrow}</p>
            <h1>{text.title}</h1>
            <p className="singing-dunes-article__dek">{text.dek}</p>
            <strong className="singing-dunes-article__boom">{text.boom}</strong>
          </div>
          <div className="singing-dunes-article__hero-stickers" aria-hidden="true">
            <img src={SINGING_DUNE_STICKERS[2]!.url} alt="" />
            <img src={SINGING_DUNE_STICKERS[6]!.url} alt="" />
          </div>
        </header>

        <div className="singing-dunes-article__sections">
          {text.sections.map((section, sectionIndex) => (
            <section className="singing-dunes-article__section" id={section.id} key={section.id}>
              <span className="singing-dunes-article__number" aria-hidden="true">{String(sectionIndex + 1).padStart(2, "0")}</span>
              <h2>{section.title}</h2>
              <div className="singing-dunes-article__copy">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <Fragment key={paragraph}>
                    <p>{paragraph}</p>
                    {sectionIndex === 0 && paragraphIndex === 1 ? (
                      <SingingDuneAudioPlayer copy={text.audio} />
                    ) : null}
                  </Fragment>
                ))}
              </div>
              {section.bullets ? (
                <ul className="singing-dunes-article__chips">
                  {section.bullets.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}
              {section.note ? <aside className="singing-dunes-article__note">{section.note}</aside> : null}
              <div className="singing-dunes-article__sticker-row" aria-hidden="true">
                {section.stickerIndices.map((index, imageIndex) => (
                  <img
                    className={imageIndex % 2 ? "is-tilted-back" : "is-tilted"}
                    src={SINGING_DUNE_STICKERS[index]!.url}
                    alt=""
                    key={SINGING_DUNE_STICKERS[index]!.fileName}
                    loading="lazy"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="singing-dunes-article__chain" aria-labelledby="singing-dunes-chain-title">
          <h2 id="singing-dunes-chain-title">{text.chainTitle}</h2>
          <ol>
            {text.chain.map((item, index) => (
              <li key={item}>
                <strong>{item}</strong>
                {index < text.chain.length - 1 ? <span aria-hidden="true">↓</span> : null}
              </li>
            ))}
          </ol>
          <img src={SINGING_DUNE_STICKERS[21]!.url} alt="" aria-hidden="true" loading="lazy" />
        </section>

        <section className="singing-dunes-article__finale">
          <img src={SINGING_DUNE_STICKERS[22]!.url} alt="" aria-hidden="true" loading="lazy" />
          <div>{text.finale.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        </section>

        <footer className="singing-dunes-article__sources">
          <h2>{text.readMore}</h2>
          <ul>
            {SINGING_DUNE_SOURCES.map((source) => (
              <li key={source.href}>
                <a href={source.href} target="_blank" rel="noreferrer noopener">{source.label}</a>
              </li>
            ))}
          </ul>
        </footer>
      </article>
    </main>
  );
}
