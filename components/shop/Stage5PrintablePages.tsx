import type { CSSProperties } from "react";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import { STAGE_5_BOX_DIELINE_POSITION_MM, STAGE_5_BOX_DIELINE_SIZE_MM, STAGE_5_BOX_INNER_SIZE_MM, STAGE_5_CARD_SIZE_MM, STAGE_5_QR_ASSET_PATHS, STAGE_6_COORDINATE_PUZZLE, SOUND_CASE_001_STAGE_5_SAMPLES, getStage5BackPositionMm, getStage5CardPositionMm, getStage5PuzzleTile } from "@/lib/shop/quests/sound-case-001/scatteredSand";
import { getSoundCodeIcon, type SoundCodeDigit } from "@/lib/shop/quests/sound-case-001/soundCode";

export type Stage5SampleUrls = Record<(typeof SOUND_CASE_001_STAGE_5_SAMPLES)[number]["id"], string>;
const cardStyle = (position: {x:number;y:number}): CSSProperties => ({ left: `${position.x}mm`, top: `${position.y}mm`, width: `${STAGE_5_CARD_SIZE_MM.width}mm`, height: `${STAGE_5_CARD_SIZE_MM.height}mm` });

export function Stage5CardsPage({ locale, side, sampleUrls, duneUrl }: { locale: Lang; side: "front"|"back"; sampleUrls: Stage5SampleUrls; duneUrl: string }) {
  const t = dictionaries[locale].shop.soundCase.stage05.print;
  const rtl = locale === "he";
  return <section className="quest-page quest-page--a4 stage-5-sheet" data-stage-5-side={side} data-duplex-pair="stage-5-cards-sheet">
    <span className="stage-5-sheet__mark">↑ FRONT TOP EDGE · A4 · 100% ↑</span>
    {SOUND_CASE_001_STAGE_5_SAMPLES.map((sample, index) => {
      const position = side === "front" ? getStage5CardPositionMm(index) : getStage5BackPositionMm(index);
      if (side === "front") return <article key={sample.id} className="stage-5-card stage-5-card--sample" style={cardStyle(position)} dir={rtl?"rtl":"ltr"}>
        <header><b>{t.sampleLabel} {String(sample.index).padStart(2,"0")}</b><strong>{t.sampleNames[index]}</strong></header>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={sampleUrls[sample.id]} alt="" />
        <div className="stage-5-card__facts"><p>📍 {t.locations[index]}</p><p>🔬 <b>{t.grainsLabel}:</b> {t.grains[index]}</p><p>🧪 <b>{t.compositionLabel}:</b> {t.composition[index]}</p><p>👀 <b>{t.featureLabel}:</b> {t.feature[index]}</p></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img className="stage-5-card__qr" src={sample.qrAssetPath} alt="" />
      </article>;
      const tile = getStage5PuzzleTile(index);
      return <article key={sample.id} className="stage-5-card stage-5-card--puzzle" style={cardStyle(position)} dir="ltr">
        <div className="stage-5-card__dune" style={{ backgroundImage:`url(${duneUrl})`, backgroundPosition:`${tile.column * 100 / 3}% ${tile.row * 100}%` }} />
        {tile.row === 1 ? <div className="stage-5-card__coordinate-clue" style={{ width:"400%", left:`-${tile.column*100}%` }}>
          <CoordinateSymbolRow prefix={STAGE_6_COORDINATE_PUZZLE.latitude.prefix} digits={STAGE_6_COORDINATE_PUZZLE.latitude.missingDigits} suffix={STAGE_6_COORDINATE_PUZZLE.latitude.suffix}/>
          <CoordinateSymbolRow prefix={STAGE_6_COORDINATE_PUZZLE.longitude.prefix} digits={STAGE_6_COORDINATE_PUZZLE.longitude.missingDigits} suffix={STAGE_6_COORDINATE_PUZZLE.longitude.suffix}/>
        </div>:null}
      </article>;
    })}
    <Stage5Insert locale={locale} side={side} style={cardStyle(side === "front" ? getStage5CardPositionMm(8) : getStage5BackPositionMm(8))} />
  </section>;
}

