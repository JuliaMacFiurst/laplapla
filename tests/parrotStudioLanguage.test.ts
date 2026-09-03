import { afterEach, describe, expect, it } from "vitest";
import { getHardcodedParrotStyleRecordById } from "@/lib/parrots/catalog";
import {
  prepareParrotStudioLanguageSwitch,
  shouldResetParrotCompositionForStyle,
} from "@/lib/parrots/studioLanguage";
import { resolveLanguage, buildLocalizedPublicPath } from "@/lib/i18n/routing";
import {
  getParrotInstrumentDisplayLabel,
  getParrotVariantDisplayLabel,
} from "@/lib/parrots/instrumentLabels";

describe("Parrot studio language switching", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  afterEach(() => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
  });

  it.each([
    ["ru", "en"],
    ["en", "he"],
    ["he", "ru"],
    ["en", "ru"],
  ] as const)("switches from %s to %s and persists the explicit choice", (_current, next) => {
    const values = new Map<string, string>();
    const documentStub = { cookie: "" };
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: { setItem: (key: string, value: string) => values.set(key, value) } },
    });
    Object.defineProperty(globalThis, "document", { configurable: true, value: documentStub });

    const result = prepareParrotStudioLanguageSwitch(next, "house");

    expect(result.locale).toBe(next);
    expect(result.route).toEqual({ pathname: "/studio", query: { style: "house", type: "parrot" } });
    expect(values.get("laplapla_lang")).toBe(next);
    expect(documentStub.cookie).toContain(`laplapla_lang=${next}`);
  });

  it("keeps RU locale-less and prevents a saved EN/HE preference from winning again", () => {
    expect(buildLocalizedPublicPath("/he/studio", "ru")).toBe("/studio");
    expect(resolveLanguage({
      pathname: "/studio",
      routerLocale: "ru",
      cookieLang: "ru",
      storedLang: "he",
    })).toBe("ru");
  });
});

describe("Parrot instrument display labels", () => {
  it.each([
    ["pads", "Пэды", "Pads", "פאדים"],
    ["drone", "Дроны", "Drones", "צלילים מתמשכים"],
    ["keys", "Клавиши", "Keys", "קלידים"],
    ["fx", "Шумы", "Sound effects", "אפקטים קוליים"],
  ] as const)("localizes stable %s without changing its id", (id, ru, en, he) => {
    for (const [lang, expected] of [["ru", ru], ["en", en], ["he", he]] as const) {
      const ambient = getHardcodedParrotStyleRecordById(lang, "ambient");
      const loop = ambient?.loops.find((item) => item.id === id);
      expect(loop?.id).toBe(id);
      expect(loop?.label).toBe(expected);
    }
  });

  it("does not reset composition when only localized preset data changes", () => {
    expect(shouldResetParrotCompositionForStyle("house", "house")).toBe(false);
    expect(shouldResetParrotCompositionForStyle("house", "funk")).toBe(true);
  });

  it("localizes a missing translation payload fallback without changing stable keys", () => {
    expect(getParrotInstrumentDisplayLabel("en", "keys", "Клавиши")).toBe("Keys");
    expect(getParrotVariantDisplayLabel("he", "keys", "Клавиши", "Клавиши 3")).toBe("קלידים 3");
  });
});
