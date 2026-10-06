import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestBuilder } from "@/components/shop/QuestBuilder";
import { QuestDocument } from "@/components/shop/QuestDocument";
import { QuestPreview } from "@/components/shop/QuestPreview";
import { dictionaries, type Lang } from "@/i18n";
import {
  SOUND_CASE_001_DELIVERY_SECTIONS,
  getSoundCase001FullPrintablePages,
  getSoundCase001PrintableSections,
} from "@/lib/shop/questDocument";

const PERSONALIZATION = {
  locale: "en" as const,
  leadName: "Maya",
  participants: ["Noa", "Sam"],
};

describe("owned Sound Case customer delivery", () => {
  it.each([
    ["ru", "/account", "Распечатать / сохранить PDF"],
    ["en", "/en/account", "Print / save PDF"],
    ["he", "/he/account", "הדפסה / שמירה כ־PDF"],
  ] as const)("renders localized delivery actions for %s", (interfaceLang, accountPath, printLabel) => {
    const html = renderToStaticMarkup(createElement(QuestBuilder, {
      interfaceLang,
      initialPersonalization: { ...PERSONALIZATION, locale: interfaceLang },
      onSave: async (value) => value,
    }));

    expect(html).toContain(`href="${accountPath}"`);
    if (interfaceLang === "he") {
      expect(html).toContain("הדפסה / שמירה");
      expect(html).toContain("PDF");
    } else {
      expect(html).toContain(printLabel);
    }
    expect(html).toContain(dictionaries[interfaceLang].shop.soundCase.builder.printHelp);
    if (interfaceLang === "he") expect(html).toContain('dir="rtl"');
  });

  it("keeps purchase UI out of the owned preview without changing the catalog default", () => {
    const owned = renderToStaticMarkup(createElement(QuestPreview, {
      personalization: PERSONALIZATION,
      presentation: "owned",
    }));
    const catalog = renderToStaticMarkup(createElement(QuestPreview, {
      personalization: PERSONALIZATION,
    }));

    expect(owned).not.toContain("quest-product-preview__purchase");
    expect(catalog).toContain("quest-product-preview__purchase");
  });

  it("feeds the same current unsaved state to preview and the single QuestDocument renderer", () => {
    const source = readFileSync(`${process.cwd()}/components/shop/QuestBuilder.tsx`, "utf8");
    expect(source).toContain('<QuestPreview personalization={personalization} presentation="owned" />');
    expect(source).toContain("<QuestDocument personalization={personalization} />");
    expect(source.match(/<QuestDocument/g)).toHaveLength(1);
  });

  it.each(["ru", "en", "he"] as const)(
    "composes the complete localized physical kit in canonical order for %s",
    (locale) => {
      const personalization = {
        locale,
        leadName: locale === "he" ? "מאיה" : "Maya",
        participants: locale === "he" ? ["נועה", "סם"] : ["Noa", "Sam"],
      };
      const sections = getSoundCase001PrintableSections(personalization);
      const pages = getSoundCase001FullPrintablePages(personalization);

      expect(sections.map(({ id }) => id)).toEqual([
        "stage-01",
        "stage-02",
        "stage-04",
        "stage-05",
        "stage-07",
        "reward",
      ]);
      expect(sections.map(({ id, pages: sectionPages }) => [id, sectionPages.length])).toEqual([
        ["stage-01", 6],
        ["stage-02", 3],
        ["stage-04", 8],
        ["stage-05", 3],
        ["stage-07", 2],
        ["reward", 2],
      ]);
      expect(pages).toHaveLength(24);
      expect(pages.map(({ printOrder }) => printOrder)).toEqual(
        Array.from({ length: 24 }, (_, index) => index),
      );
    },
  );

  it("records Stage 03 and Stage 06 as intentional digital-only stages", () => {
    expect(SOUND_CASE_001_DELIVERY_SECTIONS).toContainEqual({
      id: "stage-03",
      delivery: "digital-only",
    });
    expect(SOUND_CASE_001_DELIVERY_SECTIONS).toContainEqual({
      id: "stage-06",
      delivery: "digital-only",
    });
  });

  it("uses the complete physical-kit composer as the customer document default", () => {
    const html = renderToStaticMarkup(createElement(QuestDocument, {
      personalization: PERSONALIZATION,
    }));
    const sectionStarts = [
      'data-page-id="sound-case-001-adult-intro"',
      'data-page-type="stage-2-vibrating-cards"',
      'data-page-type="stage-4-cards"',
      'data-page-type="stage-5-cards"',
      'data-page-id="sound-case-001-stage-7-club-kit-en"',
      'data-page-type="sound-case-collectible-cards"',
    ].map((marker) => html.indexOf(marker));

    expect(sectionStarts.every((index) => index >= 0)).toBe(true);
    expect(sectionStarts).toEqual([...sectionStarts].sort((a, b) => a - b));
    expect(html.match(/data-page-id=/g)).toHaveLength(24);
  });

  it("renders personalized names in the complete customer document without demo placeholders", () => {
    const personalization = {
      locale: "en" as const,
      leadName: "Current Unsaved Lead",
      participants: ["Current Teammate"],
    };
    const html = renderToStaticMarkup(createElement(QuestDocument, { personalization }));

    expect(html).toContain("Current Unsaved Lead");
    expect(html).toContain("Current Teammate");
    expect(html).not.toContain("Your team names will appear here");
  });

  it("keeps the printable customer document behind ProtectedQuestBuilder", () => {
    const route = readFileSync(`${process.cwd()}/pages/shop/[slug]/create.tsx`, "utf8");
    const protection = readFileSync(`${process.cwd()}/components/shop/ProtectedQuestBuilder.tsx`, "utf8");
    expect(route).toContain("<ProtectedQuestBuilder");
    expect(route).not.toContain("QuestDocument");
    expect(protection).toContain('auth.status === "authenticated" && access === "granted"');
    expect(protection).toContain("<QuestBuilder");
  });

  it.each(["ru", "en", "he"] as Lang[])("has complete delivery copy in %s", (lang) => {
    const copy = dictionaries[lang].shop.soundCase.builder;
    expect(copy.backToPurchases).toBeTruthy();
    expect(copy.print).toBeTruthy();
    expect(copy.printPreparing).toBeTruthy();
    expect(copy.printFailed).toBeTruthy();
    expect(copy.printHelp).toBeTruthy();
  });

  it("shows a localized failure state instead of printing an incomplete document", () => {
    const source = readFileSync(`${process.cwd()}/components/shop/QuestBuilder.tsx`, "utf8");
    expect(source).toContain('role="alert"');
    expect(source).toContain("text.printFailed");
    expect(source).toContain("printPreparedQuestDocument(printHost)");
  });

  it("keeps Print Lab development-only and reuses QuestDocument", () => {
    const route = readFileSync(`${process.cwd()}/pages/internal/quest-print-lab.tsx`, "utf8");
    const builder = readFileSync(`${process.cwd()}/components/shop/QuestBuilder.tsx`, "utf8");
    expect(route).toContain('nodeEnvironment === "development"');
    expect(builder).not.toContain("QuestPrintLab");
    expect(builder).toContain('import { QuestDocument } from "./QuestDocument"');
  });
});
