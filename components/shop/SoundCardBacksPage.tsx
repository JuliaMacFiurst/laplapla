import type {
  SoundCardBackPlacement,
  SoundCardDuplexMode,
} from "@/lib/shop/quests/sound-case-001/soundCards";
import { dictionaries, type Lang } from "@/i18n";
import type { UnknownSoundCardDefinition } from "@/lib/shop/quests/sound-case-001/unknownSoundCard";
import { SoundCardCutArea } from "./SoundCardCutArea";
import { UnknownSoundCardBack } from "./UnknownSoundCard";
import type { IntroCardDefinition } from "@/lib/shop/quests/sound-case-001/introCard";
import { IntroCardBack } from "./IntroCard";

type SoundCardBacksPageProps = {
  cards: readonly SoundCardBackPlacement[];
  backAssetId: "stage-1-card-back";
  backUrl: string;
  sheetNumber: 1 | 2;
  sheetCount: 2;
  pairId: string;
  duplexMode: SoundCardDuplexMode;
  locale: Lang;
  unknownSoundCard?: UnknownSoundCardDefinition;
  introCard?: IntroCardDefinition;
};

export function SoundCardBacksPage({
  cards,
  backAssetId,
  backUrl,
  sheetNumber,
  sheetCount,
  pairId,
  duplexMode,
  locale,
  unknownSoundCard,
  introCard,
}: SoundCardBacksPageProps) {
  const guidance = dictionaries[locale].shop.soundCase.soundCardBacks;
  const frontIdentity = `SOUND CARDS ${sheetNumber}/${sheetCount}`;
  const backIdentity = `SOUND CARD BACKS ${sheetNumber}/${sheetCount}`;

  return (
    <section
      className="quest-sound-cards-sheet quest-sound-card-backs-sheet"
      data-duplex-mode={duplexMode}
    >
      <header className="quest-sound-cards-sheet__header" dir="ltr">
        <bdi dir="ltr">LAP LAP LA ADVENTURES</bdi>
        <span aria-hidden="true">·</span>
        <bdi dir="ltr">SOUND CASE #001</bdi>
        <span aria-hidden="true">·</span>
        <bdi dir="ltr">{`SOUND CARD BACKS ${sheetNumber}/${sheetCount}`}</bdi>
      </header>

      <div className="quest-sound-cards-sheet__grid">
        {cards.map(({ cardId, frontSlot, backSlot }) => (
          <SoundCardCutArea
            key={cardId}
            slot={backSlot}
            frontSlot={frontSlot}
            backSlot={backSlot}
            pairId={pairId}
          >
            <article
              className="quest-sound-card-back"
              data-sound-card-id={cardId}
              data-rendering-role="ordinary-sound-card-back"
              data-asset-id={backAssetId}
              data-asset-status="resolved"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={backUrl} alt="" />
            </article>
          </SoundCardCutArea>
        ))}

        {unknownSoundCard ? (
          <SoundCardCutArea
            slot={unknownSoundCard.backSlot}
            frontSlot={unknownSoundCard.frontSlot}
            backSlot={unknownSoundCard.backSlot}
            pairId={pairId}
          >
            <UnknownSoundCardBack definition={unknownSoundCard} />
          </SoundCardCutArea>
        ) : null}
        {introCard ? (
          <SoundCardCutArea
            slot={introCard.backSlot}
            frontSlot={introCard.frontSlot}
            backSlot={introCard.backSlot}
            pairId={pairId}
          >
            <IntroCardBack definition={introCard} locale={locale} />
          </SoundCardCutArea>
        ) : null}
      </div>

      <aside
        className="quest-sound-card-backs-sheet__manual-guide"
        data-duplex-pairing-guide="true"
        dir={locale === "he" ? "rtl" : "ltr"}
      >
        <div className="quest-sound-card-backs-sheet__warning">
          <strong>{guidance.backSide}</strong>
          <bdi dir="ltr">{backIdentity}</bdi>
        </div>
        <p className="quest-sound-card-backs-sheet__pairing">
          <span>{guidance.frontLabel}:</span>{" "}
          <bdi dir="ltr">{frontIdentity}</bdi>
          <span aria-hidden="true"> → </span>
          <span>{guidance.backLabel}:</span>{" "}
          <bdi dir="ltr">{backIdentity}</bdi>
        </p>
      </aside>
    </section>
  );
}
