import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("styles/CapybaraPage.css", "utf8");
const mobileStart = css.lastIndexOf("@media (max-width: 1199px)");
const mobileCss = css.slice(mobileStart);

describe("mobile Books filter scrolling", () => {
  it("bounds the modal to the dynamic viewport and safe area", () => {
    expect(mobileCss).toMatch(/\.search-overlay\s*{[^}]*height:\s*100dvh;[^}]*max-height:\s*100dvh;[^}]*overflow:\s*hidden;/s);
    expect(mobileCss).toMatch(/\.search-overlay\s*{[^}]*env\(safe-area-inset-bottom\)/s);
  });

  it("creates one explicit scroll owner for Books filter content", () => {
    expect(mobileCss).toMatch(/\.search-overlay \.book-search-filter-panel \.multi-filter-panel-content-inner\s*{[^}]*overflow-y:\s*auto;/s);
    expect(mobileCss).toMatch(/\.search-overlay \.book-search-filter-panel \.multi-filter-panel-content-inner\s*{[^}]*-webkit-overflow-scrolling:\s*touch;/s);
    expect(mobileCss).toMatch(/\.search-overlay \.book-search-filter-panel \.multi-filter-panel-content-inner\s*{[^}]*overscroll-behavior-y:\s*contain;/s);
  });

  it("keeps the flex/grid ancestor chain shrinkable instead of clipping the last group", () => {
    expect(mobileCss).toMatch(/\.search-overlay-panel\s*{[^}]*height:\s*100%;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s);
    expect(mobileCss).toMatch(/\.search-overlay-card\s*{[^}]*height:\s*100%;[^}]*min-height:\s*0;[^}]*display:\s*flex;/s);
    expect(mobileCss).toMatch(/\.search-overlay \.book-search-filter-panel \.multi-filter-panel-content-expanded\s*{[^}]*min-height:\s*0;[^}]*flex:\s*1 1 auto;/s);
  });

  it("leaves room after the final chip above the safe-area edge", () => {
    expect(mobileCss).toMatch(/\.multi-filter-panel-content-inner\s*{[^}]*padding-bottom:\s*max\(0\.5rem, env\(safe-area-inset-bottom\)\);/s);
  });

  it("is mobile-only, Books-specific, and does not change Cats filters", () => {
    expect(mobileStart).toBeGreaterThan(0);
    expect(mobileCss).not.toContain(".cats-category-panel .multi-filter-panel-content-inner");
    expect(css.slice(0, mobileStart)).not.toContain(".search-overlay .book-search-filter-panel .multi-filter-panel-content-inner");
  });
});
