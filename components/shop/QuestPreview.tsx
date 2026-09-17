import { dictionaries } from "@/i18n";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";

export function QuestPreview({
  personalization,
}: {
  personalization: QuestPersonalization;
}) {
  const soundCase = dictionaries[personalization.locale].shop.soundCase;
  const text = soundCase.preview;
  const leadName = personalization.leadName.trim() || text.namePlaceholder;
  const participants = personalization.participants
    .map((name) => name.trim())
    .filter(Boolean);

  return (
    <section
      className="quest-product-preview"
      data-quest-preview="sound-case-001"
      dir={personalization.locale === "he" ? "rtl" : "ltr"}
      lang={personalization.locale}
      aria-labelledby="quest-product-preview-title"
    >
      <header className="quest-product-preview__header">
        <p>{text.eyebrow}</p>
        <h2 id="quest-product-preview-title">{soundCase.title}</h2>
        <p className="quest-product-preview__personalized">
          {text.personalizedForPrefix}
          <bdi>{leadName}</bdi>
        </p>
        {participants.length ? (
          <div className="quest-product-preview__team">
            <h3>{text.teamHeading}</h3>
            <ul>
              {participants.map((name, index) => (
                <li key={`${index}-${name}`}><bdi>{name}</bdi></li>
              ))}
            </ul>
          </div>
        ) : null}
      </header>

      <div className="quest-product-preview__grid">
        <section>
          <h3>{text.includedTitle}</h3>
          <ul>
            {text.includedItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h3>{text.howItWorksTitle}</h3>
          <ol>
            {text.howItWorksSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </section>

        <section>
          <h3>{text.requirementsTitle}</h3>
          <ul>
            {text.requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
          <dl className="quest-product-preview__timing">
            <div>
              <dt>{text.preparationLabel}</dt>
              <dd>{text.preparationTime}</dd>
            </div>
            <div>
              <dt>{text.playLabel}</dt>
              <dd>{text.playTime}</dd>
            </div>
          </dl>
        </section>

        <section className="quest-product-preview__map">
          <h3>{text.adventureMapTitle}</h3>
          <ol>
            {text.adventureStages.map((stage, index) => (
              <li key={stage}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                {stage}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <footer className="quest-product-preview__purchase">
        <button type="button" disabled>{text.buyAction}</button>
        <p>{text.buyUnavailable}</p>
      </footer>
    </section>
  );
}
