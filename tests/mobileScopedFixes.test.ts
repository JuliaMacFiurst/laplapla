import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { en } from "../i18n/en";
import { he } from "../i18n/he";
import { ru } from "../i18n/ru";

const mobileBookScreen = readFileSync(
  "components/capybara/mobile/MobileBookScreen.tsx",
  "utf8",
);
const mobileMapScreen = readFileSync(
  "components/Raccoons/MobileMapScreen.tsx",
  "utf8",
);
const seoEntityPage = readFileSync("components/SeoEntityPage.tsx", "utf8");
const worldMapCss = readFileSync("styles/WorldMap.css", "utf8");

describe("mobile scoped fixes", () => {
  it("localizes the mobile book feed slide action in every supported language", () => {
    expect(mobileBookScreen).toContain("{t.openSlides}");
    expect(mobileBookScreen).not.toContain(">Открыть слайды<");
    expect(ru.capybaras.capybaraPage.openSlides).toBe("Открыть слайды");
    expect(en.capybaras.capybaraPage.openSlides).toBe("Open slides");
    expect(he.capybaras.capybaraPage.openSlides).toBe("פתיחת השקופיות");
  });

  it("keeps the Raccoons mobile search layer and its children inside safe gutters", () => {
    expect(worldMapCss).toMatch(
      /\.raccoons-mobile-search-layer\s*\{[\s\S]*?box-sizing:\s*border-box;[\s\S]*?safe-area-inset-right[\s\S]*?safe-area-inset-left[\s\S]*?overflow-x:\s*hidden;/,
    );
    expect(worldMapCss).toMatch(
      /\.raccoons-mobile-search-panel\s*\{[\s\S]*?width:\s*min\(560px, 100%\);[\s\S]*?min-width:\s*0;[\s\S]*?box-sizing:\s*border-box;/,
    );
    expect(worldMapCss).toMatch(
      /\.raccoons-mobile-search-form\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto auto;/,
    );
    expect(worldMapCss).toMatch(
      /\.raccoons-mobile-search-form \.search-input-expanded\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?box-sizing:\s*border-box;/,
    );
  });

  it("allows Raccoons result titles to wrap without widening the mobile panel", () => {
    expect(worldMapCss).toMatch(
      /\.raccoons-mobile-search-results\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?box-sizing:\s*border-box;[\s\S]*?overflow-x:\s*hidden;/,
    );
    expect(worldMapCss).toMatch(
      /\.raccoons-mobile-search-result-card\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?white-space:\s*normal;[\s\S]*?overflow-wrap:\s*anywhere;/,
    );
  });

  it("gives the mobile Show More action dedicated, centered RTL-safe geometry", () => {
    expect(mobileMapScreen).toContain(
      'className="search-button raccoons-mobile-search-more-button"',
    );
    expect(worldMapCss).toMatch(
      /\.raccoons-mobile-search-more-button\s*\{[\s\S]*?width:\s*min\(100%, 240px\);[\s\S]*?min-height:\s*44px;[\s\S]*?height:\s*auto;/,
    );
    expect(worldMapCss).toMatch(
      /\.raccoons-mobile-search-more-button\s*\{[\s\S]*?margin-inline:\s*auto;[\s\S]*?padding-inline:\s*1\.25rem;/,
    );
  });

  it("enlarges only map entity prose and section headings on phone widths", () => {
    expect(seoEntityPage).toContain('className="seo-entity-story-prose"');
    expect(seoEntityPage).toContain('className="seo-entity-empty-copy"');
    expect(seoEntityPage).toContain('className="seo-entity-section-title"');

    const mobileTypography = worldMapCss.match(
      /@media \(max-width: 767px\) \{[\s\S]*?\.seo-entity-section-title\s*\{[\s\S]*?\n\}/,
    )?.[0];
    expect(mobileTypography).toContain(
      "font-family: var(--font-varela-round), system-ui, sans-serif",
    );
    expect(mobileTypography).toContain("font-size: 1.1875rem");
    expect(mobileTypography).toContain("line-height: 1.6");
    expect(mobileTypography).toContain("font-size: 1.55rem");
    expect(worldMapCss.slice(0, worldMapCss.indexOf("@media (max-width: 767px)")))
      .not.toContain(".seo-entity-story-prose");
  });
});
