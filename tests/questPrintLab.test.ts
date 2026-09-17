import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestPrintLab } from "@/components/shop/QuestPrintLab";
import { SOUND_CASE_001_PAGES } from "@/lib/shop/questDocument";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { isQuestPrintLabAvailable } from "@/pages/internal/quest-print-lab";

describe("internal Quest Print Lab", () => {
  it("is available only in development", () => {
    expect(isQuestPrintLabAvailable("production")).toBe(false);
    expect(isQuestPrintLabAvailable("development")).toBe(true);
    expect(isQuestPrintLabAvailable("test")).toBe(false);
    expect(isQuestPrintLabAvailable(undefined)).toBe(false);
  });

  it("renders the real QuestDocument with existing pages and manifest", () => {
    const routeSource = readFileSync(
      `${process.cwd()}/pages/internal/quest-print-lab.tsx`,
      "utf8",
    );
    const labSource = readFileSync(
      `${process.cwd()}/components/shop/QuestPrintLab.tsx`,
      "utf8",
    );

    expect(routeSource).toContain('import { QuestPrintLab }');
    expect(labSource).toContain('import { QuestDocument } from "./QuestDocument"');
    expect(labSource).toContain("pages={SOUND_CASE_001_PAGES}");
    expect(labSource).toContain("assetManifest={SOUND_CASE_001_ASSET_MANIFEST}");
    expect(labSource).not.toContain("CaseCoverPage");
    expect(labSource).not.toContain("SoundCardsPage");
    expect(labSource).not.toContain("QuestPreview");
    expect(labSource).toContain("type QuestPersonalization");
    expect(labSource).not.toContain("PrintLabPersonalization");
    expect(labSource).not.toContain("SoundCasePreviewNames");
  });

  it("defaults X-Ray to OFF and renders every current printable page", () => {
    const html = renderToStaticMarkup(createElement(QuestPrintLab));

    expect(html).toContain('data-xray="off"');
    expect(html).toContain("X-Ray: OFF");
    expect(html.match(/data-page-id=/g)).toHaveLength(5);
    expect(html).toContain('data-page-id="sound-case-001-case-cover"');
    expect(html).toContain('data-page-id="sound-case-001-sound-cards-1"');
    expect(html).toContain('data-page-id="sound-case-001-sound-card-backs-1"');
    expect(html).toContain('data-page-id="sound-case-001-sound-cards-2"');
    expect(html).toContain('data-page-id="sound-case-001-sound-card-backs-2"');
    expect(html.match(/data-card-accent=/g)).toHaveLength(12);
    expect(html.match(/data-rendering-role="ordinary-sound-card-back"/g)).toHaveLength(12);
    expect(html).toContain('data-rendering-role="unknown-sound-front"');
    expect(html).toContain('data-rendering-role="unknown-sound-back"');
    expect(html).toContain("Quest Print Lab");
    expect(html).toContain("Sound Case #001");
    expect(html).toContain("Главный исследователь");
    expect(html).toContain("Команда расследования");
    expect(html).toContain("+ Добавить участника");
    expect(html).toContain("Cover: print separately");
    expect(html).toContain("Card pages 2–5");
    expect(html).toContain("Duplex: flip on long edge");

    const firstSheetStart = html.indexOf(
      'data-page-id="sound-case-001-sound-cards-1"',
    );
    const firstBackStart = html.indexOf(
      'data-page-id="sound-case-001-sound-card-backs-1"',
    );
    const secondSheetStart = html.indexOf(
      'data-page-id="sound-case-001-sound-cards-2"',
    );
    const secondBackStart = html.indexOf(
      'data-page-id="sound-case-001-sound-card-backs-2"',
    );
    const firstSheetHtml = html.slice(firstSheetStart, firstBackStart);
    const secondSheetHtml = html.slice(secondSheetStart, secondBackStart);
    expect(firstSheetHtml.match(/data-card-accent=/g)).toHaveLength(9);
    expect(secondSheetHtml.match(/data-card-accent=/g)).toHaveLength(3);
  });

  it.each(["ru", "en", "he"] as const)(
    "supports a valid %s fixture without changing document definitions",
    (locale) => {
      const definitionsBeforeRender = JSON.stringify(SOUND_CASE_001_PAGES);
      const html = renderToStaticMarkup(
        createElement(QuestPrintLab, {
          initialPersonalization: {
            locale,
            leadName: "Maya מאיה",
            participants: ["Noa נועה", "Sam"],
          },
        }),
      );

      expect(html).toContain(`lang="${locale}"`);
      expect(html).toContain(locale === "he" ? 'dir="rtl"' : 'dir="ltr"');
      expect(html).toContain("Maya מאיה");
      expect(JSON.stringify(SOUND_CASE_001_PAGES)).toBe(definitionsBeforeRender);
    },
  );

  it("exposes semantic card asset diagnostics without fallback assets", () => {
    const html = renderToStaticMarkup(createElement(QuestPrintLab));

    for (const page of SOUND_CASE_001_PAGES) {
      expect(html).toContain(`data-page-id="${page.id}"`);
    }
    expect(html.match(/data-card-accent=/g)).toHaveLength(12);
    expect(html).toContain('data-asset-id="stage-1-card-back"');
    expect(html).toContain('data-asset-id="sound-lab-parrot"');
    expect(html.match(/data-card-accent=/g)).toHaveLength(12);
    expect(html.match(/data-title-size=/g)).toHaveLength(12);
    expect(html).toContain(
      `data-asset-id="${SOUND_CASE_001_ASSET_MANIFEST.assets["stage-1-sound-card-01-ketchup"].id}"`,
    );
    expect(html).toContain('data-side="front"');
    expect(html).toContain('data-side="back"');
    expect(html).toContain('data-duplex-mode="flip-long-edge"');
    expect(html).toContain('data-front-slot="4"');
    expect(html).toContain('data-back-slot="6"');
  });

  it("keeps customer builder behavior separate and hides all lab UI in print", () => {
    const builderSource = readFileSync(
      `${process.cwd()}/components/shop/QuestBuilder.tsx`,
      "utf8",
    );
    const css = readFileSync(`${process.cwd()}/styles/Shop.css`, "utf8");
    const printCss = css.slice(css.indexOf("@media print"));

    expect(builderSource).toContain("<QuestPreview personalization={personalization} />");
    expect(builderSource).toContain('className="quest-document-print-host"');
    expect(builderSource).toContain('aria-hidden="true"');
    expect(builderSource).not.toContain("QuestPrintLab");
    expect(builderSource).toContain("updateQuestParticipant(current, index, name)");
    expect(builderSource).toContain("removeQuestParticipant(current, index)");
    expect(printCss).toMatch(/\.quest-print-lab__toolbar[\s\S]*display: none !important/);
    expect(printCss).toMatch(/\.quest-print-lab--xray[\s\S]*display: none !important/);
  });
});
