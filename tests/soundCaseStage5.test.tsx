import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { getSoundCase001Stage5Pages } from "@/lib/shop/questDocument";
import { renderQuestPageDefinition } from "@/components/shop/questPageRenderers";
import { SOUND_CASE_001_STAGE_5_SAMPLES, STAGE_5_BOX_DIELINE_SIZE_MM, STAGE_5_BOX_INNER_SIZE_MM, STAGE_5_CARD_SIZE_MM, STAGE_5_PUZZLE_GRID, STAGE_5_SAND_ARTICLE_DESTINATION, STAGE_6_COORDINATE_PUZZLE, STAGE_6_DESTINATION, getStage5PuzzleTile } from "@/lib/shop/quests/sound-case-001/scatteredSand";

describe("Sound Case Stage 05", () => {
  it("defines eight unique samples, one Liwa route and seven article routes", () => {
    expect(SOUND_CASE_001_STAGE_5_SAMPLES).toHaveLength(8);
    expect(new Set(SOUND_CASE_001_STAGE_5_SAMPLES.map(x=>x.assetId)).size).toBe(8);
    expect(SOUND_CASE_001_STAGE_5_SAMPLES.filter(x=>x.isLiwa)).toHaveLength(1);
    expect(SOUND_CASE_001_STAGE_5_SAMPLES.filter(x=>!x.isLiwa)).toHaveLength(7);
    expect(SOUND_CASE_001_STAGE_5_SAMPLES.slice(0,7).every(x=>x.qrDestination===STAGE_5_SAND_ARTICLE_DESTINATION)).toBe(true);
    expect(STAGE_5_SAND_ARTICLE_DESTINATION).toBe("https://www.laplapla.com/bedtime-stories/sand-is-not-just-sand");
    expect(SOUND_CASE_001_STAGE_5_SAMPLES[7].qrDestination).toBe(STAGE_6_DESTINATION);
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
    expect(html).toContain('data-box-inner-width-mm="59"');
    expect(html).toContain('data-box-inner-height-mm="78"');
    expect(html).toContain('data-box-inner-depth-mm="6"');
  });
});
