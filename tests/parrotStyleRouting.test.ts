import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildParrotsRouteWithoutStyle,
  buildParrotStyleHref,
  buildParrotStyleRoute,
  readParrotStyleQuery,
  resolveParrotStyleSelection,
} from "@/lib/parrots/styleRouting";

describe("Parrot style deep links", () => {
  it.each([
    ["ru", "/parrots?style=singing-dune"],
    ["en", "/en/parrots?style=singing-dune"],
    ["he", "/he/parrots?style=singing-dune"],
  ] as const)("builds the canonical %s style URL", (lang, expected) => {
    expect(buildParrotStyleHref("singing-dune", lang)).toBe(expected);
  });

  it("selects a valid URL style before and after remote styles settle", () => {
    expect(resolveParrotStyleSelection(["lofi", "singing-dune"], "singing-dune", false)).toEqual({
      styleId: "singing-dune",
      shouldNormalizeUrl: false,
    });
    expect(resolveParrotStyleSelection(["lofi", "singing-dune", "reggae"], "singing-dune", true)).toEqual({
      styleId: "singing-dune",
      shouldNormalizeUrl: false,
    });
  });

  it("waits for remote styles before treating an unknown fallback id as invalid", () => {
    expect(resolveParrotStyleSelection(["lofi"], "api-only-style", false)).toEqual({
      styleId: null,
      shouldNormalizeUrl: false,
    });
    expect(resolveParrotStyleSelection(["lofi", "api-only-style"], "api-only-style", true)).toEqual({
      styleId: "api-only-style",
      shouldNormalizeUrl: false,
    });
  });

  it("falls back safely and requests URL cleanup after an invalid style is authoritative", () => {
    expect(resolveParrotStyleSelection(["lofi", "reggae"], "deleted-style", true)).toEqual({
      styleId: "lofi",
      shouldNormalizeUrl: true,
    });
    expect(readParrotStyleQuery(["singing-dune"])).toBeNull();
  });

  it("preserves unrelated query state while changing or removing style", () => {
    expect(buildParrotStyleRoute("en", "reggae", {
      style: "lofi",
      campaign: "hub",
      filter: ["new", "featured"],
      lang: "ru",
    })).toEqual({
      pathname: "/parrots",
      query: {
        style: "reggae",
        campaign: "hub",
        filter: ["new", "featured"],
      },
    });

    expect(buildParrotsRouteWithoutStyle("he", {
      style: "missing",
      campaign: "hub",
    })).toEqual({
      pathname: "/parrots",
      query: { campaign: "hub" },
    });
  });

  it("keeps desktop and touch behavior connected to the same URL-selected active style", () => {
    const page = readFileSync(`${process.cwd()}/pages/parrots.tsx`, "utf8");
    const mobile = readFileSync(
      `${process.cwd()}/components/parrots/mobile/ParrotMobileExperience.tsx`,
      "utf8",
    );

    expect(page).toContain("readParrotStyleQuery(router.query.style)");
    expect(page).toContain("handleSelectDesktopStyle(p.id)");
    expect(page).toContain("{ locale: lang, shallow: true, scroll: false }");
    expect(page).toContain("onOpenPreset={handleOpenPresetStudio}");
    expect(page).toContain("activeStyleId={activeId}");
    expect(mobile).toContain("aria-pressed={preset.id === activeStyleId}");
  });

  it("keeps the SEO canonical path free of style query state", () => {
    const page = readFileSync(`${process.cwd()}/pages/parrots.tsx`, "utf8");
    expect(page).toContain('router.asPath.split("#")[0]?.split("?")[0]');
  });
});
