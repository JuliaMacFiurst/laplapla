import { readFileSync } from "node:fs";
import { isDarkSoundCaseRoute } from "@/lib/quests/soundCaseRouting";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { dictionaries } from "@/i18n";
import { DuneSoundControl, ExpertClubHost, ExpertClubRecoveryPanel, HostOnlyAnswerPanel, InvestigationRecap, Round1Reveal, Round2Options } from "@/components/quests/sound-case-001/ExpertClubHost";
import { renderQuestPageDefinition } from "@/components/shop/questPageRenderers";
import { SOUND_CASE_001_ASSET_MANIFEST, STAGE_7_DUNE_SLIDING_EXPERIMENT_URL } from "@/lib/shop/quests/sound-case-001/assets";
import { getSoundCase001Stage7Pages } from "@/lib/shop/questDocument";
import { STAGE_7_BACKGROUND_REQUIREMENT, STAGE_7_BOX_DIELINE_POSITION_MM, STAGE_7_BOX_DIELINE_SIZE_MM, STAGE_7_BOX_INNER_SIZE_MM, STAGE_7_CARD_SIZE_MM, STAGE_7_DISCUSSION_SECONDS, STAGE_7_EQUIPMENT, STAGE_7_LABEL_SIZE_MM, STAGE_7_PUBLIC_PATH, STAGE_7_ROUND_1_ANSWER, STAGE_7_STACK_THICKNESS_MM } from "@/lib/shop/quests/sound-case-001/expertClub";
import { INITIAL_EXPERT_CLUB_STATE, getRound1RevealKind, getTimerExpiryMode, reduceExpertClub, type ExpertClubState } from "@/lib/shop/quests/sound-case-001/expertClubGame";
import { EXPERT_CLUB_AUDIO_LEVELS } from "@/lib/shop/quests/sound-case-001/expertClubAudio";
import { SOUND_CASE_001_STAGE_2_PHRASES } from "@/lib/shop/quests/sound-case-001/vibratingCards";
import { STAGE_6_COORDINATE_PUZZLE } from "@/lib/shop/quests/sound-case-001/scatteredSand";

const advance = (state: ExpertClubState, times: number) => {
  let next = state;
  for (let index=0; index<times; index+=1) next=reduceExpertClub(next,{type:"advance"});
  return next;
};

