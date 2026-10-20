import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  QuestBuilder,
  normalizeQuestPersonalization,
  questPersonalizationsMatch,
  shouldEnterReadyAfterSave,
} from "@/components/shop/QuestBuilder";
import { QuestDocument } from "@/components/shop/QuestDocument";
import { QuestPreview } from "@/components/shop/QuestPreview";
import { QuestReadyResult } from "@/components/shop/QuestReadyResult";
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
    expect(html).toContain("24");
    expect(html).toContain("PDF");
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

  it("keeps current draft separate from the saved snapshot used by QuestDocument", () => {
    const source = readFileSync(`${process.cwd()}/components/shop/QuestBuilder.tsx`, "utf8");
    expect(source).toContain("const [draft, setDraft]");
    expect(source).toContain("const [lastSaved, setLastSaved]");
    expect(source).toContain("<QuestDocument personalization={lastSaved} />");
    expect(source).not.toContain("<QuestDocument personalization={draft}");
    expect(source.match(/<QuestDocument/g)).toHaveLength(1);
  });

  it("does not treat a stale save response as readiness for a newer draft", () => {
    const source = readFileSync(`${process.cwd()}/components/shop/QuestBuilder.tsx`, "utf8");
    const snapshotA = { locale: "en" as const, leadName: "Maya", participants: ["Noa"] };
    const newerDraftB = { ...snapshotA, leadName: "Maya B" };
    expect(shouldEnterReadyAfterSave(snapshotA, snapshotA)).toBe(true);
    expect(shouldEnterReadyAfterSave(newerDraftB, snapshotA)).toBe(false);
    expect(questPersonalizationsMatch(newerDraftB, snapshotA)).toBe(false);
    expect(source).toContain('current === "saving" ? "saving" : "idle"');
  });

  it("normalizes blank participant rows consistently without promoting them to saved data", () => {
    expect(normalizeQuestPersonalization({
      locale: "he",
      leadName: "  מאיה ",
      participants: [" נועה ", "", "   "],
    })).toEqual({ locale: "he", leadName: "מאיה", participants: ["נועה"] });
  });

  it("restores a valid saved personalization directly into the Ready result", () => {
    const html = renderToStaticMarkup(createElement(QuestBuilder, {
      interfaceLang: "en",
      initialPersonalization: PERSONALIZATION,
      onSave: async (value) => value,
    }));
    expect(html).toContain("Your personalized Sound Case is ready");
    expect(html).toContain("24 A4 pages");
    expect(html).toContain("Print / save PDF");
    expect(html).toContain("Edit personalization");
    expect(html).not.toContain("Save &amp; continue");
  });

  it("starts without a print action until a first personalization is saved", () => {
    const html = renderToStaticMarkup(createElement(QuestBuilder, {
      interfaceLang: "en",
      initialPersonalization: null,
      onSave: async (value) => value,
    }));
    expect(html).toContain("Save &amp; continue");
    expect(html).toContain("Add the lead participant to continue.");
    expect(html).not.toContain(">Print / save PDF<");
  });

  it("protects dirty work on reload and the in-surface account link", () => {
    const source = readFileSync(`${process.cwd()}/components/shop/QuestBuilder.tsx`, "utf8");
    expect(source).toContain('window.addEventListener("beforeunload"');
    expect(source).toContain("window.confirm(text.leaveConfirm)");
    expect(source).toContain("if (isDirty");
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
    const builderSource = readFileSync(`${process.cwd()}/components/shop/QuestBuilder.tsx`, "utf8");
    const resultSource = readFileSync(`${process.cwd()}/components/shop/QuestReadyResult.tsx`, "utf8");
    expect(resultSource).toContain('role="alert"');
    expect(resultSource).toContain("text.printFailed");
    expect(builderSource).toContain("printPreparedQuestDocument(printHost)");
  });

  it("keeps Print Lab development-only and reuses QuestDocument", () => {
    const route = readFileSync(`${process.cwd()}/pages/internal/quest-print-lab.tsx`, "utf8");
    const builder = readFileSync(`${process.cwd()}/components/shop/QuestBuilder.tsx`, "utf8");
    expect(route).toContain('nodeEnvironment === "development"');
    expect(builder).not.toContain("QuestPrintLab");
    expect(builder).toContain('import { QuestDocument } from "./QuestDocument"');
  });

  it.each(["ru", "en", "he"] as const)("shows localized Ready facts without stale timing claims in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(QuestReadyResult, {
      interfaceLang: locale, personalization: { ...PERSONALIZATION, locale }, printStatus: "idle",
      onEdit: () => undefined, onPrint: () => undefined, accountPath: "/account",
    }));
    expect(dictionaries[locale].shop.soundCase.builder.readyDuration).toContain("90");
    expect(dictionaries[locale].shop.soundCase.builder.readyDuration).toContain("120");
    expect(html).toContain("24");
    expect(html).not.toContain("20–30");
    expect(html).not.toContain("60–90");
    if (locale === "he") expect(html).toContain('dir="rtl"');
  });

  it("keeps preparation un-timed, glue in requirements, and makes no solo claim", () => {
    for (const locale of ["ru", "en", "he"] as const) {
      const preview = dictionaries[locale].shop.soundCase.preview;
      expect(preview.preparationTime).not.toMatch(/20.?30|60.?90/);
      expect(preview.requirements.join(" ")).toMatch(/клей|glue|דבק/i);
      expect(JSON.stringify(dictionaries[locale].shop.soundCase.builder)).not.toMatch(/solo|одиноч|לבד/i);
    }
  });

  it("keeps temporary access failure distinct and retryable", () => {
    const source = readFileSync(`${process.cwd()}/components/shop/ProtectedQuestBuilder.tsx`, "utf8");
    expect(source).toContain("builder.loadErrorTitle");
    expect(source).toContain("builder.loadErrorBody");
    expect(source).toContain("builder.retryLoad");
    expect(source).toContain("setLoadAttempt");
  });
});