function CoordinateSymbolRow({prefix,digits,suffix}:{prefix:string;digits:readonly SoundCodeDigit[];suffix:string}) {
  return <div className="stage-5-card__coordinate-row" dir="ltr"><b>{prefix}</b>{digits.map((digit,index)=><span key={`${digit}-${index}`} className={index===3?"stage-5-card__coordinate-symbol stage-5-card__coordinate-symbol--group":"stage-5-card__coordinate-symbol"}>{getSoundCodeIcon(digit)}</span>)}<b>{suffix}</b></div>;
}

function Stage5Insert({locale,side,style}:{locale:Lang;side:"front"|"back";style:CSSProperties}) {
  const t=dictionaries[locale].shop.soundCase.stage05.print;
  return <article className="stage-5-card stage-5-card--insert" style={style} dir={locale==="he"?"rtl":"ltr"}>{side==="front"?<><h2>{t.findTitle}</h2>{t.playerLines.map(x=><p key={x}>{x}</p>)}<aside><b>{t.adultTitle}</b>{t.adultLines.map(x=><p key={x}>{x}</p>)}</aside></>:<><h2>{t.parrotTitle}</h2>{t.parrotLines.map(x=><p key={x}>{x}</p>)}<strong>{t.decodeAction}</strong>{/* eslint-disable-next-line @next/next/no-img-element */}<img className="stage-5-insert__qr" src={STAGE_5_QR_ASSET_PATHS.soundCode} alt="" /></>}</article>;
}

export function Stage5BoxPage({locale,duneUrl}:{locale:Lang;duneUrl:string}) {
  const t=dictionaries[locale].shop.soundCase.stage05.print;
  const direction=locale==="he"?"rtl":"ltr";
  return <section className="quest-page quest-page--a4 stage-5-box-sheet" data-page-type="stage-5-box">
    <header dir="ltr">LAP LAP LA ADVENTURES · SOUND CASE #001 · STAGE 05 · BOX</header>
    <div className="stage-5-box-dieline" data-box-inner-width-mm={STAGE_5_BOX_INNER_SIZE_MM.width} data-box-inner-height-mm={STAGE_5_BOX_INNER_SIZE_MM.height} data-box-inner-depth-mm={STAGE_5_BOX_INNER_SIZE_MM.depth} data-dieline-width-mm={STAGE_5_BOX_DIELINE_SIZE_MM.width} data-dieline-height-mm={STAGE_5_BOX_DIELINE_SIZE_MM.height} style={{left:`${STAGE_5_BOX_DIELINE_POSITION_MM.x}mm`,top:`${STAGE_5_BOX_DIELINE_POSITION_MM.y}mm`,width:`${STAGE_5_BOX_DIELINE_SIZE_MM.width}mm`,height:`${STAGE_5_BOX_DIELINE_SIZE_MM.height}mm`}}>
      <svg className="stage-5-box-dieline__lines" viewBox="0 0 140 134" aria-hidden="true"><path className="cut" d="M10 30L0 34V104L10 108M10 30V22L16 20V30M16 30H75M75 30V20L81 22V30M81 30V7L86 0H135L140 7V108M140 108V114L134 119H87L81 114V108M81 108V121L75 125V108M75 108V128L70 134H21L16 128V108M16 108V125L10 121V108"/><path className="fold" d="M10 30V108M16 30V108M75 30V108M81 30V108M10 30H16M75 30H81M81 30H140M81 22H140M10 108H140M16 114H75"/></svg>
      <section className="stage-5-box-panel stage-5-box-panel--front" dir={direction} style={{backgroundImage:`linear-gradient(rgba(18,55,61,.28),rgba(18,55,61,.78)),url(${duneUrl})`}}><div><bdi dir="ltr">SOUND CASE #001</bdi><strong>STAGE 05</strong><h1>{t.title}</h1><span>PARROT SOUND LAB</span></div></section>
      <section className="stage-5-box-panel stage-5-box-panel--back" dir={direction}><div><img src="/laplapla-logo.webp" alt="LapLapLa"/><strong>{t.boxContents}</strong><span>{t.title}</span></div></section>
      <div className="stage-5-box-panel stage-5-box-panel--side-a" dir={direction}><strong>{t.boxSide}</strong></div>
      <div className="stage-5-box-panel stage-5-box-panel--side-b" dir={direction}><strong>{t.boxSide}</strong></div>
      <span className="stage-5-box-dieline__glue" dir="ltr">GLUE TAB</span>
    </div>
    <footer dir="ltr">A4 · 100% / ACTUAL SIZE · CUT SOLID / FOLD DASHED</footer>
  </section>;
}
