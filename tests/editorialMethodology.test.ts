import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ABOUT_SECTIONS, dictionaries } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";

describe("editorial methodology About section", () => {
  it("is part of the shared About card and section route flow", () => {
    expect(ABOUT_SECTIONS).toContain("editorial");
    const source = fs.readFileSync(path.resolve(__dirname, "../pages/about/index.tsx"), "utf8");
    expect(source).toContain("ABOUT_SECTIONS.map");
    expect(source).not.toContain("editorial-methodology");
    expect(source).not.toContain("author-identity-section\">\n            <h2");
  });

  it.each([
    ["ru", "/about/editorial"],
    ["en", "/en/about/editorial"],
    ["he", "/he/about/editorial"],
  ] as const)("has complete localized content and route for %s", (lang, route) => {
    const copy = dictionaries[lang].about.editorial;
    expect(copy.title.trim()).not.toBe("");
    expect(copy.preview.trim()).not.toBe("");
    expect(copy.full).toContain("LapLapLa");
    expect(copy.full).toContain("juliamakhlinfiurst@gmail.com");
    expect(buildLocalizedPublicPath("/about/editorial", lang)).toBe(route);
  });
});
