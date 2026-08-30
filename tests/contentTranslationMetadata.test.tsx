import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TranslationWarning, {
  shouldShowTranslationWarning,
} from "@/components/TranslationWarning";
import { getContentTranslationMetadata } from "@/lib/contentTranslationMetadata";

describe("content translation metadata", () => {
  it("marks an existing Hebrew translation payload as native", () => {
    expect(getContentTranslationMetadata("he", true)).toEqual({
      requestedLanguage: "he",
      sourceLanguage: "he",
      native: true,
    });
  });

  it.each(["he", "en"] as const)("marks missing %s translation as Russian fallback", (lang) => {
    expect(getContentTranslationMetadata(lang, false)).toEqual({
      requestedLanguage: lang,
      sourceLanguage: "ru",
      native: false,
    });
  });

  it("treats requested Russian source as native and warning-free", () => {
    const translation = getContentTranslationMetadata("ru", false);
    expect(translation.native).toBe(true);
    expect(shouldShowTranslationWarning(translation)).toBe(false);
  });

  it("renders the warning only for a real Russian fallback", () => {
    const fallback = getContentTranslationMetadata("en", false);
    const native = getContentTranslationMetadata("en", true);
    const russian = getContentTranslationMetadata("ru", false);

    expect(renderToStaticMarkup(<TranslationWarning lang="en" translation={fallback} />))
      .toContain("browser’s built-in translation");
    expect(renderToStaticMarkup(<TranslationWarning lang="en" translation={native} />)).toBe("");
    expect(renderToStaticMarkup(<TranslationWarning lang="ru" translation={russian} />)).toBe("");
  });

  it("allows a Russian fallback content container to declare its actual language", () => {
    const fallback = getContentTranslationMetadata("he", false);
    const markup = renderToStaticMarkup(
      <section lang={fallback.native ? undefined : "ru"}>Русский оригинал</section>,
    );
    expect(markup).toContain('lang="ru"');
  });
});
