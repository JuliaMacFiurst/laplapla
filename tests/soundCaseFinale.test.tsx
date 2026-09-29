import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SoundCaseHubScene } from "@/components/quests/sound-case-001/SoundCaseHubScene";
import { SoundCaseSolvedScene } from "@/components/quests/sound-case-001/SoundCaseSolvedScene";
import { dictionaries } from "@/i18n";
import { isDarkSoundCaseRoute } from "@/lib/quests/soundCaseRouting";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { SOUND_CASE_001_STAGE_5_SAMPLES } from "@/lib/shop/quests/sound-case-001/scatteredSand";
import {
  SOUND_CASE_001_HUB_DESTINATION,
  SOUND_CASE_001_HUB_PUBLIC_PATH,
  SOUND_CASE_001_SOLVED_DESTINATION,
  SOUND_CASE_001_SOLVED_PUBLIC_PATH,
} from "@/lib/shop/quests/sound-case-001/finale";

const solvedSceneAssets = {
  victoryImageUrl: "/victory.webp",
  collectibleCardsImageUrl: "/cards-asset.webp",
  soundtrackUrl: "/Desert-Quest-Completed.mp3",
};
const hubSceneAssets = {
  backgroundUrl: "/finale-background.webp",
  parrotUrl: "/parrot.webp",
  singingDuneArtworkUrl: "/singing-dune-style-icon.webp",
  wakeTheDuneIconUrl: "/wake-the-dune-icon.webp",
  humanEqualizerIconUrl: "/human-equalizer-icon.webp",
  articleArtworkUrl: "/singing-dune-article.webp",
  drawingPreviewUrl: "/poyushaya-dyuna-preview.png",
};

