import { afterEach, describe, expect, it } from "vitest";
import {
  persistLanguagePreference,
  resolveLanguage,
} from "@/lib/i18n/routing";

describe("language resolution", () => {
  it.each([
    ["en", "en"],
    ["he", "he"],
    ["ru", "ru"],
    [null, "ru"],
  ] as const)("resolves stored %s on the default locale URL as %s", (storedLang, expected) => {
    expect(resolveLanguage({
      pathname: "/",
      routerLocale: "ru",
      cookieLang: storedLang,
    })).toBe(expected);
  });

  it("prefers an explicit Hebrew URL over stored English", () => {
    expect(resolveLanguage({
      pathname: "/he/cats",
      routerLocale: "he",
      cookieLang: "en",
    })).toBe("he");
  });

  it("prefers an explicit English URL over stored Hebrew", () => {
    expect(resolveLanguage({
      pathname: "/en/cats",
      routerLocale: "en",
      cookieLang: "he",
    })).toBe("en");
  });

  it("does not let the default router locale overwrite stored EN/HE", () => {
    expect(resolveLanguage({ pathname: "/cats", routerLocale: "ru", storedLang: "en" })).toBe("en");
    expect(resolveLanguage({ pathname: "/cats", routerLocale: "ru", legacyStoredLang: "he" })).toBe("he");
  });
});

describe("language persistence", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  afterEach(() => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
  });

  it.each(["en", "he", "ru"] as const)("persists an explicit %s selection", (lang) => {
    const values = new Map<string, string>();
    const documentStub = { cookie: "" };
    const windowStub = {
      localStorage: {
        setItem: (key: string, value: string) => values.set(key, value),
      },
    };
    Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
    Object.defineProperty(globalThis, "document", { configurable: true, value: documentStub });

    persistLanguagePreference(lang);

    expect(values.get("laplapla_lang")).toBe(lang);
    expect(values.get("lang")).toBe(lang);
    expect(documentStub.cookie).toContain(`laplapla_lang=${lang}`);
  });
});
