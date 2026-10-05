import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { QuestBuilder, printQuestDocument } from "@/components/shop/QuestBuilder";
import { QuestPreview } from "@/components/shop/QuestPreview";
import { dictionaries, type Lang } from "@/i18n";

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

  it("invokes the browser print action", () => {
    const print = vi.fn();
    printQuestDocument(print);
    expect(print).toHaveBeenCalledOnce();
  });

  it("feeds the same current unsaved state to preview and the single QuestDocument renderer", () => {
    const source = readFileSync(`${process.cwd()}/components/shop/QuestBuilder.tsx`, "utf8");
    expect(source).toContain('<QuestPreview personalization={personalization} presentation="owned" />');
    expect(source).toContain("<QuestDocument personalization={personalization} />");
    expect(source.match(/<QuestDocument/g)).toHaveLength(1);
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
    expect(copy.printHelp).toBeTruthy();
  });

  it("keeps Print Lab development-only and reuses QuestDocument", () => {
    const route = readFileSync(`${process.cwd()}/pages/internal/quest-print-lab.tsx`, "utf8");
    const builder = readFileSync(`${process.cwd()}/components/shop/QuestBuilder.tsx`, "utf8");
    expect(route).toContain('nodeEnvironment === "development"');
    expect(builder).not.toContain("QuestPrintLab");
    expect(builder).toContain('import { QuestDocument } from "./QuestDocument"');
  });
});