describe("Sound Case #001 case-level finale", () => {
  it("keeps exact long-lived solved and hub route contracts", () => {
    expect(SOUND_CASE_001_SOLVED_PUBLIC_PATH).toBe("/quests/sound-case-001/solved");
    expect(SOUND_CASE_001_SOLVED_DESTINATION).toBe("https://www.laplapla.com/quests/sound-case-001/solved");
    expect(SOUND_CASE_001_HUB_PUBLIC_PATH).toBe("/quests/sound-case-001/hub");
    expect(SOUND_CASE_001_HUB_DESTINATION).toBe("https://www.laplapla.com/quests/sound-case-001/hub");
  });

  it("classifies solved and hub as existing dark Sound Case pages without expanding Unknown Sound help", () => {
    expect(isDarkSoundCaseRoute(SOUND_CASE_001_SOLVED_PUBLIC_PATH)).toBe(true);
    expect(isDarkSoundCaseRoute(SOUND_CASE_001_HUB_PUBLIC_PATH)).toBe(true);
    expect(isDarkSoundCaseRoute("/quests/sound-case-001/stage-01/unknown-sound")).toBe(true);
    expect(isDarkSoundCaseRoute("/quests/quest-1")).toBe(false);

    const topBar = readFileSync(`${process.cwd()}/components/TopBar.tsx`, "utf8");
    expect(topBar).toContain("isDarkSoundCaseRoute(router.pathname)");
    expect(topBar).toContain('className={`top-bar${isDarkSoundCaseScene ? " top-bar--unknown-sound" : ""}`}');
    expect(topBar).toContain('data-quest-header={isUnknownSoundScene ? "unknown-sound" : isDarkSoundCaseScene ? "sound-case" : undefined}');
    expect(topBar).toContain("{isUnknownSoundScene ? (");
    expect(topBar).not.toContain("SOUND_CASE_001_SOLVED_PUBLIC_PATH");
    expect(topBar).not.toContain("SOUND_CASE_001_HUB_PUBLIC_PATH");
  });

  it.each(["ru", "en", "he"] as const)("renders the intentional user-gesture opening for the %s solved ceremony", (lang) => {
    const text = dictionaries[lang].shop.soundCase.finale.solved;
    const html = renderToStaticMarkup(<SoundCaseSolvedScene lang={lang} {...solvedSceneAssets} />);

    expect(html).toContain('data-sound-case-page="solved"');
    expect(html).toContain('data-finale-phase="ready"');
    expect(html).toContain(`lang="${lang}"`);
    expect(html).toContain(`dir="${lang === "he" ? "rtl" : "ltr"}"`);
    expect(html).toContain(text.readyTitle);
    expect(html).toContain(text.startAction);
    expect(html).toContain('src="/victory.webp"');
    expect(html).toContain('rel="preload" as="image" href="/cards-asset.webp"');
    expect(html).toContain('src="/Desert-Quest-Completed.mp3"');
    expect(html).toContain('data-finale-soundtrack="Desert-Quest-Completed"');
    expect(html).not.toMatch(/href=.*sound-case-001\/hub/);
  });

  it.each(["ru", "en", "he"] as const)("contains the complete localized %s ceremony and SVG stamp copy", (lang) => {
    const text = dictionaries[lang].shop.soundCase.finale.solved;
    expect([
      text.revealFirst, text.revealName, text.revealBody,
      ...text.achievements, text.congratulations, text.victoryLead, text.victoryClose,
      text.solvedStamp, text.investigatorKicker, text.investigatorOfficial, text.investigatorRole,
      text.rewardQuestion, text.rewardAnswer, text.rewardHost, text.rewardCommand,
      text.cardPromise, text.flipCard, text.cardHintBeforeQr, text.cardHintQr, text.cardHintAfterQr,
    ].every(Boolean)).toBe(true);
    expect(text.solvedStamp).toBe(lang === "ru" ? "РЕШЕНО" : lang === "en" ? "SOLVED" : "נפתר");
  });

  it("uses typed victory media and preserves the Sample 08 solved destination", () => {
    const victory = SOUND_CASE_001_ASSET_MANIFEST.assets["finale-victory"];
    const cards = SOUND_CASE_001_ASSET_MANIFEST.assets["finale-collectible-cards"];
    const soundtrack = SOUND_CASE_001_ASSET_MANIFEST.assets["finale-victory-soundtrack"];
    expect(victory.kind).toBe("visual");
    expect(victory.source).toEqual({ status: "external", url: "https://pub-90c38f7454e44f0eaba7a2cdd9030ee6.r2.dev/quests/sound-case-001/collectible-cards/assets/victory.webp" });
    expect(cards.kind).toBe("visual");
    expect(cards.source).toEqual({ status: "external", url: "https://pub-90c38f7454e44f0eaba7a2cdd9030ee6.r2.dev/quests/sound-case-001/collectible-cards/assets/cards-asset.webp" });
    expect(soundtrack.kind).toBe("audio");
    expect(soundtrack.source).toEqual({ status: "external", url: "https://pub-90c38f7454e44f0eaba7a2cdd9030ee6.r2.dev/quests/sound-case-001/collectible-cards/audio/Desert-Quest-Completed.mp3" });
    expect(SOUND_CASE_001_STAGE_5_SAMPLES[7].qrDestination).toBe(SOUND_CASE_001_SOLVED_DESTINATION);
  });

  it("starts sound only from the finale gesture, cleans it up, and has reduced-motion timing", () => {
    const source = readFileSync(`${process.cwd()}/components/quests/sound-case-001/SoundCaseSolvedScene.tsx`, "utf8");
    expect(source).toContain('onClick={beginSequence}');
    expect(source).toContain("audio.play()");
    expect(source).toContain("audio.pause()");
    expect(source).toContain("audio.currentTime = 0");
    expect(source).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(source).toContain("REDUCED_MOTION_SEQUENCE");
    expect(source).toContain('["discovery", 3100]');
    expect(source).toContain('["victory", 6700]');
    expect(source).toContain('["investigator", 9500]');
    expect(source).toContain('["reward", 12800]');
    expect(source).toContain('["discovery", 850]');
    expect(source).toContain('["victory", 1800]');
    expect(source).toContain('["investigator", 2750]');
    expect(source).toContain('["reward", 3800]');
    expect(source).toContain('setPhase("reward")');
  });

  it("uses future-safe localized Hub hints on the physical card reward", () => {
    expect(dictionaries.ru.shop.soundCase.finale.solved).toMatchObject({
      flipCard: "ПЕРЕВЕРНИТЕ КАРТУ ↻",
      cardHintBeforeQr: "На обороте — ",
      cardHintQr: "QR-код",
      cardHintAfterQr: expect.stringContaining("будут появляться"),
    });
    expect(dictionaries.en.shop.soundCase.finale.solved).toMatchObject({
      flipCard: "TURN THE CARD OVER ↻",
      cardHintQr: "QR code",
      cardHintAfterQr: expect.stringContaining("will appear there over time"),
    });
    expect(dictionaries.he.shop.soundCase.finale.solved).toMatchObject({
      flipCard: "הפכו את הכרטיס ↻",
      cardHintQr: "QR",
      cardHintAfterQr: expect.stringContaining("עם הזמן יופיעו"),
    });
  });

  it("removes the equipment checklist and Hub CTA while keeping the physical reward handoff", () => {
    const source = readFileSync(`${process.cwd()}/components/quests/sound-case-001/SoundCaseSolvedScene.tsx`, "utf8");
    expect(source).not.toMatch(/callbackItems|punchline|RADAR|GEOPHONES|MICROPHONES|SAMPLES|BUTT/);
    expect(source).not.toMatch(/SOUND_CASE_001_HUB|hubAction|next\/link/);
    expect(source).toContain("text.rewardCommand");
    expect(source).toContain("text.cardPromise");
    expect(source).toContain("text.flipCard");
    expect(source).toContain("sound-case-ceremony__card-reward");
    expect(source).not.toContain("sound-case-ceremony__card-tease");
    expect(source).toContain('bdi dir="ltr"');
    const styles = readFileSync(`${process.cwd()}/styles/SoundCaseQuest.css`, "utf8");
    expect(styles).toContain(".sound-case-ceremony__card-reward");
    expect(styles).not.toContain(".sound-case-ceremony__card-tease");
    expect(styles).toContain(".sound-case-ceremony__ready h1 { line-height: 1.08; }");
    expect(styles).toContain(".sound-case-ceremony__reward h1 { line-height: 1.06; }");
  });

  it.each(["ru", "en", "he"] as const)("renders an intentional account-free %s hub landing state", (lang) => {
    const text = dictionaries[lang].shop.soundCase.finale.hub;
    const html = renderToStaticMarkup(<SoundCaseHubScene lang={lang} {...hubSceneAssets} />);

    expect(html).toContain('data-sound-case-page="hub"');
    expect(html).toContain(`dir="${lang === "he" ? "rtl" : "ltr"}"`);
    expect(html).toContain(text.title);
    expect(html).toContain(text.lead);
    for (const category of text.categories) expect(html).toContain(category);
    expect(html).toContain(`${lang === "ru" ? "" : `/${lang}`}/parrots?style=singing-dune`);
    expect(html).not.toContain("/studio?style=singing-dune");
    expect(html).toContain("/mini-games/wake-the-dune");
    expect(html).toContain("/dog/lessons/poyushaya-dyuna");
    expect(html).toContain("/stage-03/equalizer?from=hub");
    expect(html).toContain("/quests/sound-case-001/singing-dunes");
    expect(html).toContain("/wake-the-dune-icon.webp");
    expect(html).toContain("/singing-dune-style-icon.webp");
    expect(html).toContain("/poyushaya-dyuna-preview.png");
    expect(html.match(/<a\b/g)).toHaveLength(6);
    expect(html).not.toMatch(/<button\b/);
    expect(html).not.toMatch(/sign.?in|account|login|session|participant/i);
  });

  it("loads the drawing thumbnail from the lesson database and keeps the game icon typed", () => {
    const page = readFileSync(`${process.cwd()}/pages/quests/sound-case-001/hub.tsx`, "utf8");
    const loader = readFileSync(`${process.cwd()}/lib/server/soundCaseHub.ts`, "utf8");
    expect(page).toContain("loadSoundCaseHubDrawingPreview");
    expect(loader).toContain('.eq("slug", SINGING_DUNE_LESSON_SLUG)');
    expect(loader).toContain('.from("lessons")');
    expect(loader).toContain("createSignedUrl(lesson.preview");
    expect(SOUND_CASE_001_ASSET_MANIFEST.assets["hub-wake-the-dune-icon"].source).toEqual({
      status: "external",
      url: "https://pub-90c38f7454e44f0eaba7a2cdd9030ee6.r2.dev/quests/sound-case-001/mini-games/wake-the-dune/assets/wake-the-dune-icon.webp",
    });
  });

  it("renders all five final Hub areas as active full-card artwork", () => {
    const component = readFileSync(`${process.cwd()}/components/quests/sound-case-001/SoundCaseHubScene.tsx`, "utf8");
    const page = readFileSync(`${process.cwd()}/pages/quests/sound-case-001/hub.tsx`, "utf8");
    const styles = readFileSync(`${process.cwd()}/styles/SoundCaseQuest.css`, "utf8");
    expect(component).toContain("buildParrotStyleHref(SINGING_DUNE_STYLE_ID, lang)");
    expect(component).toContain("sound-case-hub__activity--music");
    expect(component).toContain("sound-case-hub__activity--drawing");
    expect(component).toContain("sound-case-hub__activity--game");
    expect(component).toContain("sound-case-hub__activity--equalizer");
    expect(component).toContain("sound-case-hub__activity--article");
    expect(component).not.toMatch(/preparingLabel|emptyState|soonLabel/);
    expect(page).toContain('getParrotAudioUrl("parrot-style-media/styles/singing-dune/style-icon.webp")');
    expect(styles).toContain(".sound-case-hub__activity-media { position: absolute;");
    expect(styles).toContain("object-fit: cover;");
    expect(styles).toContain("object-fit: contain;");
    expect(styles).toContain("background: #fff3d7;");
  });

  it("keeps both page entry points free of personalization and account state", () => {
    for (const file of [
      "pages/quests/sound-case-001/solved.tsx",
      "pages/quests/sound-case-001/hub.tsx",
    ]) {
      const source = readFileSync(`${process.cwd()}/${file}`, "utf8");
      expect(source).not.toMatch(/QuestPersonalization|Supabase|useSession|publicCollectibleId|\?card=/);
    }
  });

  it("keeps the Hub grid shrinkable and raises small Solved copy on phones", () => {
    const styles = readFileSync(`${process.cwd()}/styles/SoundCaseQuest.css`, "utf8");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr);");
    expect(styles).toContain(".sound-case-hub__intro > div:first-child { min-width: 0; width: 100%; }");
    expect(styles).toContain("grid-row: 1; grid-column: 1; justify-self: center;");
    expect(styles).toContain("font-size: clamp(2rem, 10.5vw, 3rem);");
    expect(styles).toContain(".sound-case-ceremony__mast { font-size: .72rem; }");
    expect(styles).toContain("font-size: .68rem;");
    expect(styles).toContain("font-size: clamp(.8rem,3.45vw,.9rem);");
  });
});
