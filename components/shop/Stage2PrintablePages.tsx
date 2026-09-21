import type { ReactNode } from "react";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import type { VibratingCardDefinition } from "@/lib/shop/quests/sound-case-001/vibratingCards";
import {
  SOUND_CASE_001_STAGE_2_BOX,
  SOUND_CASE_001_STAGE_2_INTRO_CARD,
  SOUND_CASE_001_STAGE_2_PHRASES,
} from "@/lib/shop/quests/sound-case-001/vibratingCards";
import { getStage2VibratingCardPositionMm, STAGE_2_CLUE_CARD_SIZE_MM, STAGE_2_VIBRATING_CARD_SIZE_MM } from "@/lib/shop/quests/sound-case-001/vibratingCards";
import { SoundCardCutArea } from "./SoundCardCutArea";

type ResolvedVibratingCard = {
  card: VibratingCardDefinition;
  illustrationUrl: string;
};

type Stage2ClueDefinition = {
  id: string;
  frontRole: string;
  backRole: string;
  frontPositionMm: { x: number; y: number };
  backPositionMm: { x: number; y: number };
  duplexMode: "flip-long-edge";
  qrDestination: string;
  qrAssetPath: string;
};

function Stage2SheetHeader({ label }: { label: string }) {
  return (
    <header className="quest-stage-2-sheet__header" dir="ltr">
      <bdi dir="ltr">LAP LAP LA ADVENTURES</bdi>
      <span aria-hidden="true">·</span>
      <bdi dir="ltr">SOUND CASE #001</bdi>
      <span aria-hidden="true">·</span>
      <bdi dir="ltr">{label}</bdi>
    </header>
  );
}

function Stage2CutObject({
  children,
  position,
  size,
  role,
}: {
  children: ReactNode;
  position: { x: number; y: number };
  size: { width: number; height: number };
  role: string;
}) {
  return (
    <div
      className="quest-stage-2-cut-object"
      data-cut-object={role}
      data-cut-x-mm={position.x}
      data-cut-y-mm={position.y}
      data-cut-width-mm={size.width}
      data-cut-height-mm={size.height}
      style={{
        left: `${position.x}mm`,
        top: `${position.y}mm`,
        width: `${size.width}mm`,
        // For WebP cards, the image's intrinsic ratio sets the actual cut height
        // (1669- and 1670-pixel-wide sources differ by about 0.02 mm).
        height: role === "vibrating" ? "auto" : `${size.height}mm`,
      }}
    >
      <i className="quest-stage-2-cut-mark quest-stage-2-cut-mark--tl" aria-hidden="true" />
      <i className="quest-stage-2-cut-mark quest-stage-2-cut-mark--tr" aria-hidden="true" />
      <i className="quest-stage-2-cut-mark quest-stage-2-cut-mark--bl" aria-hidden="true" />
      <i className="quest-stage-2-cut-mark quest-stage-2-cut-mark--br" aria-hidden="true" />
      {children}
    </div>
  );
}

