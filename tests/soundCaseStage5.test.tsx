import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { getSoundCase001Stage5Pages } from "@/lib/shop/questDocument";
import { renderQuestPageDefinition } from "@/components/shop/questPageRenderers";
import { SOUND_CASE_001_STAGE_5_SAMPLES, STAGE_5_BOX_DIELINE_SIZE_MM, STAGE_5_BOX_INNER_SIZE_MM, STAGE_5_CARD_SIZE_MM, STAGE_5_PUZZLE_GRID, STAGE_5_QR_ASSET_PATHS, STAGE_5_SAND_ARTICLE_DESTINATION, STAGE_6_COORDINATE_PUZZLE, STAGE_6_DESTINATION, getStage5PuzzleTile } from "@/lib/shop/quests/sound-case-001/scatteredSand";
import { SOUND_CASE_001_SOLVED_DESTINATION } from "@/lib/shop/quests/sound-case-001/finale";
import { dictionaries } from "@/i18n";

describe("Sound Case Stage 05", () => {
  it("defines eight unique samples, one solved finale route and seven article routes", () => {
    expect(SOUND_CASE_001_STAGE_5_SAMPLES).toHaveLength(8);
    expect(new Set(SOUND_CASE_001_STAGE_5_SAMPLES.map(x=>x.assetId)).size).toBe(8);
    expect(SOUND_CASE_001_STAGE_5_SAMPLES.filter(x=>x.isLiwa)).toHaveLength(1);
    expect(SOUND_CASE_001_STAGE_5_SAMPLES.filter(x=>!x.isLiwa)).toHaveLength(7);
    expect(SOUND_CASE_001_STAGE_5_SAMPLES.slice(0,7).every(x=>x.qrDestination===STAGE_5_SAND_ARTICLE_DESTINATION)).toBe(true);
    expect(SOUND_CASE_001_STAGE_5_SAMPLES.slice(0,7).every(x=>x.qrAssetPath===STAGE_5_QR_ASSET_PATHS.article)).toBe(true);
    expect(SOUND_CASE_001_STAGE_5_SAMPLES.slice(0,7).every(x=>x.qrRole==="educational-story")).toBe(true);
    expect(STAGE_5_SAND_ARTICLE_DESTINATION).toBe("https://www.laplapla.com/bedtime-stories/sand-is-not-just-sand");
    expect(SOUND_CASE_001_STAGE_5_SAMPLES[7].qrDestination).toBe(SOUND_CASE_001_SOLVED_DESTINATION);
    expect(SOUND_CASE_001_STAGE_5_SAMPLES[7].qrRole).toBe("sound-case-finale");
    expect(SOUND_CASE_001_STAGE_5_SAMPLES[7].qrAssetPath).toBe(STAGE_5_QR_ASSET_PATHS.sample08Finale);
    expect(STAGE_5_QR_ASSET_PATHS.sample08Finale).not.toBe(STAGE_5_QR_ASSET_PATHS.stage06Transition);
    expect(JSON.stringify(SOUND_CASE_001_STAGE_5_SAMPLES[7])).not.toMatch(/legacy|pending|planned/i);
  });
  it.each(["ru", "en", "he"] as const)("hides identifying names on the %s information faces while retaining macro images and facts", (locale) => {
    const front=getSoundCase001Stage5Pages(locale)[0];
    const html=renderToStaticMarkup(renderQuestPageDefinition(front,{personalization:{locale,leadName:"",participants:[]},assetManifest:SOUND_CASE_001_ASSET_MANIFEST}));
    for(const name of dictionaries[locale].shop.soundCase.stage05.print.sampleNames) expect(html).not.toContain(name);
    expect(html.match(/stage-5-card--sample/g)).toHaveLength(8);
    for(let index=1;index<=8;index+=1) expect(html).toContain(`stage-5-sand-sample-0${index}`);
    expect(html.match(/stage-5-card__facts/g)).toHaveLength(8);
    expect(html.match(/stage-5-card__qr/g)).toHaveLength(8);
    expect(html).toContain(`src="${STAGE_5_QR_ASSET_PATHS.sample08Finale}"`);
  });
  it("uses a 4×2 programmatic puzzle without reversing Hebrew", () => {
    expect(STAGE_5_PUZZLE_GRID).toEqual({columns:4,rows:2});
    expect(STAGE_5_CARD_SIZE_MM).toEqual({width:57,height:76});
    expect(Array.from({length:8},(_,i)=>getStage5PuzzleTile(i).index)).toEqual([1,2,3,4,5,6,7,8]);
    const back=getSoundCase001Stage5Pages("he")[1];
    const html=renderToStaticMarkup(renderQuestPageDefinition(back,{personalization:{locale:"he",leadName:"",participants:[]},assetManifest:SOUND_CASE_001_ASSET_MANIFEST}));
    expect(html).toContain('dir="ltr"');
    expect(html.match(/stage-5-card--puzzle/g)).toHaveLength(8);
    expect(html).toContain("stage-5-dune-puzzle.webp");
    expect(html.match(/<img[^>]+stage-5-dune-puzzle\.webp/g)).toHaveLength(8);
    expect(html).not.toContain("background-image:");
    expect(html).toContain("stage-5-card__coordinate-clue");
    expect(html).not.toContain("stage-5-card__coordinate-strip");
    expect(html).not.toMatch(/_ _ _/);
  });
  it("keeps the coordinate damage and audio digits in one model",()=>{
    expect(STAGE_6_COORDINATE_PUZZLE.latitude.missingDigits.join("")).toBe("975089");
    expect(STAGE_6_COORDINATE_PUZZLE.longitude.missingDigits.join("")).toBe("785431");
    expect(STAGE_6_COORDINATE_PUZZLE.final.clipboard).toBe("22.975089, 53.785431");
  });
  it("adds a single-sided A4 tuck box after the unchanged duplex pair",()=>{
    const pages=getSoundCase001Stage5Pages("ru");
    expect(pages.map(page=>page.type)).toEqual(["stage-5-cards","stage-5-cards","stage-5-box"]);
    expect(STAGE_5_BOX_INNER_SIZE_MM).toEqual({width:59,height:78,depth:6});
    expect(STAGE_5_BOX_DIELINE_SIZE_MM.width).toBeLessThanOrEqual(210);
    expect(STAGE_5_BOX_DIELINE_SIZE_MM.height).toBeLessThanOrEqual(297);
    const html=renderToStaticMarkup(renderQuestPageDefinition(pages[2],{personalization:{locale:"ru",leadName:"",participants:[]},assetManifest:SOUND_CASE_001_ASSET_MANIFEST}));
    expect(html).toContain('data-page-type="stage-5-box"');
    expect(html).toContain('class="stage-5-box-panel__photo"');
    expect(html).toContain('data-box-inner-width-mm="59"');
    expect(html).toContain('data-box-inner-height-mm="78"');
    expect(html).toContain('data-box-inner-depth-mm="6"');
  });
  it("keeps both A4 card sides white and gives the Stage 06 QR a four-module-plus quiet zone",()=>{
    const css=readFileSync(`${process.cwd()}/styles/Shop.css`,"utf8");
    expect(css).toMatch(/\.stage-5-sheet\s*\{[^}]*background:\s*#fff/);
    expect(css).toMatch(/\.stage-5-insert__qr\s*\{[^}]*width:17mm[^}]*height:17mm[^}]*padding:2mm/);
    expect(STAGE_5_QR_ASSET_PATHS.stage06Transition).toBe("/quests/sound-case-001/stage-05/sound-code-qr.svg");
    const transitionHtml=renderToStaticMarkup(renderQuestPageDefinition(getSoundCase001Stage5Pages("ru")[1],{personalization:{locale:"ru",leadName:"",participants:[]},assetManifest:SOUND_CASE_001_ASSET_MANIFEST}));
    expect(transitionHtml).toContain(`src="${STAGE_5_QR_ASSET_PATHS.stage06Transition}"`);
    expect(transitionHtml).not.toContain(STAGE_5_QR_ASSET_PATHS.sample08Finale);
  });
  it("ships a separate printable finale QR with its canonical destination and an embedded quiet zone",()=>{
    const qr=readFileSync(`${process.cwd()}/public${STAGE_5_QR_ASSET_PATHS.sample08Finale}`,"utf8");
    expect(STAGE_5_QR_ASSET_PATHS.sample08Finale).toBe("/quests/sound-case-001/stage-05/sample-08-solved-qr.svg");
    expect(qr).toContain(`<desc>${SOUND_CASE_001_SOLVED_DESTINATION}</desc>`);
    expect(qr).toContain('<rect style="fill:rgb(255, 255, 255)');
    expect(qr).toMatch(/<path[^>]+d="M\s+76,76\s+l\s+19,0/);
    expect(qr).not.toContain(STAGE_6_DESTINATION);
  });
});
