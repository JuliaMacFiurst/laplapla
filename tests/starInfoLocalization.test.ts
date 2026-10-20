import { describe, expect, it } from "vitest";
import {
  starInfoList,
  getLocalizedStarName,
  getLocalizedStarDescription,
  formatLocalizedStarFact,
  formatLocalizedStarFactText,
  findStarInfo,
  type StarLocale,
} from "@/utils/starInfo";
import {
  getStarRouteDialogs,
  relocalizeStarDialogueQueue,
} from "@/components/Raccoons/quests/quest-1/i18n/dialogs";

const EXPECTED_IDS = [
  "Grumium", "Cepheus", "bootes", "Alfirk", "Lira", "Sadalmelik", "Aquila", "Dubhe",
  "Merak-Star", "Fekda", "Megrez", "Muscida", "Kochab", "aquila", "Elnath", "Cygnis",
  "Pisces", "Sagitta", "alioth", "dubhe", "Kochab", "phecda", "merak", "Vulpencula",
  "Vulpecula", "Anser", "Rukbah", "Taurus", "Castor", "Cepheus", "Draco", "Gemini",
  "Hercules", "Lacerta", "Lacerta_dup", "Pisces", "Pegasus", "Perseus", "Lyra_dup",
  "Aquila", "Cygnus", "Triangulum", "Vega", "Capella", "Altair", "Aldebaran", "Pollux",
  "Mirfak", "Menkalinan", "Polaris", "Polar-Star", "Hamal", "Alpheratz", "Algol", "Sadr",
  "Mizar", "Algecca", "Menkar", "Sheratan", "Rastaban", "Seginus", "Altais", "Albireo",
  "Errai", "Edasich", "Mothallah", "Homal", "Nekkar", "Ain", "Pegasus", "Enif", "Biham",
  "Sheliak", "Nusakan", "Electra", "Alshain", "Ran", "Delphinus", "Deneb", "Sualocin",
  "Aquarius", "Albali", "Sadachbia", "Azha", "Ancha", "Botein", "Sham", "Maasym",
  "Azelfafage", "Zibal", "Eridanus", "Fafnir", "Alresha", "Andromeda", "Mirach",
  "Almach", "Sheat", "Markab", "Algenib", "Matar", "Sadalbari", "Adhil", "Geldibeh",
  "Hercules", "Sarin", "Cancer", "Lynx", "Merak", "Alioth", "Alkaid", "Talitha",
  "polaris", "Iilduun", "Eltanin", "Menkib", "Atik", "Atlas", "Mesarthim", "Ecuuleus",
  "Equuleus",
];

const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
const HEBREW_REGEX = /[\u0590-\u05FF]/;

