/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import { SOUND_CASE_001_STAGE_5_SAMPLES } from "@/lib/shop/quests/sound-case-001/scatteredSand";
import { STAGE_7_BOX_DIELINE_POSITION_MM, STAGE_7_BOX_DIELINE_SIZE_MM, STAGE_7_BOX_INNER_SIZE_MM, STAGE_7_CARD_SIZE_MM, STAGE_7_EQUIPMENT, STAGE_7_HOST_QR_ASSET_PATH, STAGE_7_LABEL_SIZE_MM, STAGE_7_STACK_THICKNESS_MM, getStage7CardPositionMm, getStage7LabelPositionMm } from "@/lib/shop/quests/sound-case-001/expertClub";
import type { Stage7EquipmentId } from "@/lib/shop/quests/sound-case-001/expertClub";

export type Stage7EquipmentUrls = Record<Stage7EquipmentId, string>;

const cardStyle = (index: number): CSSProperties => {
  const position = getStage7CardPositionMm(index);
  return { left: `${position.x}mm`, top: `${position.y}mm`, width: `${STAGE_7_CARD_SIZE_MM.width}mm`, height: `${STAGE_7_CARD_SIZE_MM.height}mm` };
};

export function Stage7PrintablePage({ locale, equipmentUrls }: { locale: Lang; equipmentUrls: Stage7EquipmentUrls }) {
  const t = dictionaries[locale].shop.soundCase.stage07;
  const sampleNames = dictionaries[locale].shop.soundCase.stage05.print.sampleNames;
  const dir = locale === "he" ? "rtl" : "ltr";
  return <section className="quest-page quest-page--a4 stage-7-print" data-stage-7-sheet="club-kit">
    <header className="stage-7-print__header" dir="ltr">LAPLAPLA · SOUND CASE #001 · STAGE 07 · A4 · 100% · SHEET 1/2</header>
    <article className="stage-7-print-card stage-7-print-card--intro" style={cardStyle(0)} dir={dir}>
      <small>{t.print.clubCardKicker}</small><h1>{t.title}</h1><p>{t.print.scanHost}</p>
      <img src={STAGE_7_HOST_QR_ASSET_PATH} alt="" />
      <bdi dir="ltr">laplapla.com{t.routeShort}</bdi>
    </article>
    {STAGE_7_EQUIPMENT.map((item, index) => <article key={item.id} className={`stage-7-print-card stage-7-equipment-card stage-7-equipment-card--${item.id}`} style={cardStyle(index + 1)} dir={dir}>
      <img src={equipmentUrls[item.id]} alt="" /><h2>{t.equipment[item.id]}</h2>
    </article>)}
    <article className="stage-7-print-card stage-7-print-card--bonus" style={cardStyle(8)} dir={dir}><small>{t.bonusLabel}</small><span>?</span><h2>{t.bonusQuestion}</h2><footer>PARROT SOUND LAB · EXPERT CLUB</footer></article>
    {SOUND_CASE_001_STAGE_5_SAMPLES.map((sample, index) => {
      const position = getStage7LabelPositionMm(index);
      return <article key={sample.id} className="stage-7-name-label" style={{left:`${position.x}mm`,top:`${position.y}mm`,width:`${STAGE_7_LABEL_SIZE_MM.width}mm`,height:`${STAGE_7_LABEL_SIZE_MM.height}mm`}} dir={dir}><small>{t.print.sampleNameLabel}</small><strong>{sampleNames[index]}</strong></article>;
    })}
  </section>;
}

export function Stage7BoxPage({ locale }: { locale: Lang }) {
  const t = dictionaries[locale].shop.soundCase.stage07;
  const dir = locale === "he" ? "rtl" : "ltr";
  return <section className="quest-page quest-page--a4 stage-7-box-sheet" data-stage-7-sheet="box">
    <header dir="ltr">LAPLAPLA · SOUND CASE #001 · STAGE 07 · TUCK BOX · A4 · 100% · SHEET 2/2</header>
    <div className="stage-7-box-dieline" data-box-inner-width-mm={STAGE_7_BOX_INNER_SIZE_MM.width} data-box-inner-height-mm={STAGE_7_BOX_INNER_SIZE_MM.height} data-box-inner-depth-mm={STAGE_7_BOX_INNER_SIZE_MM.depth} data-stack-thickness-mm={STAGE_7_STACK_THICKNESS_MM} data-dieline-width-mm={STAGE_7_BOX_DIELINE_SIZE_MM.width} data-dieline-height-mm={STAGE_7_BOX_DIELINE_SIZE_MM.height} style={{left:`${STAGE_7_BOX_DIELINE_POSITION_MM.x}mm`,top:`${STAGE_7_BOX_DIELINE_POSITION_MM.y}mm`,width:`${STAGE_7_BOX_DIELINE_SIZE_MM.width}mm`,height:`${STAGE_7_BOX_DIELINE_SIZE_MM.height}mm`}}>
      <svg className="stage-7-box-dieline__lines" viewBox="0 0 146 112" aria-hidden="true"><path className="cut" d="M10 28L0 32V84L10 88V18L19 15V28V6L24 0H73L78 6V28V15L87 18V28H146V88H87V98L82 103L78 98V88V106L73 112H24L19 106V88V103L14 108L10 103V88"/><path className="fold" d="M10 28V88M19 28V88M78 28V88M87 28V88M10 28H146M10 88H146"/></svg>
      <section className="stage-7-box-panel stage-7-box-panel--front" dir={dir}><bdi dir="ltr">SOUND CASE #001 · STAGE 07</bdi><h1>{t.title}</h1><strong>{t.print.boxTitle}</strong></section>
      <section className="stage-7-box-panel stage-7-box-panel--back" dir={dir}><bdi dir="ltr">STAGE 07</bdi><h2>{t.title}</h2><strong>{t.print.boxHostHeading}</strong><ol>{t.print.boxStartSteps.map(step=><li key={step}>{step}</li>)}</ol><b>{t.print.boxStartKey}</b><div className="stage-7-box-panel__qr"><img src={STAGE_7_HOST_QR_ASSET_PATH} alt=""/><span>{t.print.boxScanLabel}</span><bdi dir="ltr">{t.routeShort}</bdi></div></section>
      <div className="stage-7-box-panel stage-7-box-panel--side-a" dir={dir}>{t.print.boxSide}</div>
      <div className="stage-7-box-panel stage-7-box-panel--side-b" dir={dir}>{t.print.boxSide}</div>
      <span className="stage-7-box-dieline__glue" dir="ltr">GLUE TAB</span>
    </div>
    <footer dir="ltr">A4 · 100% / ACTUAL SIZE · CUT SOLID / FOLD DASHED</footer>
  </section>;
}
