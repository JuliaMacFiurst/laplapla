import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import type { SoundCardDefinition } from "@/lib/shop/quests/sound-case-001/soundCards";

export type PrintableSoundCard = {
  card: SoundCardDefinition;
  illustrationUrl: string;
};

type SoundCardsPageProps = {
  cards: readonly PrintableSoundCard[];
  locale: Lang;
  sheetNumber: 1 | 2;
  sheetCount: 2;
};

export function SoundCardsPage({
  cards,
  locale,
  sheetNumber,
  sheetCount,
}: SoundCardsPageProps) {
  const text = dictionaries[locale].shop.soundCase.soundCards;

  return (
    <section className="quest-sound-cards-sheet">
      <header className="quest-sound-cards-sheet__header" dir="ltr">
        <bdi dir="ltr">LAP LAP LA ADVENTURES</bdi>
        <span aria-hidden="true">·</span>
        <bdi dir="ltr">SOUND CASE #001</bdi>
        <span aria-hidden="true">·</span>
        <bdi dir="ltr">{`SOUND CARDS ${sheetNumber}/${sheetCount}`}</bdi>
      </header>

      <div className="quest-sound-cards-sheet__grid">
        {cards.map(({ card, illustrationUrl }) => (
          <div className="quest-sound-card-cut-area" key={card.id}>
            <i className="quest-sound-card-cut-mark quest-sound-card-cut-mark--tl" aria-hidden="true" />
            <i className="quest-sound-card-cut-mark quest-sound-card-cut-mark--tr" aria-hidden="true" />
            <i className="quest-sound-card-cut-mark quest-sound-card-cut-mark--bl" aria-hidden="true" />
            <i className="quest-sound-card-cut-mark quest-sound-card-cut-mark--br" aria-hidden="true" />
            <article className="quest-sound-card" data-sound-card-id={card.id}>
              <header className="quest-sound-card__header">
                <bdi dir="ltr">SOUND CARD</bdi>
                <bdi dir="ltr">{String(card.number).padStart(2, "0")}</bdi>
              </header>

              <div className="quest-sound-card__illustration">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={illustrationUrl} alt="" />
              </div>

              <div className="quest-sound-card__prompt">
                <h2>{text.titles[card.titleKey]}</h2>
                {card.modifier ? (
                  <p className="quest-sound-card__modifier">
                    {text.modifiers[card.modifier]}
                  </p>
                ) : null}
              </div>

              <footer className="quest-sound-card__footer">
                <span className="quest-sound-card__wave" aria-hidden="true">⌁⌁⌁</span>
                <span>{text.footerInstruction}</span>
                <bdi dir="ltr">PARROT SOUND LAB</bdi>
              </footer>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
