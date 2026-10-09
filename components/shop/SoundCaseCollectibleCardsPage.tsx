/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import type { Lang } from "@/i18n";
import { SOUND_CASE_001_HUB_DESTINATION } from "@/lib/shop/quests/sound-case-001/finale";
import {
  SOUND_CASE_001_COLLECTIBLE_HUB_QR_ASSET_PATH,
  type SoundCase001CollectibleCard,
} from "@/lib/shop/quests/sound-case-001/collectibleCards";
import { SOUND_CASE_001_COLLECTIBLE_COPY } from "@/lib/shop/quests/sound-case-001/collectibleCardCopy";
import { CollectibleCardSheet, type CollectibleCardPlacement } from "./collectibles/CollectibleCardSheet";

type IconName = "check" | "compass" | "lock";
type StatIconName = "hearing" | "courage" | "curiosity";

function CardIcon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {name === "check" ? <path {...common} d="m5 12.5 4.2 4.2L19.5 6.5" /> : null}
    {name === "compass" ? <><circle {...common} cx="12" cy="12" r="9"/><path {...common} d="m15.4 8.6-2.3 5.1-5.1 2.3 2.3-5.1 5.1-2.3Z"/></> : null}
    {name === "lock" ? <><rect {...common} x="5.5" y="10" width="13" height="10" rx="2"/><path {...common} d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v2.5"/></> : null}
  </svg>;
}

