import { describe,expect,it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SoundCodeScene } from "@/components/quests/sound-case-001/SoundCodeScene";
import { SOUND_CODE_DIGITS, STAGE_6_DECODER_DIGITS, validateStage6Decoder } from "@/lib/shop/quests/sound-case-001/soundCode";
import { STAGE_6_COORDINATE_PUZZLE } from "@/lib/shop/quests/sound-case-001/scatteredSand";
import { SOUND_CASE_001_ASSET_MANIFEST, STAGE_6_AUDIO_FILES } from "@/lib/shop/quests/sound-case-001/assets";
describe("Sound Case Stage 06",()=>{
  it("maps every digit exactly once and reuses Stage 03 only for zero and three",()=>{
    expect(SOUND_CODE_DIGITS.map(x=>x.digit).sort()).toEqual([0,1,2,3,4,5,6,7,8,9]);
    expect(SOUND_CODE_DIGITS.every(x=>x.assetId)).toBe(true);
    expect(SOUND_CODE_DIGITS.find(x=>x.digit===3)?.assetId).toBe("stage-3-distractor-cartoon-laugh");
    expect(SOUND_CODE_DIGITS.find(x=>x.digit===0)?.assetId).toBe("stage-3-distractor-cow");
    expect(SOUND_CODE_DIGITS.filter(x=>x.assetId.startsWith("stage-6-"))).toHaveLength(8);
  });
  it("keeps the verified Stage 06 filenames in the typed manifest",()=>{
    expect(STAGE_6_AUDIO_FILES).toEqual({cat:"mixkit-sweet-kitty-meow-93.mp3",bell:"mixkit-bike-bell-ring-595.mp3",train:"mixkit-train-passenger-passing-by-rattle-1636.mp3",chicken:"mixkit-rooster-crowing-in-the-morning-2462.mp3",door:"mixkit-creaking-door-open-and-close-199.mp3",mosquito:"mixkit-cartoon-mosquito-flying-328.mp3",balloon:"mixkit-farting-balloon-deflate-3052.mp3",dog:"mixkit-medium-size-angry-dog-bark-54.mp3"});
    for(const item of SOUND_CODE_DIGITS.filter(x=>x.assetId.startsWith("stage-6-"))){
      const asset=SOUND_CASE_001_ASSET_MANIFEST.assets[item.assetId];
      expect(asset.kind).toBe("audio");
      expect(asset.source.status).toBe("external");
      if(asset.source.status==="external")expect(asset.source.url).toMatch(/^https:\/\/media\.laplapla\.com\/quests\/sound-case-001\/stage-06-decoding-of-coordinates\/audio\/.+\.mp3$/);
    }
  });
  it("validates the twelve coordinate slots without leaking corrections",()=>{
    expect(STAGE_6_DECODER_DIGITS.join("")).toBe("975089785431");
    expect(validateStage6Decoder("975089785431".split(""))).toEqual(Array(12).fill(true));
    const result=validateStage6Decoder("075089785430".split(""));
    expect(result.filter(value=>!value)).toHaveLength(2);
  });
  it("keeps coordinates hidden before explicit confirmation and orders Hebrew audio LTR",()=>{const html=renderToStaticMarkup(<SoundCodeScene lang="he" backgroundUrl="/dune.webp" parrotUrls={["/p.webp"]} audioUrls={{}}/>);expect(html).not.toContain(STAGE_6_COORDINATE_PUZZLE.final.latitude);expect(html).toContain('dir="ltr"');});
});
