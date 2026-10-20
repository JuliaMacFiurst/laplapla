import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SOUND_CASE_001_CARD_BOX } from "@/lib/shop/quests/sound-case-001/cardBox";
import { STAGE_2_CLUE_CARD_SIZE_MM, STAGE_2_INTRO_CARD_SIZE_MM, STAGE_2_VIBRATING_CARD_SIZE_MM, SOUND_CASE_001_STAGE_2_BOX } from "@/lib/shop/quests/sound-case-001/vibratingCards";
import { STAGE_4_BOX_DIELINE_SIZE_MM, STAGE_4_BOX_INNER_SIZE_MM, STAGE_4_CARD_SIZE_MM } from "@/lib/shop/quests/sound-case-001/brokenRhythm";
import { STAGE_5_BOX_DIELINE_SIZE_MM, STAGE_5_BOX_INNER_SIZE_MM, STAGE_5_CARD_SIZE_MM } from "@/lib/shop/quests/sound-case-001/scatteredSand";

const css = readFileSync(`${process.cwd()}/styles/Shop.css`, "utf8");

function expectFaceFits(content: {width:number;height:number}, cavity: {width:number;height:number}) {
  expect(cavity.width).toBeGreaterThan(content.width);
  expect(cavity.height).toBeGreaterThan(content.height);
}

describe("Sound Case printable box physical geometry", () => {
  it("keeps Stage 01 cards inside an unscaled 62 × 82 mm panel", () => {
    expectFaceFits({width:60,height:80}, SOUND_CASE_001_CARD_BOX.internalSizeMm);
    expect(SOUND_CASE_001_CARD_BOX.dielineSizeMm).toEqual({width:152,height:142});
    expect(css).toMatch(/\.quest-card-box-artwork__front\s*\{[\s\S]*?width:\s*62mm;[\s\S]*?height:\s*82mm;/);
    expect(css).toMatch(/\.quest-card-box-artwork__back\s*\{[\s\S]*?width:\s*62mm;[\s\S]*?height:\s*82mm;/);
  });

  it("keeps every mixed-size Stage 02 object inside its 73 × 86 mm panels", () => {
    for (const size of [STAGE_2_VIBRATING_CARD_SIZE_MM, STAGE_2_INTRO_CARD_SIZE_MM, STAGE_2_CLUE_CARD_SIZE_MM]) expectFaceFits(size, SOUND_CASE_001_STAGE_2_BOX.internalSizeMm);
    expect(SOUND_CASE_001_STAGE_2_BOX.dielineSizeMm).toEqual({width:172,height:146});
    expect(css).toMatch(/\.quest-stage-2-box-artwork__front\s*\{[\s\S]*?width:\s*73mm;[\s\S]*?height:\s*86mm;/);
  });

  it("keeps Stage 04 landscape cards inside the rotated 61 × 93 mm sheet panels", () => {
    expectFaceFits(STAGE_4_CARD_SIZE_MM, STAGE_4_BOX_INNER_SIZE_MM);
    expect(STAGE_4_BOX_DIELINE_SIZE_MM).toEqual({width:106,height:228});
    expect(css).toMatch(/\.quest-stage-4-box-panel--front\s*\{[\s\S]*?width:\s*61mm;[\s\S]*?height:\s*93mm;/);
    expect(STAGE_4_BOX_INNER_SIZE_MM.height).toBe(61);
    expect(STAGE_4_BOX_INNER_SIZE_MM.width).toBe(93);
  });

  it("keeps Stage 05 portrait cards inside matching 59 × 78 mm panels", () => {
    expectFaceFits(STAGE_5_CARD_SIZE_MM, STAGE_5_BOX_INNER_SIZE_MM);
    expect(STAGE_5_BOX_INNER_SIZE_MM).toEqual({width:59,height:78,depth:6});
    expect(STAGE_5_BOX_DIELINE_SIZE_MM).toEqual({width:140,height:134});
    expect(css).toMatch(/\.stage-5-box-panel--front\s*\{[\s\S]*?width:59mm;[\s\S]*?height:78mm;/);
    expect(css).toMatch(/\.stage-5-box-panel--back\s*\{[\s\S]*?width:59mm;[\s\S]*?height:78mm;/);
  });

  it("keeps every existing dieline inside A4 without scale transforms", () => {
    for (const dieline of [SOUND_CASE_001_CARD_BOX.dielineSizeMm, SOUND_CASE_001_STAGE_2_BOX.dielineSizeMm, STAGE_4_BOX_DIELINE_SIZE_MM, STAGE_5_BOX_DIELINE_SIZE_MM]) {
      expect(dieline.width).toBeLessThanOrEqual(210);
      expect(dieline.height).toBeLessThanOrEqual(297);
    }
    expect(css).not.toMatch(/(?:quest-card-box|quest-stage-2-box|quest-stage-4-box|stage-5-box)[^{]*\{[^}]*\b(?:scale|zoom)\s*:/);
  });
});
