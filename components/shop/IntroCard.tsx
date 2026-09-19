import { dictionaries, type Lang } from "@/i18n";
import type { IntroCardDefinition } from "@/lib/shop/quests/sound-case-001/introCard";

type IntroCardFrontProps = {
  definition: IntroCardDefinition;
  locale: Lang;
  leadName: string;
  parrotUrl: string;
};

export function IntroCardFront({
  definition,
  locale,
  leadName,
  parrotUrl,
}: IntroCardFrontProps) {
  const soundCase = dictionaries[locale].shop.soundCase;
  const text = soundCase.introCard;
  const lead = leadName.trim() || soundCase.caseCover.namePlaceholder;

  return (
    <article
      className="quest-intro-card quest-intro-card--front"
      data-physical-object-id={definition.id}
      data-rendering-role={definition.frontRole}
      data-asset-id={definition.parrotAssetId}
      data-asset-status="resolved"
      dir={locale === "he" ? "rtl" : "ltr"}
      lang={locale}
    >
      <header className="quest-intro-card__header">
        <div>
          <bdi dir="ltr">PARROT SOUND LAB</bdi>
          <span><bdi dir="ltr">STAGE 01</bdi></span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={parrotUrl} alt="" />
      </header>

      <section className="quest-intro-card__speech">
        <strong>{soundCase.caseCover.parrotLabel}</strong>
        <p className="quest-intro-card__greeting">
          <bdi>{lead}</bdi><span>{soundCase.caseCover.parrotGreeting}</span>
        </p>
        {text.storyLines.map((line) => <p key={line}>{line}</p>)}
      </section>

      <footer>
        <span>{soundCase.caseCover.parrotCallout}</span>
        <bdi dir="ltr">SOUND CASE #001</bdi>
      </footer>
    </article>
  );
}

type IntroCardBackProps = {
  definition: IntroCardDefinition;
  locale: Lang;
};

export function IntroCardBack({ definition, locale }: IntroCardBackProps) {
  const text = dictionaries[locale].shop.soundCase.caseCover;
  const ruleMarks = ["01", "02", "03", "04"] as const;

  return (
    <article
      className="quest-intro-card quest-intro-card--back"
      data-physical-object-id={definition.id}
      data-rendering-role={definition.backRole}
      dir={locale === "he" ? "rtl" : "ltr"}
      lang={locale}
    >
      <header>
        <bdi dir="ltr">STAGE 01</bdi>
        <h2>{text.gameHeading}</h2>
      </header>
      <p className="quest-intro-card__flow">{text.gameFlow}</p>
      <ol className="quest-intro-card__rules">
        {text.gameRules.map((rule, index) => (
          <li key={rule}>
            <bdi dir="ltr">{ruleMarks[index]}</bdi>
            <span>{rule}</span>
          </li>
        ))}
      </ol>
      <div className="quest-intro-card__groups">
        {text.groupNotes.map((note) => <p key={note}>{note}</p>)}
      </div>
      <p className="quest-intro-card__next">{text.transition}</p>
      <footer><bdi dir="ltr">PARROT SOUND LAB · SOUND CASE #001</bdi></footer>
    </article>
  );
}
