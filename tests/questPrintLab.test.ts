import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  QuestPrintLab,
  getQuestPrintLabCardBoxPage,
  getQuestPrintLabDuplexPairs,
} from "@/components/shop/QuestPrintLab";
import { dictionaries } from "@/i18n";
import { SOUND_CASE_001_PAGES } from "@/lib/shop/questDocument";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { UNKNOWN_SOUND_QR_DESTINATION } from "@/lib/shop/quests/sound-case-001/unknownSoundCard";
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
    expect(labSource).toContain("pages={selectedPages}");
    expect(labSource).toContain("getSoundCase001Stage2Pages");
    expect(labSource).toContain("getSoundCase001Stage4Pages");
    expect(labSource).toContain("assetManifest={SOUND_CASE_001_ASSET_MANIFEST}");
    expect(labSource).not.toContain("CaseCoverPage");
    expect(labSource).not.toContain('from "./SoundCardsPage"');
    expect(labSource).not.toContain("<SoundCardsPage");
    expect(labSource).not.toContain("QuestPreview");
    expect(labSource).toContain("type QuestPersonalization");
    expect(labSource).not.toContain("PrintLabPersonalization");
    expect(labSource).not.toContain("SoundCasePreviewNames");
  });

  it.each(["ru", "en", "he"] as const)(
    "makes Stage 02 discoverable and renders its real %s printable model in the shared lab",
    (locale) => {
      const html = renderToStaticMarkup(createElement(QuestPrintLab, {
        initialStage: "02",
        initialPersonalization: { locale, leadName: "Maya", participants: [] },
      }));

      expect(html).toContain('data-stage-selector="true"');
      expect(html).toContain("STAGE 01");
      expect(html).toContain("STAGE 02");
      expect(html).toContain("VIBRATING CARDS");
      expect(html).toContain('aria-label="Открыть STAGE 02 — Vibrating Cards" aria-pressed="true"');
      expect(html.match(/data-page-id=/g)).toHaveLength(3);
      expect(html).toContain('data-page-type="stage-2-vibrating-cards"');
      expect(html).toContain('data-page-type="stage-2-clue-back"');
      expect(html).toContain('data-page-type="stage-2-box"');
    },
  );

  it.each(["ru", "en", "he"] as const)("renders Stage 04 %s in the shared Print Lab", (locale) => {
    const html = renderToStaticMarkup(createElement(QuestPrintLab, {
      initialStage: "04",
      initialPersonalization: { locale, leadName: "Maya", participants: [] },
    }));
    expect(html).toContain("STAGE 04");
    expect(html).toContain("BROKEN RHYTHM");
    expect(html).toContain('aria-label="Открыть STAGE 04 — Broken Rhythm" aria-pressed="true"');
    expect(html.match(/data-page-id=/g)).toHaveLength(8);
    expect(html).not.toContain('data-page-type="stage-4-rules"');
    expect(html).toContain('data-page-type="stage-4-box-rules"');
    expect(html).toContain('data-rules-side="front"');
    expect(html).toContain('data-rules-side="back"');
    expect(html.match(/data-duplex-side=/g)).toHaveLength(8);
  });

  it("defaults X-Ray to OFF and renders every current printable page", () => {
    const html = renderToStaticMarkup(createElement(QuestPrintLab));

    expect(html).toContain('data-xray="off"');
    expect(html).toContain("X-Ray: OFF");
    expect(html.match(/data-page-id=/g)).toHaveLength(5);
    expect(html).not.toContain('data-page-id="sound-case-001-case-cover"');
    expect(html).toContain('data-page-id="sound-case-001-sound-cards-1"');
    expect(html).toContain('data-page-id="sound-case-001-sound-card-backs-1"');
    expect(html).toContain('data-page-id="sound-case-001-sound-cards-2"');
    expect(html).toContain('data-page-id="sound-case-001-sound-card-backs-2"');
    expect(html).toContain('data-page-id="sound-case-001-stage-1-card-box"');
    expect(html.match(/data-card-accent=/g)).toHaveLength(12);
    expect(html.match(/data-rendering-role="ordinary-sound-card-back"/g)).toHaveLength(12);
    expect(html).toContain('data-rendering-role="unknown-sound-front"');
    expect(html).toContain('data-rendering-role="unknown-sound-back"');
    expect(html).toContain("Quest Print Lab");
    expect(html).toContain("Sound Case #001");
    expect(html).toContain("Главный исследователь");
    expect(html).toContain("Команда расследования");
    expect(html).toContain("+ Добавить участника");
    expect(html).toContain(
      dictionaries.ru.shop.soundCase.caseCover.printLabTitle,
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="quest-print-lab-print-help-content"');
    expect(html).toContain('id="quest-print-lab-print-help-content"');
    expect(html).toContain("Как правильно распечатать?");
    expect(html).toContain("Коробочка: отдельная односторонняя страница");
    expect(html).toContain('data-print-mode="single-sided"');
    expect(html).toContain("Flip on long edge");
    expect(html).toContain('data-duplex-scenario="auto"');
    expect(html).toContain('data-duplex-scenario="manual"');
    expect(html).toContain("ПРИНТЕР ПЕЧАТАЕТ С ДВУХ СТОРОН");
    expect(html).toContain("ПРИНТЕР ПЕЧАТАЕТ ТОЛЬКО С ОДНОЙ СТОРОНЫ");
    expect(html).toContain("НЕ БЕРИТЕ НОВЫЙ ЛИСТ ДЛЯ ОБОРОТА.");
    expect(html).toContain("SOUND CARDS 1/2");
    expect(html).toContain("SOUND CARD BACKS 1/2");
    expect(html).toContain("SOUND CARDS 2/2");
    expect(html).toContain("SOUND CARD BACKS 2/2");
    expect(html).toContain("Flip on long edge");
    expect(html).toContain("зависит от модели принтера");
    expect(html).toContain("ЛИЦО ↑");

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

  it("derives physical PDF page numbers from the printable document order", () => {
    expect(getQuestPrintLabDuplexPairs(SOUND_CASE_001_PAGES)).toEqual([
      {
        pairId: "sound-cards-sheet-1",
        sheetNumber: 1,
        frontLabel: "SOUND CARDS 1/2",
        backLabel: "SOUND CARD BACKS 1/2",
        frontPageNumber: 1,
        backPageNumber: 2,
      },
      {
        pairId: "sound-cards-sheet-2",
        sheetNumber: 2,
        frontLabel: "SOUND CARDS 2/2",
        backLabel: "SOUND CARD BACKS 2/2",
        frontPageNumber: 3,
        backPageNumber: 4,
      },
    ]);
    expect(getQuestPrintLabCardBoxPage(SOUND_CASE_001_PAGES)).toMatchObject({
      pageNumber: 5,
      definition: {
        id: "sound-case-001-stage-1-card-box",
        type: "stage-1-card-box",
        side: "single",
      },
    });
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
      expect(html).toContain(
        dictionaries[locale].shop.soundCase.soundCardBacks.manualTitle,
      );
      expect(html).toContain(
        dictionaries[locale].shop.soundCase.caseCover.printLabTitle,
      );
      expect(html).toContain(
        dictionaries[locale].shop.soundCase.soundCardBacks.printHelpTitle,
      );
      expect(html).toContain(
        dictionaries[locale].shop.soundCase.soundCardBacks.notNewSheet,
      );
      expect(html).toContain(
        dictionaries[locale].shop.soundCase.cardBox.printLabGuidance,
      );
      expect(
        dictionaries[locale].shop.soundCase.soundCardBacks.autoSettings.join(" "),
      ).toContain("Flip on long edge");
      expect(
        dictionaries[locale].shop.soundCase.soundCardBacks.testSteps,
      ).toHaveLength(5);
      expect(
        dictionaries[locale].shop.soundCase.soundCardBacks.testChecks,
      ).toHaveLength(2);
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
    expect(html).toContain(
      `data-qr-destination="${UNKNOWN_SOUND_QR_DESTINATION}"`,
    );
    expect(html.match(/class="quest-unknown-sound-card__qr"/g)).toHaveLength(1);
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
