import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestDocument } from "@/components/shop/QuestDocument";
import { Stage4ResultScene } from "@/components/quests/sound-case-001/Stage4ResultScene";
import { getSoundCase001Stage4Pages } from "@/lib/shop/questDocument";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import {
  SOUND_CASE_001_STAGE_4_LEVELS,
  STAGE_4_CARD_OBJECTS,
  STAGE_4_CARD_SIZE_MM,
  STAGE_4_ASSUMED_CARDSTOCK_THICKNESS_MM,
  STAGE_4_BOX_CLEARANCE_MM,
  STAGE_4_BOX_DIELINE_SIZE_MM,
  STAGE_4_BOX_INNER_SIZE_MM,
  STAGE_4_ESTIMATED_STACK_THICKNESS_MM,
  STAGE_4_MAX_CARD_COUNT,
  STAGE_4_QR_DESTINATIONS,
  calculateStage4BoxGeometry,
  getStage4PersonalizedLead,
} from "@/lib/shop/quests/sound-case-001/brokenRhythm";

describe("Sound Case #001 Stage 04", () => {
  it("defines 6 secret cards and exactly 18 unambiguous answers", () => {
    expect(SOUND_CASE_001_STAGE_4_LEVELS).toHaveLength(6);
    expect(STAGE_4_CARD_OBJECTS.filter((card) => card.kind === "secret")).toHaveLength(6);
    expect(STAGE_4_CARD_OBJECTS.filter((card) => card.kind === "answer")).toHaveLength(18);
    for (const level of SOUND_CASE_001_STAGE_4_LEVELS) {
      expect(level.answers).toHaveLength(3);
      expect(level.answers.filter((answer) => answer.correct)).toHaveLength(1);
      expect(level.answers.find((answer) => answer.correct)?.rhythm).toEqual(level.secret);
      for (const falseAnswer of level.answers.filter((answer) => !answer.correct)) {
        expect(falseAnswer.rhythm).not.toEqual(level.secret);
      }
    }
  });

  it("puts three unique truthful QR destinations only on Level 06", () => {
    for (const level of SOUND_CASE_001_STAGE_4_LEVELS.slice(0, 5)) {
      expect(level.answers.every((answer) => !answer.qrDestination && !answer.qrAssetPath)).toBe(true);
    }
    const finalAnswers = SOUND_CASE_001_STAGE_4_LEVELS[5].answers;
    expect(finalAnswers.every((answer) => Boolean(answer.qrDestination && answer.qrAssetPath))).toBe(true);
    expect(new Set(finalAnswers.map((answer) => answer.qrDestination)).size).toBe(3);
    expect(finalAnswers.find((answer) => answer.correct)?.qrDestination).toBe(STAGE_4_QR_DESTINATIONS.correct);
    expect(finalAnswers.filter((answer) => !answer.correct).map((answer) => answer.qrDestination).sort()).toEqual([STAGE_4_QR_DESTINATIONS.wrongA, STAGE_4_QR_DESTINATIONS.wrongB].sort());
  });

  it("registers typed production gesture and experiment assets", () => {
    const assets = SOUND_CASE_001_ASSET_MANIFEST.assets;
    const expectedFiles = {
      "stage-4-gesture-clap": "stage-4-beat-clap.webp",
      "stage-4-gesture-snap": "stage-4-beat-finger-snap.webp",
      "stage-4-gesture-knee-pat": "stage-4-beat-knee-pat.webp",
      "stage-4-gesture-pause": "stage-4-beat-pause.webp",
      "stage-4-clap-together": "stage-4-clap-together.webp",
      "stage-4-clap-out-of-sync": "stage-4-clap-out-of-sync.webp",
    } as const;
    for (const id of Object.keys(expectedFiles) as (keyof typeof expectedFiles)[]) {
      expect(assets[id].kind).toBe("visual");
      expect(requireQuestAssetUrl(assets[id])).toContain("/stage-04-broken-rhythm/assets/");
      expect(requireQuestAssetUrl(assets[id])).toContain(expectedFiles[id]);
    }
  });

  it.each(["ru", "en", "he"] as const)("enters QuestDocument as eight A4 pages without a standalone rules sheet for %s", (locale) => {
    const pages = getSoundCase001Stage4Pages(locale);
    expect(pages).toHaveLength(8);
    expect(pages.map((page) => page.type)).toEqual(["stage-4-cards", "stage-4-cards", "stage-4-cards", "stage-4-cards", "stage-4-cards", "stage-4-cards", "stage-4-box-rules", "stage-4-box-rules"]);
    const html = renderToStaticMarkup(createElement(QuestDocument, { personalization: { locale, leadName: "Maya", participants: [] }, pages }));
    expect(html.match(/data-page-id=/g)).toHaveLength(8);
    expect(html).not.toContain('data-page-type="stage-4-rules"');
    expect(html).toContain('data-page-type="stage-4-box-rules"');
    expect(html).toContain('data-rules-side="front"');
    expect(html).toContain('data-rules-side="back"');
    expect(html.match(/data-duplex-side=/g)).toHaveLength(8);
    expect(html).toContain(`data-cut-width-mm="${STAGE_4_CARD_SIZE_MM.width}"`);
    expect(html).toContain(`data-cut-height-mm="${STAGE_4_CARD_SIZE_MM.height}"`);
  });

  it("derives a practical box for 25 cards with five millimetres clearance on every axis", () => {
    expect(STAGE_4_MAX_CARD_COUNT).toBe(25);
    expect(STAGE_4_ASSUMED_CARDSTOCK_THICKNESS_MM).toBe(0.4);
    expect(STAGE_4_ESTIMATED_STACK_THICKNESS_MM).toBe(10);
    expect(STAGE_4_BOX_CLEARANCE_MM).toEqual({ width: 5, height: 5, depth: 5 });
    expect(STAGE_4_BOX_INNER_SIZE_MM).toEqual({ width: 93, height: 61, depth: 15 });
    expect(STAGE_4_BOX_DIELINE_SIZE_MM).toEqual({ width: 106, height: 228 });
    expect(calculateStage4BoxGeometry(0.3)).toMatchObject({
      stackThickness: 7.5,
      inner: { width: 93, height: 61, depth: 12.5 },
      dieline: { width: 106, height: 223 },
    });
  });

  it("renders three visible Level 06 QR assets and the derived box dimensions", () => {
    const html = renderToStaticMarkup(createElement(QuestDocument, {
      personalization: { locale: "ru", leadName: "Maya", participants: [] },
      pages: getSoundCase001Stage4Pages("ru"),
    }));
    expect(html.match(/class="quest-stage-4-card__qr"/g)).toHaveLength(3);
    for (const destination of Object.values(STAGE_4_QR_DESTINATIONS)) {
      expect(html).toContain(`data-qr-destination="${destination}"`);
    }
    expect(html).toContain('data-box-inner-width-mm="93"');
    expect(html).toContain('data-box-inner-height-mm="61"');
    expect(html).toContain('data-box-inner-depth-mm="15"');
  });

  it("keeps the temporal rhythm order LTR inside Hebrew physical geometry", () => {
    const html = renderToStaticMarkup(createElement(QuestDocument, { personalization: { locale: "he", leadName: "מאיה", participants: [] }, pages: getSoundCase001Stage4Pages("he") }));
    expect(html).toContain('class="quest-stage-4-rhythm" dir="ltr"');
    expect(html).toContain('data-rhythm-order="clap,clap,snap,pause,knee-pat,snap,clap"');
  });

  it("uses personalization when present and a safe generic fallback", () => {
    expect(getStage4PersonalizedLead("  Maya ")).toBe("Maya");
    expect(getStage4PersonalizedLead("   ")).toBe("");
    const sceneAssets = {
      parrotUrl: "/parrot.webp",
      clapOutOfSyncUrl: "/clap-out-of-sync.webp",
      clapTogetherUrl: "/clap-together.webp",
    };
    const named = renderToStaticMarkup(createElement(Stage4ResultScene, { lang: "ru", result: "correct", ...sceneAssets, personalization: { locale: "ru", leadName: "Майя", participants: [] } }));
    const generic = renderToStaticMarkup(createElement(Stage4ResultScene, { lang: "ru", result: "wrong", ...sceneAssets }));
    expect(named).toContain("Майя");
    expect(named).toContain('/clap-out-of-sync.webp');
    expect(named).toContain('/clap-together.webp');
    expect(generic).toContain("Кажется, где-то по дороге");
    expect(generic).toContain("ЧТО ДЕЛАТЬ?");
    expect(generic).toContain("SECRET BEAT CARD 06");
    expect(generic).toContain("один из звуков решил сбежать");
    expect(generic).not.toContain("ВЕРНУТЬСЯ К РИТМУ");
    expect(generic).not.toContain("stage-4-result__return");
  });
});
