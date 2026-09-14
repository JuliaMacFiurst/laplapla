import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { en } from "../i18n/en";
import { he } from "../i18n/he";
import { ru } from "../i18n/ru";
import { dictionaries } from "../i18n";

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

  it("keeps localized Raccoons onboarding content in SSR and initial hydration", () => {
    expect(mobileMapScreen).toContain("useState(true)");
    expect(mobileMapScreen).toContain('className="raccoons-mobile-semantic-header raccoons-mobile-onboarding"');
    expect(mobileMapScreen).toContain("<h1>{t.page.title}</h1>");
    expect(mobileMapScreen).toContain("t.onboarding.steps.map");
    expect(mobileMapScreen).toContain("<p>{step.body}</p>");
    expect(mobileMapScreen).toContain('dir={lang === "he" ? "rtl" : "ltr"}');

    for (const dictionary of [ru, en, he]) {
      expect(dictionary.raccoons.page.title.trim().length).toBeGreaterThan(0);
      expect(dictionary.raccoons.onboarding.close.trim().length).toBeGreaterThan(0);
      expect(dictionary.raccoons.onboarding.reopen.trim().length).toBeGreaterThan(0);
      expect(dictionary.raccoons.onboarding.steps).toHaveLength(3);
      for (const step of dictionary.raccoons.onboarding.steps) {
        expect(step.title.trim().length).toBeGreaterThan(5);
        expect(step.body.trim().length).toBeGreaterThan(50);
      }
    }
    for (const lang of ["ru", "en", "he"] as const) {
      expect(dictionaries[lang].raccoons.onboarding.close.trim().length).toBeGreaterThan(0);
    }
  });

  it("preserves map controls and keeps the onboarding as a non-layout overlay", () => {
    expect(mobileMapScreen).toContain("<MapWrapper");
    expect(mobileMapScreen).toContain('className="raccoons-mobile-floating-controls"');
    expect(mobileMapScreen).toContain('className="raccoons-mobile-bottom-controls"');
    expect(mobileMapScreen).toContain('role="tablist"');
    expect(worldMapCss).toMatch(
      /\.raccoons-mobile-semantic-header\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?pointer-events:\s*auto;/,
    );
    const semanticHeaderRule = worldMapCss.match(
      /\.raccoons-mobile-semantic-header\s*\{([^}]*)\}/,
    )?.[1] ?? "";
    expect(semanticHeaderRule).not.toMatch(
      /(?:display:\s*none|visibility:\s*hidden|opacity:\s*0)/,
    );
  });

  it("supports three carousel states, touch swipe, explicit close and reopen", () => {
    expect(mobileMapScreen).toContain("ONBOARDING_SWIPE_THRESHOLD");
    expect(mobileMapScreen).toContain("handleOnboardingTouchStart");
    expect(mobileMapScreen).toContain("handleOnboardingTouchEnd");
    expect(mobileMapScreen).toContain("Math.min(current + 1");
    expect(mobileMapScreen).toContain("Math.max(current - 1");
    expect(mobileMapScreen).toContain("closeOnboarding");
    expect(mobileMapScreen).toContain("reopenOnboarding");
    expect(mobileMapScreen).toContain("window.sessionStorage.setItem");
    expect(mobileMapScreen).toContain("window.sessionStorage.removeItem");
    expect(mobileMapScreen).toContain('className="raccoons-mobile-onboarding-reopen"');
    expect(worldMapCss).toMatch(
      /\.raccoons-mobile-onboarding-reopen\s*\{[\s\S]*?inset-inline-end:/,
    );
    expect(worldMapCss).toMatch(
      /\.raccoons-mobile-onboarding-close\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/,
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

  it("uses the readable mobile prose metrics on desktop without enlarging supporting UI", () => {
    expect(seoEntityPage).toContain('className="seo-entity-story-prose"');
    expect(seoEntityPage).toContain('className="seo-entity-empty-copy"');
    expect(seoEntityPage).toContain('className="seo-entity-section-title"');

    const proseTypography = worldMapCss.match(
      /\.seo-entity-story-prose\s*\{([^}]*)\}/,
    )?.[1] ?? "";
    expect(proseTypography).toContain(
      "font-family: var(--font-varela-round), system-ui, sans-serif",
    );
    expect(proseTypography).toContain("font-size: 1.1rem");
    expect(proseTypography).toContain("line-height: 1.6");

    const mobileTypography = worldMapCss.match(
      /@media \(max-width: 767px\) \{[\s\S]*?\.seo-entity-section-title\s*\{[\s\S]*?\n\}/,
    )?.[0] ?? "";
    expect(mobileTypography).toContain("font-size: 1.55rem");
    expect(worldMapCss).not.toMatch(/\.seo-entity-caption[^}]*font-size:\s*1\.1875rem/);
  });
});
