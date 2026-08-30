import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TranslationWarning, {
  shouldShowTranslationWarning,
} from "@/components/TranslationWarning";
import {
  getContentTranslationMetadata,
  needsTranslationFallback,
  sequenceNeedsTranslationFallback,
} from "@/lib/contentTranslationMetadata";

describe("content translation metadata", () => {
  it("marks an existing Hebrew translation payload as native", () => {
    expect(getContentTranslationMetadata("he", true)).toEqual({
      requestedLanguage: "he",
      sourceLanguage: "he",
      native: true,
      hasRussianFallback: false,
    });
  });

  it.each(["he", "en"] as const)("marks missing %s translation as Russian fallback", (lang) => {
    expect(getContentTranslationMetadata(lang, false)).toEqual({
      requestedLanguage: lang,
      sourceLanguage: "ru",
      native: false,
      hasRussianFallback: true,
    });
  });

  it("treats requested Russian source as native and warning-free", () => {
    const translation = getContentTranslationMetadata("ru", false);
    expect(translation.native).toBe(true);
    expect(translation.hasRussianFallback).toBe(false);
    expect(shouldShowTranslationWarning(translation)).toBe(false);
  });

  it("marks a present payload with complete displayed fields as fallback-free", () => {
    const usesFallback = [
      ["Title", "Title in English"],
      ["Описание", "Description"],
    ].some(([base, translated]) => needsTranslationFallback(base, translated));

    expect(getContentTranslationMetadata("en", true, usesFallback)).toMatchObject({
      native: true,
      hasRussianFallback: false,
    });
  });

  it("marks a present payload with a missing non-empty description as partial fallback", () => {
    const translation = getContentTranslationMetadata(
      "en",
      true,
      needsTranslationFallback("Русское описание", undefined),
    );
    expect(translation).toMatchObject({ native: true, hasRussianFallback: true });
  });

  it("does not require a translation for an empty source description", () => {
    expect(needsTranslationFallback(null, undefined)).toBe(false);
    expect(getContentTranslationMetadata("en", true, false).hasRussianFallback).toBe(false);
  });

  it("detects complete and partial lesson Frank sequences", () => {
    const sourceSteps = Array.from({ length: 8 }, (_, index) => ({ frank: `Реплика ${index + 1}` }));
    const complete = Array.from({ length: 8 }, (_, index) => `Line ${index + 1}`);
    const partial = complete.slice(0, 6);
    const frank = (item: unknown) => typeof item === "object" && item !== null && "frank" in item
      ? (item as { frank?: unknown }).frank
      : item;

    expect(sequenceNeedsTranslationFallback(sourceSteps, complete, frank)).toBe(false);
    expect(sequenceNeedsTranslationFallback(sourceSteps, partial, frank)).toBe(true);
  });

  it("ignores an empty recipe fact but detects a missing non-empty fact", () => {
    expect(needsTranslationFallback(null, undefined)).toBe(false);
    expect(needsTranslationFallback("Русский факт", undefined)).toBe(true);
  });

  it("detects a recipe cooking step without translated text", () => {
    const source = [{ text: "Шаг один" }, { text: "Шаг два" }];
    const translated = [{ text: "Step one" }, { text: "" }];
    const stepText = (item: unknown) => typeof item === "object" && item !== null && "text" in item
      ? (item as { text?: unknown }).text
      : undefined;

    expect(sequenceNeedsTranslationFallback(source, translated, stepText)).toBe(true);
  });

  it("renders the warning only for a real Russian fallback", () => {
    const fallback = getContentTranslationMetadata("en", false);
    const native = getContentTranslationMetadata("en", true);
    const partial = getContentTranslationMetadata("he", true, true);
    const russian = getContentTranslationMetadata("ru", false);

    expect(renderToStaticMarkup(<TranslationWarning lang="en" translation={fallback} />))
      .toContain("browser’s built-in translation");
    expect(renderToStaticMarkup(<TranslationWarning lang="en" translation={native} />)).toBe("");
    expect(renderToStaticMarkup(<TranslationWarning lang="he" translation={partial} />))
      .toContain("חלק מהתוכן");
    expect(renderToStaticMarkup(<TranslationWarning lang="ru" translation={russian} />)).toBe("");
  });

  it("does not mark a mixed partial-translation container entirely as Russian", () => {
    const partial = getContentTranslationMetadata("en", true, true);
    const markup = renderToStaticMarkup(
      <section lang={partial.native ? undefined : "ru"}>English and русский</section>,
    );
    expect(markup).not.toContain('lang="ru"');
  });

  it("allows a Russian fallback content container to declare its actual language", () => {
    const fallback = getContentTranslationMetadata("he", false);
    const markup = renderToStaticMarkup(
      <section lang={fallback.native ? undefined : "ru"}>Русский оригинал</section>,
    );
    expect(markup).toContain('lang="ru"');
  });
});
