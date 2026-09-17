import { dictionaries } from "@/i18n";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";

type CaseCoverPageProps = {
  personalization: QuestPersonalization;
  decorationUrl?: string;
};

export function CaseCoverPage({
  personalization,
  decorationUrl,
}: CaseCoverPageProps) {
  const soundCase = dictionaries[personalization.locale].shop.soundCase;
  const text = soundCase.caseCover;
  const leadName = personalization.leadName.trim() || text.namePlaceholder;
  const participants = personalization.participants
    .map((name) => name.trim())
    .filter(Boolean);

  return (
    <div className="quest-case-cover">
      <div className="quest-case-cover__orbit quest-case-cover__orbit--one" aria-hidden="true" />
      <div className="quest-case-cover__orbit quest-case-cover__orbit--two" aria-hidden="true" />

      {decorationUrl ? (
        // External quest art is served by a configurable CDN and should not be coupled to Next image hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="quest-case-cover__decoration"
          src={decorationUrl}
          alt=""
        />
      ) : (
        <div className="quest-case-cover__asset-slot" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}

      <header className="quest-case-cover__header">
        <p className="quest-case-cover__kicker">{text.kicker}</p>
        <h1>{soundCase.title}</h1>
      </header>

      <section className="quest-case-cover__investigators">
        <div>
          <h2>{text.leadHeading}</h2>
          <p><bdi className="quest-case-cover__name">{leadName}</bdi></p>
        </div>
        <div>
          <h2>{text.teamHeading}</h2>
          {participants.length ? (
            <ul>
              {participants.map((name, index) => (
                <li key={`${index}-${name}`}><bdi>{name}</bdi></li>
              ))}
            </ul>
          ) : (
            <p className="quest-case-cover__empty">{text.participantsEmpty}</p>
          )}
        </div>
      </section>

      <div className="quest-case-cover__story">
        {text.storyLines.map((line) => <p key={line}>{line}</p>)}
        <p className="quest-case-cover__assignment">{text.assignment}</p>
      </div>

      <footer className="quest-case-cover__footer">{text.caseNumber}</footer>
    </div>
  );
}
