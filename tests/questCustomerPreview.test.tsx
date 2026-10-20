import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  QuestPagePreview,
  clampQuestPreviewPage,
  getQuestPreviewPage,
} from "@/components/shop/QuestPagePreview";
import { QuestBuilder } from "@/components/shop/QuestBuilder";
import { QuestDocument } from "@/components/shop/QuestDocument";
import { QuestReadyResult } from "@/components/shop/QuestReadyResult";
import { dictionaries } from "@/i18n";
import {
  formatPageNumberRanges,
  getSoundCase001PrintPlan,
} from "@/lib/shop/questDocument";
import { MAX_QUEST_PERSONALIZATION_NAME_LENGTH } from "@/lib/shop/questPersonalization";

const saved = {
  locale: "en" as const,
  leadName: "Maya",
  participants: ["Noa", "Sam"],
};

describe("customer quest page preview", () => {
  it("uses the canonical 24-page plan and renders only the selected real page", () => {
    const plan = getSoundCase001PrintPlan(saved);
    const html = renderToStaticMarkup(createElement(QuestPagePreview, {
      personalization: saved,
      interfaceLang: "en",
    }));
    expect(plan.pages).toHaveLength(24);
    expect(html).toContain(`data-preview-page-id="${plan.pages[0].id}"`);
    expect(html).toContain(`data-page-id="${plan.pages[0].id}"`);
    expect(html.match(/class="quest-page-frame"/g)).toHaveLength(1);
    expect(html.match(/quest-page-preview__page-button/g)).toHaveLength(24);
    expect(html).toContain("Page 1 of 24");
  });

  it("supports previous/next boundaries and direct canonical page selection", () => {
    const pages = getSoundCase001PrintPlan(saved).pages;
    expect(clampQuestPreviewPage(-1, pages.length)).toBe(0);
    expect(clampQuestPreviewPage(24, pages.length)).toBe(23);
    expect(getQuestPreviewPage(pages, 2)?.id).toBe(pages[2].id);
    expect(getQuestPreviewPage(pages, 99)?.id).toBe(pages[23].id);
  });

  it("derives exact single and duplex ranges from canonical metadata", () => {
    const plan = getSoundCase001PrintPlan(saved);
    expect(plan.singleSidedPageNumbers).toEqual([1, 6, 9, 20, 21, 22]);
    expect(plan.duplexPairs.map(({ frontPageNumber, backPageNumber }) => [frontPageNumber, backPageNumber])).toEqual([
      [2, 3], [4, 5], [7, 8], [10, 11], [12, 13], [14, 15], [16, 17], [18, 19], [23, 24],
    ]);
    expect(new Set(plan.duplexPairs.map(({ duplexMode }) => duplexMode))).toEqual(new Set(["flip-long-edge"]));
    expect(formatPageNumberRanges(plan.singleSidedPageNumbers)).toBe("1, 6, 9, 20–22");
    expect(formatPageNumberRanges(plan.duplexPairs.flatMap((pair) => [pair.frontPageNumber, pair.backPageNumber]))).toBe("2–5, 7–8, 10–19, 23–24");
  });

  it.each(["ru", "en", "he"] as const)("renders localized navigation and code-verified print guide in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(QuestReadyResult, {
      personalization: { ...saved, locale },
      interfaceLang: locale,
      printStatus: "idle",
      onEdit: () => undefined,
      onPrint: () => undefined,
      accountPath: "/account",
    }));
    const copy = dictionaries[locale].shop.soundCase.builder;
    expect(html).toContain(copy.previewTitle);
    expect(html).toContain(copy.printGuideTitle);
    expect(html).toContain("1, 6, 9, 20–22");
    expect(html).toContain("2–5, 7–8, 10–19, 23–24");
    expect(html).not.toMatch(/Download PDF|Скачать PDF|הורדת PDF/);
    if (locale === "he") expect(html).toContain('dir="rtl"');
  });

  it("renders lead-only, maximum-team and mixed 80-character names without changing the page count", () => {
    const longMixedName = "נועה Example Тест ".repeat(6).slice(0, MAX_QUEST_PERSONALIZATION_NAME_LENGTH);
    const cases = [
      { ...saved, leadName: "Maya", participants: [] },
      { ...saved, participants: Array.from({ length: 8 }, (_, index) => `Participant ${index + 1}`) },
      { locale: "he" as const, leadName: longMixedName, participants: ["Анна Example", "נועה Test"] },
    ];
    for (const personalization of cases) {
      const pages = getSoundCase001PrintPlan(personalization).pages;
      const html = renderToStaticMarkup(createElement(QuestDocument, { personalization }));
      expect(pages).toHaveLength(24);
      expect(html.match(/data-page-id=/g)).toHaveLength(24);
      expect(html).toContain(personalization.leadName);
    }
  });

  it("keeps preview and print on the saved snapshot and guards repeated print preparation", () => {
    const source = readFileSync(`${process.cwd()}/components/shop/QuestBuilder.tsx`, "utf8");
    expect(source).toContain("<QuestReadyResult personalization={lastSaved}");
    expect(source).toContain("<QuestDocument personalization={lastSaved} />");
    expect(source).not.toContain("<QuestDocument personalization={draft}");
    expect(source).toContain("if (!lastSaved || isDirty || !printHost || printingRef.current) return");
    expect(source).toContain("printingRef.current = true");
    expect(source).toContain("printingRef.current = false");
  });

  it("uses safe account intents without bypassing protected access", () => {
    const account = readFileSync(`${process.cwd()}/pages/account/index.tsx`, "utf8");
    const route = readFileSync(`${process.cwd()}/pages/shop/[slug]/create.tsx`, "utf8");
    const protection = readFileSync(`${process.cwd()}/components/shop/ProtectedQuestBuilder.tsx`, "utf8");
    expect(account).toContain("?mode=edit");
    expect(account).toContain("?mode=ready");
    expect(route).toContain('router.query.mode === "edit"');
    expect(protection).toContain('auth.status === "authenticated" && access === "granted"');
    expect(protection).toContain("initialPersonalization={initialPersonalization}");
  });

  it("uses edit intent only when saved data exists and otherwise falls back to Personalize", () => {
    const edited = renderToStaticMarkup(createElement(QuestBuilder, {
      interfaceLang: "en", initialPersonalization: saved, initialMode: "edit", onSave: async (value) => value,
    }));
    const ready = renderToStaticMarkup(createElement(QuestBuilder, {
      interfaceLang: "en", initialPersonalization: saved, initialMode: "ready", onSave: async (value) => value,
    }));
    const missing = renderToStaticMarkup(createElement(QuestBuilder, {
      interfaceLang: "en", initialPersonalization: null, initialMode: "ready", onSave: async (value) => value,
    }));
    expect(edited).toContain("Save &amp; continue");
    expect(ready).toContain("Your personalized Sound Case is ready");
    expect(missing).toContain("Save &amp; continue");
  });
});
