import type { CSSProperties, ReactNode } from "react";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import type { SoundCase001Stage4GestureAssetId } from "@/lib/shop/quests/sound-case-001/assets";
import {
  STAGE_4_BOX_DIELINE_POSITION_MM,
  STAGE_4_BOX_DIELINE_SIZE_MM,
  STAGE_4_BOX_INNER_SIZE_MM,
  STAGE_4_CARD_SIZE_MM,
  STAGE_4_RULES_BACK_POSITION_MM,
  STAGE_4_RULES_CARD_SIZE_MM,
  STAGE_4_RULES_FRONT_POSITION_MM,
  formatStage4Level,
  getStage4CardPositionMm,
  getStage4SheetCards,
  type RhythmGesture,
} from "@/lib/shop/quests/sound-case-001/brokenRhythm";

export type Stage4GestureUrls = Record<RhythmGesture, string>;

const GESTURE_ASSET_IDS: Record<RhythmGesture, SoundCase001Stage4GestureAssetId> = {
  clap: "stage-4-gesture-clap",
  snap: "stage-4-gesture-snap",
  "knee-pat": "stage-4-gesture-knee-pat",
  pause: "stage-4-gesture-pause",
};

function RhythmSequence({ rhythm, gestureUrls, labels }: {
  rhythm: readonly RhythmGesture[];
  gestureUrls: Stage4GestureUrls;
  labels: Record<RhythmGesture, string>;
}) {
  return (
    <div className="quest-stage-4-rhythm" dir="ltr" data-rhythm-order={rhythm.join(",")}>
      {rhythm.map((gesture, index) => (
        <span className={`quest-stage-4-rhythm__gesture quest-stage-4-rhythm__gesture--${gesture}`} key={`${gesture}-${index}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gestureUrls[gesture]} alt={labels[gesture]} data-asset-id={GESTURE_ASSET_IDS[gesture]} />
        </span>
      ))}
    </div>
  );
}

function Stage4CutObject({ index, side, children }: { index: number; side: "front" | "back"; children: ReactNode }) {
  const front = getStage4CardPositionMm(index);
  const position = side === "front" ? front : { x: 210 - front.x - STAGE_4_CARD_SIZE_MM.width, y: front.y };
  return (
    <div
      className="quest-stage-4-cut-object"
      data-card-index={index}
      data-cut-x-mm={position.x}
      data-cut-y-mm={position.y}
      data-cut-width-mm={STAGE_4_CARD_SIZE_MM.width}
      data-cut-height-mm={STAGE_4_CARD_SIZE_MM.height}
      style={{ left: `${position.x}mm`, top: `${position.y}mm`, width: `${STAGE_4_CARD_SIZE_MM.width}mm`, height: `${STAGE_4_CARD_SIZE_MM.height}mm` }}
    >
      <i className="quest-stage-4-cut-mark quest-stage-4-cut-mark--tl" aria-hidden="true" />
      <i className="quest-stage-4-cut-mark quest-stage-4-cut-mark--tr" aria-hidden="true" />
      <i className="quest-stage-4-cut-mark quest-stage-4-cut-mark--bl" aria-hidden="true" />
      <i className="quest-stage-4-cut-mark quest-stage-4-cut-mark--br" aria-hidden="true" />
      {children}
    </div>
  );
}

function Stage4RulesCard({ locale, gestureUrls, side }: { locale: Lang; gestureUrls: Stage4GestureUrls; side: "front" | "back" }) {
  const text = dictionaries[locale].shop.soundCase.stage04.print;
  const direction = locale === "he" ? "rtl" : "ltr";
  if (side === "front") return <article className="quest-stage-4-rules-card quest-stage-4-rules-card--front" lang={locale} dir={direction} data-rules-side="front">
    <header><bdi dir="ltr">PARROT SOUND LAB · STAGE 04</bdi><h1>{text.title}</h1><h2>{text.rulesTitle}</h2></header>
    <ol>{text.rules.map((rule) => <li key={rule}>{rule}</li>)}</ol>
  </article>;

  return <article className="quest-stage-4-rules-card quest-stage-4-rules-card--back" lang={locale} dir={direction} data-rules-side="back">
    <h2>{text.legendTitle}</h2>
    <div className="quest-stage-4-rules-card__legend" dir="ltr">
      {(Object.keys(gestureUrls) as RhythmGesture[]).map((gesture) => <figure key={gesture}>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={gestureUrls[gesture]} alt="" /><figcaption dir={direction}>{text.gestureLabels[gesture]}</figcaption>
      </figure>)}
    </div>
    <p className="quest-stage-4-rules-card__snap">{text.snapAlternative}</p>
    <aside><strong>{text.levelSixTitle}</strong><span>{text.levelSixInstruction}</span></aside>
  </article>;
}

function Stage4CardFace({ card, locale, gestureUrls }: {
  card: ReturnType<typeof getStage4SheetCards>[number]; locale: Lang; gestureUrls: Stage4GestureUrls;
}) {
  const text = dictionaries[locale].shop.soundCase.stage04.print;
  const levelNumber = formatStage4Level(card.level.level);
  const rhythm = card.kind === "secret" ? card.level.secret : card.answer.rhythm;
  const qr = card.kind === "answer" ? card.answer.qrAssetPath : undefined;
  const qrDestination = card.kind === "answer" ? card.answer.qrDestination : undefined;
  return (
    <article
      className={`quest-stage-4-card quest-stage-4-card--face quest-stage-4-card--${card.kind}${qr ? " quest-stage-4-card--has-qr" : ""}`}
      style={{ "--stage-4-level-color": card.level.color } as CSSProperties}
      data-card-kind={card.kind}
      data-level={levelNumber}
      dir={locale === "he" ? "rtl" : "ltr"}
    >
      <i className="quest-stage-4-card__wave quest-stage-4-card__wave--top" aria-hidden="true" />
      <i className="quest-stage-4-card__wave quest-stage-4-card__wave--bottom" aria-hidden="true" />
      <header><bdi dir="ltr">{card.kind === "secret" ? "SECRET BEAT" : "ANSWER"}</bdi><strong>{text.levelLabel} <bdi dir="ltr">{levelNumber}</bdi></strong></header>
      <RhythmSequence rhythm={rhythm} gestureUrls={gestureUrls} labels={text.gestureLabels} />
      {card.level.level === 6 && card.kind === "secret" && <span className="quest-stage-4-card__parrot-mode"><bdi dir="ltr">PARROT MODE</bdi></span>}
      {qr && <div className="quest-stage-4-card__qr" data-qr-destination={qrDestination} dir={locale === "he" ? "rtl" : "ltr"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={qr} alt={text.scanQrLabel} /><span>{text.scanQrLabel}</span>
      </div>}
    </article>
  );
}

function Stage4CardBack({ card, locale }: { card: ReturnType<typeof getStage4SheetCards>[number]; locale: Lang }) {
  const text = dictionaries[locale].shop.soundCase.stage04.print;
  const levelNumber = formatStage4Level(card.level.level);
  return (
    <article className={`quest-stage-4-card quest-stage-4-card--back quest-stage-4-card--${card.kind}`} style={{ "--stage-4-level-color": card.level.color } as CSSProperties} dir={locale === "he" ? "rtl" : "ltr"}>
      <span className="quest-stage-4-card__back-pattern" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}<img className="quest-stage-4-card__logo" src="/laplapla-logo.webp" alt="LapLapLa" />
      <bdi className="quest-stage-4-card__back-kind" dir="ltr">{card.kind === "secret" ? "SECRET BEAT" : "ANSWER CARDS"}</bdi>
      <strong>{text.levelLabel}</strong><bdi className="quest-stage-4-card__number" dir="ltr">{levelNumber}</bdi>
      {card.kind === "secret" ? <div className="quest-stage-4-card__viewing"><svg className="quest-stage-4-card__eye" viewBox="0 0 48 28" aria-hidden="true"><path d="M2 14C8 5 15 2 24 2s16 3 22 12c-6 9-13 12-22 12S8 23 2 14Z" /><circle cx="24" cy="14" r="6" /></svg><bdi dir="ltr">5 SEC</bdi><p>{text.secretBackInstruction}</p></div> : <div className="quest-stage-4-card__answer-mark" aria-hidden="true"><i /><i /><i /><i /><i /></div>}
      <bdi className="quest-stage-4-card__lab" dir="ltr">PARROT SOUND LAB</bdi>
      {card.level.level === 6 && <bdi className="quest-stage-4-card__final-marker" dir="ltr">FINAL RHYTHM</bdi>}
    </article>
  );
}

export function Stage4CardsPage({ locale, sheetNumber, side, gestureUrls }: {
  locale: Lang; sheetNumber: 1 | 2 | 3; side: "front" | "back"; gestureUrls: Stage4GestureUrls;
}) {
  const cards = getStage4SheetCards(sheetNumber);
  return (
    <section className={`quest-stage-4-cards-sheet quest-stage-4-cards-sheet--${side}`} data-page-type="stage-4-cards" data-sheet-number={sheetNumber} data-duplex-side={side}>
      <header dir="ltr">LAP LAP LA ADVENTURES · SOUND CASE #001 · STAGE 04 · {side.toUpperCase()} · {sheetNumber}/3</header>
      <div>{cards.map((card, index) => <Stage4CutObject index={index} side={side} key={card.id}>{side === "front" ? <Stage4CardFace card={card} locale={locale} gestureUrls={gestureUrls} /> : <Stage4CardBack card={card} locale={locale} />}</Stage4CutObject>)}</div>
      <footer dir="ltr">A4 · 100% / ACTUAL SIZE · FLIP ON LONG EDGE</footer>
    </section>
  );
}

function Stage4BoxDieline({ locale, gestureUrls }: { locale: Lang; gestureUrls: Stage4GestureUrls }) {
  const text = dictionaries[locale].shop.soundCase.stage04.print;
  const direction = locale === "he" ? "rtl" : "ltr";
  return <div
    className="quest-stage-4-box-dieline"
    data-box-inner-width-mm={STAGE_4_BOX_INNER_SIZE_MM.width}
    data-box-inner-height-mm={STAGE_4_BOX_INNER_SIZE_MM.height}
    data-box-inner-depth-mm={STAGE_4_BOX_INNER_SIZE_MM.depth}
    data-dieline-width-mm={STAGE_4_BOX_DIELINE_SIZE_MM.width}
    data-dieline-height-mm={STAGE_4_BOX_DIELINE_SIZE_MM.height}
    style={{ left: `${STAGE_4_BOX_DIELINE_POSITION_MM.x}mm`, top: `${STAGE_4_BOX_DIELINE_POSITION_MM.y}mm`, width: `${STAGE_4_BOX_DIELINE_SIZE_MM.width}mm`, height: `${STAGE_4_BOX_DIELINE_SIZE_MM.height}mm` }}
  >
    <svg className="quest-stage-4-box-dieline__lines" viewBox="0 0 106 228" aria-hidden="true">
      <path className="cut" d="M30 0H91V12H106V27H91V120H106V135H91V228H30V213H15V135H30V120H0V27H30V12H15V0Z" />
      <path className="fold" d="M30 0V228M91 0V228M30 12H91M30 27H91M30 120H91M30 135H91" />
      <path className="fold" d="M30 27H0M30 120H0M91 27H106M91 120H106M30 135H15M30 213H15" />
    </svg>
    <section className="quest-stage-4-box-panel quest-stage-4-box-panel--front" dir={direction}>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img className="quest-stage-4-box-panel__logo" src="/laplapla-logo.webp" alt="LapLapLa" />
        <bdi dir="ltr">LAP LAP LA ADVENTURES · SOUND CASE #001</bdi>
        <h2>{text.title}</h2>
        <div className="quest-stage-4-box-panel__gestures" dir="ltr">{(["clap", "snap", "knee-pat", "pause"] as RhythmGesture[]).map((gesture) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={gesture} src={gestureUrls[gesture]} alt="" />
        ))}</div>
        <strong>{text.boxLab}</strong>
      </div>
    </section>
    <section className="quest-stage-4-box-panel quest-stage-4-box-panel--back" dir={direction}>
      <div><bdi dir="ltr">SOUND CASE #001 · STAGE 04</bdi><h3>{text.boxReminderTitle}</h3>{text.boxReminder.map((line) => <strong key={line}>{line}</strong>)}<p>{text.boxContents}</p></div>
    </section>
    <div className="quest-stage-4-box-panel quest-stage-4-box-panel--side-a"><bdi dir="ltr">BROKEN RHYTHM · STAGE 04</bdi></div>
    <div className="quest-stage-4-box-panel quest-stage-4-box-panel--side-b"><bdi dir="ltr">PARROT SOUND LAB</bdi></div>
    <span className="quest-stage-4-box-dieline__glue"><bdi dir="ltr">GLUE TAB</bdi></span>
  </div>;
}

export function Stage4BoxRulesPage({ locale, side, gestureUrls }: { locale: Lang; side: "front" | "back"; gestureUrls: Stage4GestureUrls }) {
  const position = side === "front" ? STAGE_4_RULES_FRONT_POSITION_MM : STAGE_4_RULES_BACK_POSITION_MM;
  return <section className={`quest-stage-4-box-rules-sheet quest-stage-4-box-rules-sheet--${side}`} data-page-type="stage-4-box-rules" data-duplex-side={side}>
    <header dir="ltr">LAP LAP LA ADVENTURES · SOUND CASE #001 · STAGE 04 · BOX + RULES · {side.toUpperCase()}</header>
    {side === "front" && <Stage4BoxDieline locale={locale} gestureUrls={gestureUrls} />}
    <div className="quest-stage-4-rules-cut-object" style={{ left: `${position.x}mm`, top: `${position.y}mm`, width: `${STAGE_4_RULES_CARD_SIZE_MM.width}mm`, height: `${STAGE_4_RULES_CARD_SIZE_MM.height}mm` }} data-cut-x-mm={position.x} data-cut-y-mm={position.y} data-cut-width-mm={STAGE_4_RULES_CARD_SIZE_MM.width} data-cut-height-mm={STAGE_4_RULES_CARD_SIZE_MM.height}>
      <i className="quest-stage-4-cut-mark quest-stage-4-cut-mark--tl" aria-hidden="true" /><i className="quest-stage-4-cut-mark quest-stage-4-cut-mark--tr" aria-hidden="true" /><i className="quest-stage-4-cut-mark quest-stage-4-cut-mark--bl" aria-hidden="true" /><i className="quest-stage-4-cut-mark quest-stage-4-cut-mark--br" aria-hidden="true" />
      <Stage4RulesCard locale={locale} gestureUrls={gestureUrls} side={side} />
    </div>
    <footer dir="ltr">A4 · 100% / ACTUAL SIZE · RULES: FLIP ON LONG EDGE · CUT SOLID / FOLD DASHED</footer>
  </section>;
}
