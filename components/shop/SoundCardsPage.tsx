import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import type { SoundCardDefinition } from "@/lib/shop/quests/sound-case-001/soundCards";
import type { SoundCardSheetSlot } from "@/lib/shop/quests/sound-case-001/soundCards";
import type { UnknownSoundCardDefinition } from "@/lib/shop/quests/sound-case-001/unknownSoundCard";
import { SoundCardCutArea } from "./SoundCardCutArea";
import { UnknownSoundCardFront } from "./UnknownSoundCard";
import type { IntroCardDefinition } from "@/lib/shop/quests/sound-case-001/introCard";
import { IntroCardFront } from "./IntroCard";

export type PrintableSoundCard = {
  card: SoundCardDefinition;
  illustrationUrl: string;
  slot: SoundCardSheetSlot;
};

export type PrintableUnknownSoundCard = {
  definition: UnknownSoundCardDefinition;
  parrotUrl: string;
};

export type PrintableIntroCard = {
  definition: IntroCardDefinition;
  parrotUrl: string;
};

function SoundWaveMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`quest-sound-card__wave${compact ? " quest-sound-card__wave--compact" : ""}`}
      aria-hidden="true"
    >
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

type SoundCardsPageProps = {
  cards: readonly PrintableSoundCard[];
  locale: Lang;
  sheetNumber: 1 | 2;
  sheetCount: 2;
  pairId: string;
  unknownSoundCard?: PrintableUnknownSoundCard;
  introCard?: PrintableIntroCard;
  leadName: string;
};

export function SoundCardsPage({
  cards,
  locale,
  sheetNumber,
  sheetCount,
  pairId,
  unknownSoundCard,
  introCard,
  leadName,
}: SoundCardsPageProps) {
  const text = dictionaries[locale].shop.soundCase.soundCards;
  const guidance = dictionaries[locale].shop.soundCase.soundCardBacks;

  return (
    <section className="quest-sound-cards-sheet quest-sound-cards-sheet--front">
      <div
        className="quest-sound-cards-sheet__front-orientation"
        data-page-orientation-guide="front-top-edge"
        dir={locale === "he" ? "rtl" : "ltr"}
      >
        <strong>
          <span aria-hidden="true">↑</span>{" "}
          {guidance.frontTopEdge}{" "}
          <span aria-hidden="true">↑</span>
        </strong>
        <span>
          {guidance.frontSideLabel}{" "}
          <span aria-hidden="true">•</span>{" "}
          {guidance.sheetLabel} <bdi dir="ltr">{sheetNumber}</bdi>
        </span>
      </div>

      <header className="quest-sound-cards-sheet__header" dir="ltr">
        <bdi dir="ltr">LAP LAP LA ADVENTURES</bdi>
        <span aria-hidden="true">·</span>
        <bdi dir="ltr">SOUND CASE #001</bdi>
        <span aria-hidden="true">·</span>
        <bdi dir="ltr">{`SOUND CARDS ${sheetNumber}/${sheetCount}`}</bdi>
      </header>

      <div className="quest-sound-cards-sheet__grid">
        {cards.map(({ card, illustrationUrl, slot }) => (
          <SoundCardCutArea
            key={card.id}
            slot={slot}
            frontSlot={slot}
            pairId={pairId}
          >
            <article
              className={`quest-sound-card quest-sound-card--accent-${card.accent} quest-sound-card--title-${card.titleSize}${card.modifier ? " quest-sound-card--special" : ""}`}
              data-sound-card-id={card.id}
              data-asset-id={card.illustrationAssetId}
              data-asset-status="resolved"
              data-card-accent={card.accent}
              data-title-size={card.titleSize}
              dir={locale === "he" ? "rtl" : "ltr"}
              lang={locale}
            >
              <header className="quest-sound-card__header">
                <span className="quest-sound-card__label">
                  <bdi dir="ltr">SOUND CARD</bdi>
                  <SoundWaveMark compact />
                </span>
                <bdi className="quest-sound-card__number" dir="ltr">
                  {String(card.number).padStart(2, "0")}
                </bdi>
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
                <SoundWaveMark />
                <span>{text.footerInstruction}</span>
                <bdi dir="ltr">PARROT SOUND LAB</bdi>
              </footer>
            </article>
          </SoundCardCutArea>
        ))}
        {unknownSoundCard ? (
          <SoundCardCutArea
            slot={unknownSoundCard.definition.frontSlot}
            frontSlot={unknownSoundCard.definition.frontSlot}
            backSlot={unknownSoundCard.definition.backSlot}
            pairId={pairId}
          >
            <UnknownSoundCardFront
              definition={unknownSoundCard.definition}
              locale={locale}
              parrotUrl={unknownSoundCard.parrotUrl}
            />
          </SoundCardCutArea>
        ) : null}
        {introCard ? (
          <SoundCardCutArea
            slot={introCard.definition.frontSlot}
            frontSlot={introCard.definition.frontSlot}
            backSlot={introCard.definition.backSlot}
            pairId={pairId}
          >
            <IntroCardFront
              definition={introCard.definition}
              locale={locale}
              leadName={leadName}
              parrotUrl={introCard.parrotUrl}
            />
          </SoundCardCutArea>
        ) : null}
      </div>
    </section>
  );
}
