/* eslint-disable @next/next/no-img-element */
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import type { CSSProperties } from "react";
import Link from "next/link";
import { buildLocalizedHref, buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { buildParrotStyleHref } from "@/lib/parrots/styleRouting";
import { WAKE_THE_DUNE_ROUTE } from "@/lib/miniGames/wakeTheDune";
import { SOUND_CASE_001_HUMAN_EQUALIZER_PUBLIC_PATH } from "@/lib/quests/soundCaseRouting";
import { SINGING_DUNES_ARTICLE_ROUTE } from "@/lib/quests/singingDunesArticle";

const SINGING_DUNE_LESSON_ROUTE = "/dog/lessons/poyushaya-dyuna";
const SINGING_DUNE_STYLE_ID = "singing-dune";

export function SoundCaseHubScene({
  lang,
  backgroundUrl,
  parrotUrl,
  singingDuneArtworkUrl,
  wakeTheDuneIconUrl,
  humanEqualizerIconUrl,
  articleArtworkUrl,
  drawingPreviewUrl,
}: {
  lang: Lang;
  backgroundUrl: string;
  parrotUrl: string;
  singingDuneArtworkUrl: string;
  wakeTheDuneIconUrl: string;
  humanEqualizerIconUrl: string;
  articleArtworkUrl: string;
  drawingPreviewUrl: string | null;
}) {
  const text = dictionaries[lang].shop.soundCase.finale.hub;
  const homeLabel = dictionaries[lang].footer.home;

  return (
    <main
      className="sound-case-finale sound-case-finale--hub"
      data-sound-case-page="hub"
      lang={lang}
      dir={lang === "he" ? "rtl" : "ltr"}
      style={{ "--sound-case-finale-background": `url("${backgroundUrl}")` } as CSSProperties}
    >
      <div className="sound-case-finale__backdrop" aria-hidden="true" />
      <div className="sound-case-finale__shell">
        <header className="sound-case-finale__mast">
          <Link className="sound-case-hub__home" href={buildLocalizedPublicPath("/", lang)} locale={lang} aria-label={homeLabel}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 11 8-7 8 7" /><path d="M6.5 9.5V20h11V9.5M10 20v-6h4v6" /></svg>
            <span>{homeLabel}</span>
          </Link>
          <bdi dir="ltr">PARROT SOUND LAB</bdi>
          <span><bdi dir="ltr">INVESTIGATOR HUB · CASE #001</bdi></span>
        </header>

        <section className="sound-case-hub__intro" aria-labelledby="sound-case-hub-title">
          <div>
            <p className="sound-case-finale__eyebrow">{text.eyebrow}</p>
            <h1 id="sound-case-hub-title">{text.title}</h1>
            <p className="sound-case-hub__lead">{text.lead}</p>
            <p>{text.body}</p>
          </div>
          <div className="sound-case-hub__parrot" aria-hidden="true">
            <span>✦</span>
            <img src={parrotUrl} alt="" />
          </div>
        </section>

        <section className="sound-case-hub__hangar" aria-labelledby="sound-case-hub-areas-title">
          <div className="sound-case-hub__hangar-heading">
            <h2 id="sound-case-hub-areas-title">{text.sectionTitle}</h2>
          </div>
          <ul aria-label={text.sectionTitle}>
            {text.categories.map((category, index) => {
              if (index === 0) {
                return <li className="sound-case-hub__activity sound-case-hub__activity--music" key={category}>
                  <Link href={buildParrotStyleHref(SINGING_DUNE_STYLE_ID, lang)} locale={lang} aria-label={category}>
                    <span className="sound-case-hub__activity-media" aria-hidden="true">
                      <img src={singingDuneArtworkUrl} alt="" />
                    </span>
                    <strong>{category}</strong>
                  </Link>
                </li>;
              }

              if (index === 1) {
                return <li className="sound-case-hub__activity sound-case-hub__activity--drawing" key={category}>
                  <Link href={buildLocalizedPublicPath(SINGING_DUNE_LESSON_ROUTE, lang)} locale={lang} aria-label={category}>
                    <span className="sound-case-hub__activity-media" aria-hidden="true">
                      {drawingPreviewUrl ? <img src={drawingPreviewUrl} alt="" /> : <span className="sound-case-hub__activity-placeholder" aria-hidden="true" />}
                      <img className="sound-case-hub__pencil" src="/dog/pencile.png" alt="" aria-hidden="true" />
                    </span>
                    <strong>{category}</strong>
                  </Link>
                </li>;
              }

              if (index === 2) {
                return <li className="sound-case-hub__activity sound-case-hub__activity--equalizer" key={category}>
                  <Link href={buildLocalizedHref(`${SOUND_CASE_001_HUMAN_EQUALIZER_PUBLIC_PATH}?from=hub`, lang)} locale={lang} aria-label={category}>
                    <span className="sound-case-hub__activity-media" aria-hidden="true"><img src={humanEqualizerIconUrl} alt="" /></span>
                    <strong>{category}</strong>
                  </Link>
                </li>;
              }

              if (index === 3) {
                return <li className="sound-case-hub__activity sound-case-hub__activity--game" key={category}>
                  <Link href={buildLocalizedPublicPath(WAKE_THE_DUNE_ROUTE, lang)} locale={lang} aria-label={category}>
                    <span className="sound-case-hub__activity-media" aria-hidden="true"><img src={wakeTheDuneIconUrl} alt="" /></span>
                    <strong>{category}</strong>
                  </Link>
                </li>;
              }

              return <li className="sound-case-hub__activity sound-case-hub__activity--article" key={category}>
                <Link href={buildLocalizedPublicPath(SINGING_DUNES_ARTICLE_ROUTE, lang)} locale={lang} aria-label={category}>
                  <span className="sound-case-hub__activity-media" aria-hidden="true"><img src={articleArtworkUrl} alt="" /></span>
                  <strong>{category}</strong>
                </Link>
              </li>;
            })}
          </ul>
        </section>

        <footer className="sound-case-hub__footer">
          <span aria-hidden="true">◉</span>
          <p>{text.footer}</p>
        </footer>
      </div>
    </main>
  );
}
