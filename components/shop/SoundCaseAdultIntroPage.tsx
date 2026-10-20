/* eslint-disable @next/next/no-img-element */
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";

export function SoundCaseAdultIntroPage({ locale, parrotUrl }: { locale: Lang; parrotUrl: string }) {
  const text = dictionaries[locale].shop.soundCase.adultIntro;
  const direction = locale === "he" ? "rtl" : "ltr";

  return (
    <section className="quest-page quest-page--a4 sound-case-adult-intro" dir={direction}>
      <header>
        <bdi dir="ltr">LAPLAPLA · SOUND CASE #001</bdi>
        <span>{text.hostLabel}</span>
      </header>
      <div className="sound-case-adult-intro__hero">
        <img src={parrotUrl} alt="" aria-hidden="true" />
        <div>
          <h1>{text.title}</h1>
          <p>{text.lead}</p>
        </div>
      </div>
      <div className="sound-case-adult-intro__body">
        {text.description.map((line) => <p key={line}>{line}</p>)}
        <aside>
          <h2>{text.importantTitle}</h2>
          <p>{text.importantBody}</p>
        </aside>
        <section aria-labelledby="sound-case-adult-start-title">
          <h2 id="sound-case-adult-start-title">{text.startTitle}</h2>
          <ol>{text.startSteps.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>
      </div>
      <strong className="sound-case-adult-intro__cue">{text.startCue}</strong>
      <footer>{text.phoneNote}</footer>
    </section>
  );
}