function StatIcon({ name }: { name: StatIconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.65, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg className="investigator-card__stat-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {name === "hearing" ? <><path {...common} d="M13.9 17.8c-.8 1.6-1.8 2.5-3.4 2.5-2.3 0-3.5-1.6-3.5-4V9.8a4.6 4.6 0 0 1 9.2 0c0 2.8-2 3.7-3.6 4.8-.7.5-.9 1.1-.9 1.8"/><path {...common} d="M10 10a1.8 1.8 0 0 1 3.6 0c0 1.3-1 1.8-1.9 2.4M18.5 8.2c1 1 1 2.6 0 3.6M20.8 6c2.2 2.2 2.2 5.8 0 8"/></> : null}
    {name === "courage" ? <><path {...common} d="M12 2.8 19 5.7v5.2c0 4.6-2.7 8.1-7 10.3-4.3-2.2-7-5.7-7-10.3V5.7L12 2.8Z"/><path {...common} d="m12 7 1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4L12 7Z"/></> : null}
    {name === "curiosity" ? <><circle {...common} cx="10" cy="10" r="5.4"/><path {...common} d="m14.1 14.1 5.1 5.1M18 4v3M16.5 5.5h3M4 17v2M3 18h2"/></> : null}
  </svg>;
}

function Wave() {
  return <svg className="investigator-card__wave" viewBox="0 0 80 18" aria-hidden="true"><path d="M1 9h7l3-6 5 12 5-9 5 6 4-3h8l4-7 5 14 5-11 5 8 5-4h7l4-5 4 10 3-5h4" fill="none" stroke="currentColor" strokeWidth="2"/></svg>;
}

function nameSize(name: string) {
  return name.length > 21 ? "xl" : name.length > 14 ? "long" : "normal";
}

function StatDots({ value }: { value: number }) {
  return <span className="investigator-card__stat-dots" aria-label={`${value} / 5`}>
    {[1, 2, 3, 4, 5].map((dot) => <i className={dot <= value ? "is-active" : undefined} key={dot}/>) }
  </span>;
}

function InvestigatorCardFront({ card, heroUrl, locale }: { card: SoundCase001CollectibleCard; heroUrl: string; locale: Lang }) {
  const t = SOUND_CASE_001_COLLECTIBLE_COPY[locale];
  const title = t.titles[card.titleIndex];
  const heroStyle = {
    backgroundImage: `linear-gradient(180deg, rgba(3,31,44,.32) 0%, transparent 22%, transparent 52%, rgba(3,24,32,.12) 62%, rgba(3,24,32,.94) 100%), url("${heroUrl}")`,
    backgroundPosition: `center, ${card.art.objectPosition}`,
  } satisfies CSSProperties;
  return <article className="investigator-card investigator-card--front" lang={locale} dir={locale === "he" ? "rtl" : "ltr"} data-collectible-card="front" data-art-id={card.art.id} data-title-id={`T${String(card.titleIndex + 1).padStart(2, "0")}`} data-variant-code={card.variantCode}>
    <section className="investigator-card__hero" style={heroStyle}>
      <img className="investigator-card__hero-preload" src={heroUrl} alt="" aria-hidden="true"/>
      <img className="investigator-card__hero-print" src={card.art.printAssetPath} alt="" aria-hidden="true"/>
      <div className="investigator-card__case-tag" dir="ltr"><b>SOUND CASE</b><strong>#001</strong><Wave/></div>
      <img className="investigator-card__logo" src="/laplapla-logo-letters.webp" alt="LapLapLa"/>
      <span className="investigator-card__case-name">{t.caseName}</span>
      <div className="investigator-card__identity">
        <bdi className={`investigator-card__name investigator-card__name--${nameSize(card.participantName)}`} dir="auto">{card.participantName}</bdi>
        <strong className="investigator-card__title">{title}</strong>
      </div>
      <div className="investigator-card__stamp"><CardIcon name="check"/><span>LAPLAPLA</span><b>{t.stamp}</b></div>
    </section>
    <section className="investigator-card__stats">
      {t.stats.map((label, index) => <div className="investigator-card__stat" key={label}>
        <StatIcon name={(["hearing", "courage", "curiosity"] as const)[index]}/><b>{label}</b><StatDots value={card.stats[index]}/>
      </div>)}
    </section>
    <footer className="investigator-card__footer" dir="ltr">
      <CardIcon name="compass"/>
      <span><b>AL LIWA · SINGING DUNES</b><small>22.975089° N · 53.785431° E</small></span>
      <Wave/>
      <bdi>{card.variantCode}</bdi>
    </footer>
  </article>;
}

function InvestigatorCardBack({ locale, backgroundUrl }: { locale: Lang; backgroundUrl: string }) {
  const t = SOUND_CASE_001_COLLECTIBLE_COPY[locale];
  return <article className="investigator-card investigator-card--back" lang={locale} dir={locale === "he" ? "rtl" : "ltr"} data-collectible-card="back">
    <img className="investigator-card-back__background" src={backgroundUrl} alt=""/>
    <header className="investigator-card-back__brand" dir="ltr"><span>SOUND CASE #001</span></header>
    <section className="investigator-card-back__verdict">
      <span>{t.backCase}</span><h2>{t.backClosed}</h2>
      <p>{t.backProof}</p><strong>{t.backKeep}</strong><small>{t.backNext}</small>
    </section>
    <section className="investigator-card-back__hub" data-qr-destination={SOUND_CASE_001_HUB_DESTINATION}>
      <img src={SOUND_CASE_001_COLLECTIBLE_HUB_QR_ASSET_PATH} alt={t.qrTitle}/>
      <div><span>{t.qrTitle}</span><strong>{t.qrScan}</strong><p>{t.qrTagline}</p></div>
    </section>
    <section className="investigator-card-back__collection">
      <h3>{t.collectionTitle}</h3>
      <div dir="ltr">
        {[1, 2, 3, 4].map((number) => <div className={number === 1 ? "is-earned" : "is-locked"} key={number}>
          <b>#{String(number).padStart(3, "0")}</b><CardIcon name={number === 1 ? "check" : "lock"}/>
        </div>)}
      </div>
    </section>
    <footer className="investigator-card-back__legal">
      <strong>{t.keepTitle}</strong><span>{t.keepBody}</span>
    </footer>
  </article>;
}

export type SoundCaseCollectibleAssetUrls = {
  heroes: Record<string, string>;
  background: string;
};

export function SoundCaseCollectibleCardsPage({ cards, locale, side, sheetNumber, sheetCount, assetUrls }: { cards: readonly SoundCase001CollectibleCard[]; locale: Lang; side: "front"|"back"; sheetNumber: number; sheetCount: number; assetUrls: SoundCaseCollectibleAssetUrls }) {
  const t = SOUND_CASE_001_COLLECTIBLE_COPY[locale];
  const placements: CollectibleCardPlacement[] = cards.map(card => ({
    key: `${card.participantIndex}-${side}`,
    slot: side === "front" ? card.frontSlot : card.backSlot,
    frontSlot: card.frontSlot,
    backSlot: card.backSlot,
    content: side === "front"
      ? <InvestigatorCardFront card={card} heroUrl={assetUrls.heroes[card.art.assetId]} locale={locale}/>
      : <InvestigatorCardBack locale={locale} backgroundUrl={assetUrls.background}/>,
  }));
  return <CollectibleCardSheet placements={placements} guide={side === "front" ? t.frontGuide : t.backGuide} side={side} sheetNumber={sheetNumber} sheetCount={sheetCount}/>;
}