export function Stage2VibratingCard({
  card,
  illustrationUrl,
  locale,
}: ResolvedVibratingCard & { locale: Lang }) {
  return (
    <article
      className="quest-stage-2-vibrating-card"
      data-physical-object-id={card.id}
      data-rendering-role="stage-2-vibrating-card"
      data-asset-id={card.illustrationAssetId}
      data-asset-status="resolved"
      data-gameplay-orientation="landscape"
      lang={locale}
      dir="ltr"
    >
      {/* The artwork itself defines the finished cut edge; no white frame or object-fit area. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={illustrationUrl} alt="" />
    </article>
  );
}

function Stage2IntroCard({ locale, parrotUrl }: { locale: Lang; parrotUrl: string }) {
  const text = dictionaries[locale].shop.soundCase.stage02;
  return (
    <article
      className={`quest-stage-2-intro-card quest-stage-2-intro-card--${locale}`}
      data-physical-object-id={SOUND_CASE_001_STAGE_2_INTRO_CARD.id}
      data-rendering-role={SOUND_CASE_001_STAGE_2_INTRO_CARD.role}
      data-asset-id={SOUND_CASE_001_STAGE_2_INTRO_CARD.parrotAssetId}
      data-asset-status="resolved"
      dir={locale === "he" ? "rtl" : "ltr"}
      lang={locale}
    >
      <header>
        <div>
          <bdi dir="ltr">SOUND CASE #001</bdi>
          <bdi dir="ltr">STAGE 02</bdi>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={parrotUrl} alt="" />
      </header>
      <strong className="quest-stage-2-intro-card__parrot">{text.intro.parrotLabel}</strong>
      <div className="quest-stage-2-intro-card__speech">
        {text.intro.speech.map((line) => <p key={line}>{line}</p>)}
      </div>
      <div className="quest-stage-2-intro-card__challenge">
        <strong>{text.intro.challenge}</strong>
        <p>{text.intro.task}</p>
      </div>
      <bdi className="quest-stage-2-intro-card__lab" dir="ltr">PARROT SOUND LAB</bdi>
    </article>
  );
}

function Stage2ClueFront({ definition, locale }: { definition: Stage2ClueDefinition; locale: Lang }) {
  const text = dictionaries[locale].shop.soundCase.stage02;
  return (
    <article
      className={`quest-stage-2-clue quest-stage-2-clue--front quest-stage-2-clue--${locale}`}
      data-physical-object-id={definition.id}
      data-rendering-role={definition.frontRole}
      dir={locale === "he" ? "rtl" : "ltr"}
      lang={locale}
    >
      <bdi className="quest-stage-2-clue__case" dir="ltr">SOUND CASE #001 · STAGE 02</bdi>
      <h2>{text.clue.title}</h2>
      <strong className="quest-stage-2-clue__phrase">
        <bdi dir={locale === "he" ? "rtl" : "ltr"}>{SOUND_CASE_001_STAGE_2_PHRASES[locale]}</bdi>
      </strong>
      <div
        className="quest-stage-2-clue__qr-wrap"
        data-qr-destination={definition.qrDestination}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="quest-stage-2-clue__qr" src={definition.qrAssetPath} alt={text.clue.qrAccessLabel} />
      </div>
      <p className="quest-stage-2-clue__cta">{text.clue.cta}</p>
      <bdi className="quest-stage-2-clue__lab" dir="ltr">PARROT SOUND LAB</bdi>
    </article>
  );
}

function Stage2ClueBack({ definition, locale }: { definition: Stage2ClueDefinition; locale: Lang }) {
  const text = dictionaries[locale].shop.soundCase.stage02;
  return (
    <article
      className={`quest-stage-2-clue quest-stage-2-clue--back quest-stage-2-clue--${locale}`}
      data-physical-object-id={definition.id}
      data-rendering-role={definition.backRole}
      dir={locale === "he" ? "rtl" : "ltr"}
      lang={locale}
    >
      <bdi className="quest-stage-2-clue__case" dir="ltr">SOUND CASE #001 · STAGE 02</bdi>
      <strong className="quest-stage-2-clue__back-title">{text.clue.title}</strong>
      <div className="quest-stage-2-clue__stamp" aria-label={text.clue.backWarning.join(" ")}>
        {text.clue.backWarning.map((line) => <span key={line}>{line}</span>)}
      </div>
      <bdi className="quest-stage-2-clue__lab" dir="ltr">PARROT SOUND LAB</bdi>
    </article>
  );
}

export function Stage2VibratingCardsPage({
  cards,
  clue,
  locale,
}: {
  cards: readonly ResolvedVibratingCard[];
  clue: Stage2ClueDefinition;
  locale: Lang;
}) {
  return (
    <section className="quest-sound-cards-sheet quest-stage-2-sheet quest-stage-2-sheet--front">
      <Stage2SheetHeader label="VIBRATING CARDS · FRONT" />
      <div className="quest-stage-2-sheet__packing">
        {cards.map(({ card, illustrationUrl }, index) => (
          <Stage2CutObject key={card.id} position={getStage2VibratingCardPositionMm(index)} size={STAGE_2_VIBRATING_CARD_SIZE_MM} role="vibrating">
            <Stage2VibratingCard card={card} illustrationUrl={illustrationUrl} locale={locale} />
          </Stage2CutObject>
        ))}
        <Stage2CutObject position={clue.frontPositionMm} size={STAGE_2_CLUE_CARD_SIZE_MM} role="clue-front">
          <Stage2ClueFront definition={clue} locale={locale} />
        </Stage2CutObject>
      </div>
    </section>
  );
}

export function Stage2ClueBackPage({ clue, locale }: { clue: Stage2ClueDefinition; locale: Lang }) {
  return (
    <section className="quest-sound-cards-sheet quest-stage-2-sheet quest-stage-2-sheet--back">
      <Stage2SheetHeader label="CLUE #2 · BACK" />
      <div className="quest-stage-2-sheet__packing">
        <Stage2CutObject position={clue.backPositionMm} size={STAGE_2_CLUE_CARD_SIZE_MM} role="clue-back">
          <Stage2ClueBack definition={clue} locale={locale} />
        </Stage2CutObject>
      </div>
      <aside className="quest-stage-2-sheet__duplex-note" dir={locale === "he" ? "rtl" : "ltr"}>
        <strong>{dictionaries[locale].shop.soundCase.stage02.printHelp.duplexTitle}</strong>
        <span>Flip on long edge · A4 · 100% / Actual Size</span>
      </aside>
    </section>
  );
}

function Stage2BoxArtwork({ locale, parrotUrl }: { locale: Lang; parrotUrl: string }) {
  const text = dictionaries[locale].shop.soundCase.stage02;
  const direction = locale === "he" ? "rtl" : "ltr";
  return (
    <div className="quest-stage-2-box-artwork">
      <section className="quest-stage-2-box-artwork__front" dir={direction}>
        <bdi dir="ltr">LAP LAP LA ADVENTURES</bdi>
        <bdi className="quest-stage-2-box-artwork__case" dir="ltr">SOUND CASE #001</bdi>
        <strong><bdi dir="ltr">STAGE 02</bdi></strong>
        <h2>{text.title}</h2>
        <div className="quest-stage-2-box-artwork__stripes" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={parrotUrl} alt="" />
        <bdi dir="ltr">PARROT SOUND LAB</bdi>
      </section>
      <section className={`quest-stage-2-box-artwork__back quest-stage-2-box-artwork__back--${locale}`} dir={direction}>
        <h2>{text.box.rulesHeading}</h2>
        <ol>{text.box.rules.map((rule) => <li key={rule}>{rule}</li>)}</ol>
        <strong className="quest-stage-2-box-artwork__warning">{text.box.warning}</strong>
      </section>
      <aside className="quest-stage-2-box-artwork__side quest-stage-2-box-artwork__side--left">
        <bdi dir="ltr">STAGE 02 · VIBRATION</bdi>
      </aside>
      <aside className="quest-stage-2-box-artwork__side quest-stage-2-box-artwork__side--right">
        <bdi dir="ltr">SOUND CASE #001</bdi>
      </aside>
      <div className="quest-stage-2-box-artwork__top"><bdi dir="ltr">PARROT SOUND LAB</bdi></div>
      <div className="quest-stage-2-box-artwork__bottom"><bdi dir="ltr">STAGE 02 · VIBRATING CARDS</bdi></div>
    </div>
  );
}

export function Stage2BoxPage({
  locale,
  parrotUrl,
}: {
  locale: Lang;
  parrotUrl: string;
}) {
  const text = dictionaries[locale].shop.soundCase.stage02;
  const { internalSizeMm, dielineSizeMm } = SOUND_CASE_001_STAGE_2_BOX;
  return (
    <section
      className="quest-stage-2-box-sheet"
      data-card-box-dieline="stage-2-vibrating-card-box"
      data-card-box-internal-size={`${internalSizeMm.width}x${internalSizeMm.height}x${internalSizeMm.depth}mm`}
      data-card-box-dieline-size={`${dielineSizeMm.width}x${dielineSizeMm.height}mm`}
    >
      <header className="quest-stage-2-box-sheet__header">
        <div><bdi dir="ltr">LAP LAP LA ADVENTURES · SOUND CASE #001</bdi><h1>{text.box.title}</h1></div>
        <div className="quest-stage-2-box-sheet__legend" aria-label={text.box.legendLabel}>
          <span>✂ {text.box.cutLabel}</span><span className="quest-stage-2-box-sheet__fold-key"><i />{text.box.foldLabel}</span>
        </div>
      </header>
      <div className="quest-stage-2-box-sheet__dieline">
        <Stage2BoxArtwork locale={locale} parrotUrl={parrotUrl} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="quest-stage-2-box-sheet__guides" src={SOUND_CASE_001_STAGE_2_BOX.svgPath} alt={text.box.svgAlt} />
      </div>
      <div className="quest-stage-2-box-sheet__objects">
        <SoundCardCutArea>
          <Stage2IntroCard locale={locale} parrotUrl={parrotUrl} />
        </SoundCardCutArea>
      </div>
      <footer className="quest-stage-2-box-sheet__footer">
        <strong>{text.box.assemblyTitle}</strong>
        <span>{text.box.assemblySteps.join(" · ")}</span>
        <bdi dir="ltr">{text.box.printNote}</bdi>
      </footer>
    </section>
  );
}
