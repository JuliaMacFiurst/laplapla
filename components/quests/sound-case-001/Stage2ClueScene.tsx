import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";

export const STAGE_3_EQUALIZER_PATH = "/quests/sound-case-001/stage-03/equalizer";

type Stage2ClueSceneProps = {
  lang: Lang;
  backgroundUrl: string;
  parrotUrl: string;
  parrot2Url: string;
  sandUrl: string;
};

export function Stage2ClueScene({
  lang,
  backgroundUrl,
  parrotUrl,
  parrot2Url,
  sandUrl,
}: Stage2ClueSceneProps) {
  const text = dictionaries[lang].shop.soundCase.stage02ClueScene;
  const equalizerActionLabel = text.equalizerAction.replace(/^🎚️\s*/, "");

  return (
    <main className="stage-2-clue-scene" lang={lang} dir={lang === "he" ? "rtl" : "ltr"}>
      <div
        className="stage-2-clue-scene__background"
        style={{ backgroundImage: `url("${backgroundUrl}")` }}
        aria-hidden="true"
      />
      <div className="stage-2-clue-scene__shade" aria-hidden="true" />

      <div className="stage-2-clue-scene__shell">
        <header className="stage-2-clue-scene__identity">
          <bdi dir="ltr">PARROT SOUND LAB</bdi>
          <span>{text.stageLabel}</span>
        </header>

        <section className="stage-2-clue-scene__case" aria-labelledby="stage-2-clue-heading">
          <div className="stage-2-clue-scene__story">
            <div className="stage-2-clue-scene__heading">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={parrotUrl} alt="" aria-hidden="true" />
              <div>
                <span>{text.parrotLabel}</span>
                <h1 id="stage-2-clue-heading">{text.heading}</h1>
              </div>
            </div>

            <div className="stage-2-clue-scene__speech">
              {text.speech.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
            </div>

            <a className="stage-2-clue-scene__action" href={STAGE_3_EQUALIZER_PATH} aria-label={text.equalizerAction}>
              <span className="stage-2-clue-scene__equalizer" aria-hidden="true">
                <i><b /></i><i><b /></i><i><b /></i>
              </span>
              <span>{equalizerActionLabel}</span>
            </a>
          </div>

          <div className="stage-2-clue-scene__art" aria-hidden="true">
            <div className="stage-2-clue-scene__art-orbit" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="stage-2-clue-scene__art-parrot" src={parrot2Url} alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="stage-2-clue-scene__art-sand" src={sandUrl} alt="" />
            <span className="stage-2-clue-scene__art-label" dir="ltr">SOUND CASE #001 · STAGE 02</span>
          </div>
        </section>

        <details className="stage-2-clue-scene__bonus">
          <summary>{text.adultBonusTitle}</summary>
          <div>
            <h2>{text.adultBonusQuestion}</h2>
            <p>{text.adultBonusExplanation}</p>
          </div>
        </details>
      </div>
    </main>
  );
}
