import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdSlot from "@/components/ads/AdSlot";
import {
  AD_PLACEMENTS,
  AD_PREVIEW_ENABLED,
  ADS_ENABLED,
  isAdPlacementEligible,
  type AdPlacement,
} from "@/lib/ads/config";

describe("advertising infrastructure production safety", () => {
  it("keeps advertising and placeholders disabled by default", () => {
    expect(ADS_ENABLED).toBe(false);
    expect(AD_PREVIEW_ENABLED).toBe(false);
  });

  it("renders zero DOM for every configured placement while advertising is disabled", () => {
    for (const placement of Object.keys(AD_PLACEMENTS) as AdPlacement[]) {
      expect(renderToStaticMarkup(<AdSlot placement={placement} pageAdsEligible />)).toBe("");
    }
  });

  it("uses a default-deny placement whitelist and requires page eligibility", () => {
    expect(isAdPlacementEligible("raccoon-recipe-bottom", true)).toBe(true);
    expect(isAdPlacementEligible("raccoon-recipe-bottom", false)).toBe(false);
    expect(isAdPlacementEligible("raccoon-article-bottom", true)).toBe(false);
    expect(isAdPlacementEligible("dogs-category-bottom", true)).toBe(false);
  });

  it("contains no real publisher IDs, slot IDs, or AdSense network URLs", () => {
    const projectRoot = path.resolve(__dirname, "..");
    const sources = [
      "lib/ads/config.ts",
      "components/ads/AdSlot.tsx",
      "pages/_app.tsx",
      "pages/_document.tsx",
    ].map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8")).join("\n");

    expect(sources).not.toMatch(/ca-pub-|pub-\d+/i);
    expect(sources).not.toMatch(/googlesyndication|doubleclick|adsbygoogle\.js/i);
    expect(Object.values(AD_PLACEMENTS).every((placement) => placement.slotId === null)).toBe(true);
  });
});