describe("Sound Case Stage 07", () => {
  it("keeps game pieces on one A4 page and adds one correctly sized box page", () => {
    expect(STAGE_7_CARD_SIZE_MM).toEqual({width:57,height:58});
    expect(STAGE_7_LABEL_SIZE_MM).toEqual({width:44,height:20});
    expect(STAGE_7_EQUIPMENT).toHaveLength(7);
    expect(STAGE_7_ROUND_1_ANSWER).toBe("metal-detector");
    expect(getSoundCase001Stage7Pages("ru")).toHaveLength(2);
    expect(STAGE_7_BOX_INNER_SIZE_MM.width).toBeGreaterThan(STAGE_7_CARD_SIZE_MM.width);
    expect(STAGE_7_BOX_INNER_SIZE_MM.height).toBeGreaterThan(STAGE_7_CARD_SIZE_MM.height);
    expect(STAGE_7_BOX_INNER_SIZE_MM.depth).toBeGreaterThan(STAGE_7_STACK_THICKNESS_MM);
    expect(STAGE_7_BOX_DIELINE_POSITION_MM.x+STAGE_7_BOX_DIELINE_SIZE_MM.width).toBeLessThanOrEqual(210);
    expect(STAGE_7_BOX_DIELINE_POSITION_MM.y+STAGE_7_BOX_DIELINE_SIZE_MM.height).toBeLessThanOrEqual(297);
  });

  it.each(["ru","en","he"] as const)("renders seven equipment cards and eight unnumbered labels in %s", locale => {
    const [page]=getSoundCase001Stage7Pages(locale);
    const context={personalization:{locale,leadName:"",participants:[]},assetManifest:SOUND_CASE_001_ASSET_MANIFEST};
    const html=renderToStaticMarkup(renderQuestPageDefinition(page,context));
    expect(html.match(/class="stage-7-print-card stage-7-equipment-card/g)).toHaveLength(7);
    expect(html.match(/stage-7-name-label/g)).toHaveLength(8);
    expect(html).toContain("expert-club-qr.svg");
    expect(html).not.toContain("stage-7-answer-card");
    expect(html).not.toContain("stage-7-print-card--rules");
    expect(html.match(/stage-7-equipment-card--[^" ]+[^>]*>[\s\S]*?<img/g)).toHaveLength(7);
    expect(html).not.toMatch(/[🎙📡📳🧪📷🍑📟]/u);
    expect(html).not.toMatch(/Quantity|Количество|כמות|INVENTORY/iu);
    expect(html.match(/<img src="https:\/\/pub-90c38f7454e44f0eaba7a2cdd9030ee6\.r2\.dev\/quests\/sound-case-001\/stage-07-expert-club\/assets\/cards\//g)).toHaveLength(7);
    for(const name of dictionaries[locale].shop.soundCase.stage05.print.sampleNames) expect(html).toContain(name);
    const labels=html.match(/<article[^>]*stage-7-name-label[\s\S]*?<\/article>/g) || [];
    expect(labels).toHaveLength(8);
    for(const label of labels) expect(label).not.toMatch(/>\s*0?[1-8]\s*</);
  });

  it.each(["ru","en","he"] as const)("prints self-contained box-start instructions in %s", locale => {
    const page=getSoundCase001Stage7Pages(locale)[1];
    const html=renderToStaticMarkup(renderQuestPageDefinition(page,{personalization:{locale,leadName:"",participants:[]},assetManifest:SOUND_CASE_001_ASSET_MANIFEST}));
    const labels=dictionaries[locale].shop.soundCase.stage07;
    expect(html).toContain(labels.print.boxHostHeading);
    expect(html).toContain(labels.print.boxStartKey);
    expect(html).toContain("expert-club-qr.svg");
    expect(html).toContain(labels.routeShort);
  });

  it.each(["ru","en","he"] as const)("builds the final recap from canonical Stage 01–04 conclusions in %s", locale => {
    const soundCase=dictionaries[locale].shop.soundCase;
    const html=renderToStaticMarkup(createElement(InvestigationRecap,{lang:locale,labels:soundCase.stage07}));
    for(const line of soundCase.unknownSoundScene.clueLines) expect(html).toContain(line);
    expect(html).toContain(SOUND_CASE_001_STAGE_2_PHRASES[locale]);
    expect(html).toContain(soundCase.humanEqualizer.clueStatement);
    for(const line of soundCase.stage04.digital.clueLines) expect(html).toContain(line);
    expect(html).toContain(STAGE_6_COORDINATE_PUZZLE.final.latitude);
    expect(html).toContain(STAGE_6_COORDINATE_PUZZLE.final.longitude);
    expect(html).toContain('dir="ltr"');
    expect(html).not.toContain("{number}");
  });

  it("derives a positive result for METAL DETECTOR", () => {
    let state=reduceExpertClub(INITIAL_EXPERT_CLUB_STATE,{type:"configure",mode:"teams",teamAName:"A",teamBName:"B"});
    state=advance(state,2);
    state=reduceExpertClub(state,{type:"begin-answer",responders:["a"]});
    state=reduceExpertClub(state,{type:"select-answer",answer:"metal-detector"});
    expect(state.pendingCorrect).toBe(true);
    state=reduceExpertClub(state,{type:"confirm-attempt"});
    expect(state.step).toBe("round-1-reveal");
    expect(getRound1RevealKind(state)).toBe("correct");
    expect(dictionaries.ru.shop.soundCase.stage07.round1Reveal[0]).toBe("ТОЧНО!");
  });

  it("gives BUTT/ПОПА its specific wrong reveal without leaking the answer", () => {
    let state=reduceExpertClub(INITIAL_EXPERT_CLUB_STATE,{type:"configure",mode:"teams",teamAName:"A",teamBName:"B"});
    state=advance(state,2);
    state=reduceExpertClub(state,{type:"begin-answer",responders:["a"]});
    state=reduceExpertClub(state,{type:"select-answer",answer:"human-butt"});
    state=reduceExpertClub(state,{type:"confirm-attempt"});
    expect(state.awaitingSecondTeam).toBe(true);
    expect(getRound1RevealKind(state)).toBe("butt");
    expect(dictionaries.ru.shop.soundCase.stage07.round1ButtReveal.join(" ")).toContain("Попа");
    expect(dictionaries.ru.shop.soundCase.stage07.round1ButtReveal.join(" ")).not.toContain("МЕТАЛЛОИСКАТЕЛЬ");
  });

  it("gives SAND SAMPLES a non-butt wrong reveal and preserves Team B's chance", () => {
    let state=reduceExpertClub(INITIAL_EXPERT_CLUB_STATE,{type:"configure",mode:"teams",teamAName:"A",teamBName:"B"});
    state=advance(state,2);
    state=reduceExpertClub(state,{type:"begin-answer",responders:["a"]});
    state=reduceExpertClub(state,{type:"select-answer",answer:"sand-samples"});
    expect(state.pendingCorrect).toBe(false);
    state=reduceExpertClub(state,{type:"confirm-attempt"});
    expect(state.awaitingSecondTeam).toBe(true);
    expect(getRound1RevealKind(state)).toBe("other");
    expect(dictionaries.ru.shop.soundCase.stage07.round1OtherLine.toLocaleLowerCase("ru")).not.toContain("попа");
    expect(dictionaries.ru.shop.soundCase.stage07.round1OtherLine).not.toContain("МЕТАЛЛОИСКАТЕЛЬ");
    state=reduceExpertClub(state,{type:"resume-other-team"});
    expect(state.step).toBe("round-1-question");
    expect(state.attempts.round1.a).toBe(false);
  });

  it("keeps an answer editable until confirmation", () => {
    let state=reduceExpertClub(INITIAL_EXPERT_CLUB_STATE,{type:"configure",mode:"teams"});
    state=advance(state,2);
    state=reduceExpertClub(state,{type:"begin-answer",responders:["a"]});
    state=reduceExpertClub(state,{type:"select-answer",answer:"sand-samples"});
    expect(state.pendingCorrect).toBe(false);
    state=reduceExpertClub(state,{type:"select-answer",answer:"metal-detector"});
    expect(state.pendingAnswer).toBe("metal-detector");
    expect(state.pendingCorrect).toBe(true);
  });

  it("records simultaneous hands sequentially and ends competition at celebration", () => {
    let state=reduceExpertClub(INITIAL_EXPERT_CLUB_STATE,{type:"configure",mode:"teams",teamAName:"A",teamBName:"B"});
    state=advance(state,2);
    state=reduceExpertClub(state,{type:"begin-answer",responders:["a","b"]});
    state=reduceExpertClub(state,{type:"select-answer",answer:"metal-detector"});
    state=reduceExpertClub(state,{type:"confirm-attempt"});
    expect(state.activeResponder).toBe("b");
    expect(state.step).toBe("round-1-attempt");
    expect(state.scoreA).toBe(1);
  });

  it("uses roulette only for two-team timeout and keeps its selection stable", () => {
    expect(getTimerExpiryMode("teams")).toBe("roulette");
    expect(getTimerExpiryMode("cooperative")).toBe("group-answer");
    let state=reduceExpertClub(INITIAL_EXPERT_CLUB_STATE,{type:"configure",mode:"teams",teamAName:"A",teamBName:"B"});
    state=advance(state,2);
    state=reduceExpertClub(state,{type:"select-roulette",challenge:"round1",responder:"a"});
    expect(["a","b"]).toContain(state.rouletteSelections.round1);
    const stable=reduceExpertClub(state,{type:"select-roulette",challenge:"round1",responder:"b"});
    expect(stable.rouletteSelections.round1).toBe("a");
  });

  it("applies the same stored roulette rule to the bonus question", () => {
    const state={...INITIAL_EXPERT_CLUB_STATE,mode:"teams" as const,step:"bonus-question" as const};
    const selected=reduceExpertClub(state,{type:"select-roulette",challenge:"bonus",responder:"b"});
    expect(selected.rouletteSelections.bonus).toBe("b");
  });

  it("ends after celebration with a terminal physical handoff and no digital matching state", () => {
    let state=reduceExpertClub(INITIAL_EXPERT_CLUB_STATE,{type:"configure",mode:"cooperative",groupName:"Explorers"});
    for (const challenge of ["round1","bonus","round2"] as const) {
      state=reduceExpertClub(state,{type:"advance"});
      state=reduceExpertClub(state,{type:"advance"});
      state=reduceExpertClub(state,{type:"begin-answer",responders:["group"]});
      if (challenge!=="bonus") state=reduceExpertClub(state,{type:"select-answer",answer:challenge==="round1"?"metal-detector":"C"});
      state=reduceExpertClub(state,{type:"select-correctness",correct:true});
      state=reduceExpertClub(state,{type:"confirm-attempt"});
    }
    expect(state.step).toBe("round-2-reveal");
    state=reduceExpertClub(state,{type:"advance"});
    expect(state.step).toBe("celebration");
    state=reduceExpertClub(state,{type:"advance"});
    expect(state.step).toBe("physical-handoff");
    expect(reduceExpertClub(state,{type:"advance"})).toEqual(state);
  });

  it("server-renders setup without answer leaks and exposes the typed background slot", () => {
    expect(STAGE_7_DISCUSSION_SECONDS).toBe(60);
    expect(STAGE_7_BACKGROUND_REQUIREMENT.assetId).toBe("stage-7-expert-club-background");
    const html=renderToStaticMarkup(createElement(ExpertClubHost,{lang:"en",parrotUrl:"/parrot.webp",duneAudioUrl:"/dune.mp3",victoryAudioUrl:"/fanfare.mp3"}));
    expect(html).toContain("ONE GROUP");
    expect(html).toContain("SUGGEST A NAME");
    expect(html).not.toContain("Correct answer: SAND");
    const asset=SOUND_CASE_001_ASSET_MANIFEST.assets["stage-7-expert-club-background"];
    expect(asset.source.status).toBe("external");
    if(asset.source.status==="external") expect(asset.source.url).toContain("stage-07-expert-club-background.webp");
  });

  it("maps every equipment card to a configured typed WebP asset", () => {
    expect(new Set(STAGE_7_EQUIPMENT.map(item=>item.assetId)).size).toBe(7);
    for(const item of STAGE_7_EQUIPMENT){
      const asset=SOUND_CASE_001_ASSET_MANIFEST.assets[item.assetId];
      expect(asset.kind).toBe("visual");
      expect(asset.source.status).toBe("external");
      if(asset.source.status==="external") expect(asset.source.url).toMatch(/stage-07-expert-club\/assets\/cards\/.+\.webp$/);
    }
  });

  it("keeps the full Round 1 answer behind a deliberate host-only reveal", () => {
    let state=reduceExpertClub(INITIAL_EXPERT_CLUB_STATE,{type:"configure",mode:"teams",teamAName:"A",teamBName:"B"});
    state=advance(state,2);
    state=reduceExpertClub(state,{type:"begin-answer",responders:["a"]});
    state=reduceExpertClub(state,{type:"select-answer",answer:"sand-samples"});
    state=reduceExpertClub(state,{type:"confirm-attempt"});
    state=reduceExpertClub(state,{type:"skip-other-team"});
    const html=renderToStaticMarkup(createElement(Round1Reveal,{state,labels:dictionaries.ru.shop.soundCase.stage07,onContinue:()=>{}}));
    expect(html).toContain("ТОЛЬКО ДЛЯ ВЕДУЩЕГО");
    expect(html).toContain("ПОКАЗАТЬ ПРАВИЛЬНЫЙ ОТВЕТ");
    expect(html).not.toContain("Лишний предмет — МЕТАЛЛОИСКАТЕЛЬ");
    expect(dictionaries.ru.shop.soundCase.stage07.round1Editorial).not.toMatch(/съезж|склон|лавин/iu);
  });

  it("provides host-only Bonus guidance without awarding a result", () => {
    const labels=dictionaries.ru.shop.soundCase.stage07;
    const html=renderToStaticMarkup(createElement(HostOnlyAnswerPanel,{labels,lines:labels.bonusAnswerReference,warning:labels.hostOnlyReadWarning,buttonLabel:labels.inspectCorrectAnswer}));
    expect(html).toContain("ТОЛЬКО ДЛЯ ВЕДУЩЕГО");
    expect(html).toContain("ПОСМОТРЕТЬ ПРАВИЛЬНЫЙ ОТВЕТ");
    expect(html).not.toContain(labels.bonusAnswerReference[0]);
    expect(labels.bonusAnswerReference.join(" ")).toMatch(/лавин|съезж/iu);
  });

  it("owns the configured typed Bonus experiment visual at its canonical production path", () => {
    const asset=SOUND_CASE_001_ASSET_MANIFEST.assets["stage-7-dune-sliding-experiment"];
    expect(asset).toEqual({id:"stage-7-dune-sliding-experiment",kind:"visual",source:{status:"external",url:STAGE_7_DUNE_SLIDING_EXPERIMENT_URL}});
    expect(STAGE_7_DUNE_SLIDING_EXPERIMENT_URL).toMatch(/\/stage-07-expert-club\/assets\/dune-sliding-experiment\.webp$/);
    for(const lang of ["ru","en","he"] as const){
      const labels=dictionaries[lang].shop.soundCase.stage07;
      expect(labels.bonusVisualDisclaimer).toBeTruthy();
      expect(labels.bonusVisualCaption).toBeTruthy();
    }
  });

  it("uses the real typed dune audio and the new A–D answers", () => {
    const asset=SOUND_CASE_001_ASSET_MANIFEST.assets["stage-7-singing-sand-dune"];
    expect(asset.kind).toBe("audio");
    expect(asset.source.status).toBe("external");
    if(asset.source.status==="external") expect(asset.source.url).toMatch(/\/audio\/singing-sand-dune\.mp3$/);
    expect(dictionaries.ru.shop.soundCase.stage07.round2Options).toEqual([
      "🎺 Тромбонист, который впервые увидел тромбон пять минут назад",
      "🐘 Слон, который крадётся через магазин посуды",
      "🏜️ Очень большая куча песка распевается перед концертом",
      "🚪 Старая дверь, которая категорически не хочет открываться",
    ]);
    expect(dictionaries.en.shop.soundCase.stage07.round2Options[2]).toContain("warming up for a concert");
    expect(dictionaries.he.shop.soundCase.stage07.round2Options[2]).toContain("חימום");
    const hostSource=readFileSync(`${process.cwd()}/components/quests/sound-case-001/ExpertClubHost.tsx`,"utf8");
    expect(hostSource).toContain("playDuneClue(duneAudioUrl,setDunePlaying)");
    expect(hostSource).not.toContain('play("burp")');
    expect(hostSource.indexOf('beforeRule={<Round2Options')).toBeGreaterThan(-1);
    expect(hostSource).toContain('{beforeRule}<aside className="expert-club__answer-rule"');
    const optionsHtml=renderToStaticMarkup(createElement(Round2Options,{options:dictionaries.ru.shop.soundCase.stage07.round2Options}));
    expect(optionsHtml).toContain("Тромбонист");
    expect(optionsHtml).toContain("Очень большая куча песка");
    expect(optionsHtml.match(/<li>/g)).toHaveLength(4);
  });

  it("makes dune playback unmistakable without relying on color alone", () => {
    const labels=dictionaries.ru.shop.soundCase.stage07;
    const idle=renderToStaticMarkup(createElement(DuneSoundControl,{playing:false,labels,onPlay:()=>undefined}));
    const active=renderToStaticMarkup(createElement(DuneSoundControl,{playing:true,labels,onPlay:()=>undefined}));
    expect(idle).toContain(labels.playSound);
    expect(idle).toContain('aria-pressed="false"');
    expect(active).toContain(labels.soundPlaying);
    expect(active).toContain('aria-pressed="true"');
    expect(active).toContain('class="expert-club__sound-wave"');
    expect(active).toContain('is-playing');
  });

  it("keeps tick subordinate while making event and dune audio clearly audible", () => {
    expect(EXPERT_CLUB_AUDIO_LEVELS.tick).toBeGreaterThanOrEqual(.08);
    expect(EXPERT_CLUB_AUDIO_LEVELS.tick).toBeLessThan(.15);
    expect(EXPERT_CLUB_AUDIO_LEVELS.dune).toBeGreaterThanOrEqual(.8);
    expect(EXPERT_CLUB_AUDIO_LEVELS.victory).toBe(1);
    expect(EXPERT_CLUB_AUDIO_LEVELS.applauseOutput).toBeGreaterThan(EXPERT_CLUB_AUDIO_LEVELS.tick*5);
  });

  it("uses the typed victory fanfare and identifies the Stage 05 sample cards in the handoff", () => {
    const fanfare=SOUND_CASE_001_ASSET_MANIFEST.assets["stage-7-victory-fanfare"];
    expect(fanfare.kind).toBe("audio");
    expect(fanfare.source.status).toBe("external");
    if(fanfare.source.status==="external") expect(fanfare.source.url).toMatch(/medieval-show-fanfare-announcement-226\.mp3$/);
    for(const lang of ["ru","en","he"] as const){
      const copy=dictionaries[lang].shop.soundCase.stage07.handoffLines.join(" ");
      expect(copy).toMatch(/05/);
      expect(copy).toMatch(/eight|восемь|שמונת/iu);
      expect(copy).toMatch(/room|комнат|בחדר/iu);
    }
  });

  it("contains no user-visible Russian coarse form", () => {
    expect(JSON.stringify(dictionaries.ru.shop.soundCase)).not.toMatch(/задниц/iu);
  });

  it("renders an accessible, grouped recovery panel", () => {
    const html=renderToStaticMarkup(createElement(ExpertClubRecoveryPanel,{labels:dictionaries.en.shop.soundCase.stage07,onContinue:()=>{},onRestart:()=>{}}));
    expect(html).toContain('role="dialog"');
    expect(html).toContain(dictionaries.en.shop.soundCase.stage07.backToGame);
    expect(html).toContain("START OVER");
    expect(html.match(/<button/g)).toHaveLength(2);
  });

  it("registers Stage 07 with the established dark Sound Case header", () => {
    const source=readFileSync(`${process.cwd()}/components/TopBar.tsx`,"utf8");
    expect(isDarkSoundCaseRoute(STAGE_7_PUBLIC_PATH)).toBe(true);
    expect(source).toContain("isDarkSoundCaseRoute(router.pathname)");
  });

  it("ships a real QR SVG for the canonical host route", () => {
    const svg=readFileSync(`${process.cwd()}/public/quests/sound-case-001/stage-07/expert-club-qr.svg`,"utf8");
    expect(svg).toContain("<svg");
    expect(svg).toContain("<path");
  });
});