describe("starInfo localization", () => {
  it("contains exactly 120 items and preserves IDs and sequence", () => {
    expect(starInfoList).toHaveLength(120);
    const actualIds = starInfoList.map((item) => item.id);
    expect(actualIds).toEqual(EXPECTED_IDS);
  });

  it("provides non-empty translations for ru, en, and he across all records", () => {
    const locales: StarLocale[] = ["ru", "en", "he"];
    for (let i = 0; i < starInfoList.length; i++) {
      const item = starInfoList[i];
      expect(item.id).toBeTruthy();
      for (const loc of locales) {
        expect(typeof item.name[loc]).toBe("string");
        expect(item.name[loc].trim().length).toBeGreaterThan(0);
        expect(typeof item.description[loc]).toBe("string");
        expect(item.description[loc].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("preserves original Russian texts verbatim for known sample stars", () => {
    const polaris = starInfoList.find((s) => s.id === "Polaris");
    expect(polaris?.name.ru).toBe("Полярная");
    expect(polaris?.description.ru).toBe(
      "Полярная — главная путеводная звезда северного полушария; всегда показывает направление на север."
    );

    const merak = starInfoList.find((s) => s.id === "Merak-Star");
    expect(merak?.name.ru).toBe("Мерак");
    expect(merak?.description.ru).toBe(
      "Мерак — ‘указательная звезда’ ковша Большой Медведицы; линия от Мерака к Дубхе указывает на Полярную."
    );
  });

  it("contains no Cyrillic characters in English or Hebrew translations", () => {
    for (const item of starInfoList) {
      expect(CYRILLIC_REGEX.test(item.name.en)).toBe(false);
      expect(CYRILLIC_REGEX.test(item.description.en)).toBe(false);
      expect(CYRILLIC_REGEX.test(item.name.he)).toBe(false);
      expect(CYRILLIC_REGEX.test(item.description.he)).toBe(false);
    }
  });

  it("contains valid Hebrew script in all Hebrew names and descriptions", () => {
    for (const item of starInfoList) {
      expect(HEBREW_REGEX.test(item.name.he)).toBe(true);
      expect(HEBREW_REGEX.test(item.description.he)).toBe(true);
    }
  });

  it("localizes Polaris and Vega correctly into EN and HE", () => {
    const polaris = findStarInfo("Polaris");
    expect(polaris?.name.en).toBe("Polaris");
    expect(polaris?.name.he).toBe("כוכב הצפון");
    expect(polaris?.description.en).toContain("Northern Hemisphere");
    expect(polaris?.description.he).toContain("חצי הכדור הצפוני");

    const vega = findStarInfo("Vega");
    expect(vega?.name.en).toBe("Vega");
    expect(vega?.name.he).toBe("וגה");
    expect(vega?.description.en).toContain("Summer Triangle");
    expect(vega?.description.he).toContain("משולש הקיץ");
  });

  it("helpers return correct localized text and fallback safely", () => {
    const dubhe = findStarInfo("Dubhe-Star");
    expect(dubhe).toBeDefined();
    expect(getLocalizedStarName(dubhe, "ru")).toBe("Дубхе");
    expect(getLocalizedStarName(dubhe, "en")).toBe("Dubhe");
    expect(getLocalizedStarName(dubhe, "he")).toBe("דובהה");

    expect(getLocalizedStarDescription(dubhe, "ru")).toContain("Большой Медведицы");
    expect(getLocalizedStarDescription(dubhe, "en")).toContain("Big Dipper");
    expect(getLocalizedStarDescription(dubhe, "he")).toContain("הדובה הגדולה");

    expect(getLocalizedStarName(null, "en")).toBe("");
    expect(getLocalizedStarDescription(undefined, "he")).toBe("");
  });

  it("formats the same selected star for Logan in all three locales", () => {
    expect(formatLocalizedStarFact("Polar-Star", "ru", "Логан")).toContain(
      "Полярная",
    );
    expect(formatLocalizedStarFact("Polar-Star", "en", "Logan")).toContain(
      "Polaris",
    );
    expect(formatLocalizedStarFact("Polar-Star", "he", "לוגן")).toContain(
      "כוכב הצפון",
    );
    expect(formatLocalizedStarFactText("Merak-Star", "en")).toMatch(/^Merak\./);
  });

  it("supports special and case-insensitive IDs without changing stored IDs", () => {
    expect(findStarInfo("Dubhe-Star")?.id).toBe("Dubhe");
    expect(findStarInfo("POLAR-STAR")?.id).toBe("Polar-Star");
    expect(findStarInfo("BOOTES")?.id).toBe("bootes");
    expect(findStarInfo("missing-star")).toBeUndefined();
    expect(formatLocalizedStarFact("missing-star", "he", "לוגן")).toBeNull();
  });

  it("relocalizes the current Logan dialogue without resetting its semantic ID", () => {
    const current = getStarRouteDialogs("ru").filter((dialog) => dialog.id === "merak_1");
    const english = relocalizeStarDialogueQueue(current, "en", "Merak-Star");
    const hebrew = relocalizeStarDialogueQueue(current, "he", "Merak-Star");

    expect(english[0]?.id).toBe("merak_1");
    expect(english[0]?.text).toContain("Merak");
    expect(english[0]?.text).not.toMatch(/[\u0400-\u04FF]/);
    expect(hebrew[0]?.id).toBe("merak_1");
    expect(hebrew[0]?.text).toContain("מראק");
    expect(hebrew[0]?.text).not.toMatch(/[\u0400-\u04FF]/);
  });
});
