import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";
import { getStage4PersonalizedLead } from "@/lib/shop/quests/sound-case-001/brokenRhythm";

function ClapComparison({ text, clapOutOfSyncUrl, clapTogetherUrl }: {
  text: { asyncLabel: string; togetherLabel: string };
  clapOutOfSyncUrl: string;
  clapTogetherUrl: string;
}) {
  return (
    <div className="stage-4-result__comparison" aria-label={`${text.asyncLabel}. ${text.togetherLabel}.`}>
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={clapOutOfSyncUrl} alt="" aria-hidden="true" />
        <figcaption>{text.asyncLabel}</figcaption>
      </figure>
      <span aria-hidden="true">→</span>
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={clapTogetherUrl} alt="" aria-hidden="true" />
        <figcaption>{text.togetherLabel}</figcaption>
      </figure>
    </div>
  );
}

export function Stage4ResultScene({ lang, result, parrotUrl, clapOutOfSyncUrl, clapTogetherUrl, personalization }: {
  lang: Lang;
  result: "wrong" | "correct";
  parrotUrl: string;
  clapOutOfSyncUrl: string;
  clapTogetherUrl: string;
  personalization?: QuestPersonalization;
}) {
  const text = dictionaries[lang].shop.soundCase.stage04.digital;
  const leadName = getStage4PersonalizedLead(personalization?.leadName);
  const direction = lang === "he" ? "rtl" : "ltr";
  const namedLine = result === "wrong"
    ? leadName ? <><bdi>{leadName}</bdi>{text.wrongNamedSuffix}</> : text.wrongGeneric
    : leadName ? <><bdi>{leadName}</bdi>{text.correctNamedSuffix}</> : text.correctGeneric;

  return (
    <main className={`stage-4-result stage-4-result--${result}`} lang={lang} dir={direction}>
      <div className="stage-4-result__shell">
        <header><bdi dir="ltr">PARROT SOUND LAB</bdi><span>{text.stageLabel}</span></header>
        {result === "wrong" ? (
          <section className="stage-4-result__wrong">
            {/* eslint-disable-next-line @next/next/no-img-element */}<img src={parrotUrl} alt="" aria-hidden="true" />
            <div>
              <h1>{text.wrongTitle}</h1>
              <p className="stage-4-result__lead">{namedLine}</p>
              {text.wrongLines.map((line) => <p key={line}>{line}</p>)}
              <section className="stage-4-result__wrong-next" aria-label={text.wrongNextTitle}>
                <h2>{text.wrongNextTitle}</h2>
                <ol>{text.wrongSteps.map((step) => <li key={step}>{step}</li>)}</ol>
                <blockquote>{text.wrongParrotLine}</blockquote>
              </section>
            </div>
          </section>
        ) : (
          <>
            <section className="stage-4-result__celebrate"><h1>{text.correctTitle}</h1><p>{namedLine}</p></section>
            <section className="stage-4-result__experiment"><h2>{text.checkTitle}</h2><h3>{text.question}</h3><ClapComparison text={text} clapOutOfSyncUrl={clapOutOfSyncUrl} clapTogetherUrl={clapTogetherUrl} /><p className="stage-4-result__prompt">{text.prompt}</p><blockquote>{text.challenge}</blockquote><ol>{text.experimentSteps.map((step) => <li key={step}>{step}</li>)}</ol><div className="stage-4-result__explanation">{text.explanation.map((line) => <p key={line}>{line}</p>)}</div></section>
            <section className="stage-4-result__clue"><span>{text.clueTitle}</span>{text.clueLines.map((line) => <strong key={line}>{line}</strong>)}</section>
            <section className="stage-4-result__parrot">
              {/* eslint-disable-next-line @next/next/no-img-element */}<img src={parrotUrl} alt="" aria-hidden="true" />
              <div>{text.parrotLines.map((line) => <p key={line}>{line}</p>)}</div>
            </section>
            <section className="stage-4-result__next" aria-label={text.nextTitle}><h2>{text.nextTitle}</h2><strong>{text.phoneAway}</strong><strong>{text.findSamples}</strong><p>{text.adultSetup}</p><p>{text.visibleRule}</p><ol>{text.playerSteps.map((step) => <li key={step}>{step}</li>)}</ol><b>{text.goAction}</b></section>
          </>
        )}
      </div>
    </main>
  );
}
