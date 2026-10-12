import { describe, expect, it, vi } from "vitest";
import {
  advanceStarNavigation,
  findStarNavigationTarget,
  getNavigationPathData,
  getStarMap,
  normalizeStarNavigationTarget,
  projectMarkerCenter,
} from "@/components/Raccoons/quests/quest-1/sail/starNavigation";
import { getStarNavigationUi, getStarRouteDialogs } from "@/components/Raccoons/quests/quest-1/i18n/dialogs";
import { getStarNavigationVideoEmbedUrl, getStarNavigationVideoId } from "@/components/Raccoons/quests/quest-1/sail/starNavigationVideos";
import { getInformationalStarId, getInformationalStarIdAtPoint } from "@/components/Raccoons/quests/quest-1/sail/starNavigationInfo";
import { formatLocalizedStarFactText } from "@/utils/starInfo";

const centers = [{ x: 349, y: 86 }, { x: 359, y: 117.998 }, { x: 400, y: 260 }];

describe("Svalbard star navigation", () => {
  it.each([
    ["Merak", "merak"], ["Merak-Star", "merak"],
    ["Dubhe", "dubhe"], ["Dubhe-Star", "dubhe"],
    ["Polaris", "polaris"], ["Polar-Star", "polaris"],
  ] as const)("accepts marker or label %s", (id, target) => {
    expect(normalizeStarNavigationTarget(id)).toBe(target);
  });

  it("recognizes labels through their generated child paths and groups", () => {
    expect(findStarNavigationTarget(["Vector_302", "mask77_0_1", "Merak"])).toBe("merak");
    expect(findStarNavigationTarget(["Vector_224", "Dubhe"])).toBe("dubhe");
    expect(findStarNavigationTarget(["text", "Polaris"])).toBe("polaris");
  });

  it.each([
    [["phecda"], "Fekda"],
    [["Vector_302", "Fekda"], "Fekda"],
    [["text", "Megrez"], "Megrez"],
    [["alioth"], "Alioth"],
    [["Kochab1"], "Kochab"],
    [["Vega"], "Vega"],
  ])("resolves ordinary marker and label hits without changing the route", (ids, expected) => {
    expect(getInformationalStarId(ids)).toBe(expected);
    for (const phase of ["find_merak", "find_dubhe", "find_polaris"] as const) {
      expect(advanceStarNavigation(phase, findStarNavigationTarget(ids))).toBe(phase);
    }
  });

  it("keeps game stars and missing IDs out of informational clicks", () => {
    expect(getInformationalStarId(["Merak-Star", "merak"])).toBeNull();
    expect(getInformationalStarId(["Dubhe"])).toBeNull();
    expect(getInformationalStarId(["Polar-Star"])).toBeNull();
    expect(getInformationalStarId(["Vector_missing"])).toBeNull();
  });

  it("finds a marker beneath decorative SVG paths at the clicked point", () => {
    const host = { id: "", parentElement: null, contains: (hit: { parentElement: unknown }) => {
      let current: typeof hit | null = hit;
      while (current) {
        if (current === host) return true;
        current = current.parentElement as typeof hit | null;
      }
      return false;
    } };
    const decoration = { id: "Vector_1890", parentElement: host };
    const marker = { id: "Kochab1", parentElement: host };
    vi.stubGlobal("document", { elementsFromPoint: () => [decoration, marker] });
    try {
      expect(getInformationalStarIdAtPoint(host as unknown as Element, 50, 60)).toBe("Kochab");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("uses the selected ordinary star's existing fact in every locale", () => {
    for (const locale of ["ru", "en", "he"] as const) {
      for (const id of ["Fekda", "Kochab", "Vega"]) {
        expect(getInformationalStarId([id])).toBe(id);
        expect(formatLocalizedStarFactText(id, locale)).toBeTruthy();
      }
    }
    expect(formatLocalizedStarFactText("Fekda", "ru")).toContain("Фекда");
    expect(formatLocalizedStarFactText("Fekda", "en")).toContain("Phecda");
    expect(formatLocalizedStarFactText("Fekda", "he")).toContain("פקדה");
  });

  it("advances only on the correct selection and never enters a drawing phase", () => {
    expect(advanceStarNavigation("find_merak", "dubhe")).toBe("find_merak");
    expect(advanceStarNavigation("find_merak", "merak")).toBe("find_dubhe");
    expect(advanceStarNavigation("find_dubhe", "merak")).toBe("find_dubhe");
    expect(advanceStarNavigation("find_dubhe", "dubhe")).toBe("find_polaris");
    expect(advanceStarNavigation("find_polaris", "dubhe")).toBe("find_polaris");
    expect(advanceStarNavigation("find_polaris", "polaris")).toBe("completed");
  });

  it("adds each automatic segment at the exact SVG marker center", () => {
    expect(getNavigationPathData(centers, "find_merak")).toBe("");
    expect(getNavigationPathData(centers, "find_dubhe")).toBe("");
    expect(getNavigationPathData(centers, "find_polaris")).toBe("M 349 86 L 359 117.998");
    expect(getNavigationPathData(centers, "completed")).toBe("M 349 86 L 359 117.998 L 400 260");
  });

  it("converts nested SVG transforms into root coordinates across scaling and RTL reflection", () => {
    const center = { x: 359, y: 117.998 };
    const local = { a: 1.56373, b: 0, c: 0, d: 1.56373, e: -258.392, f: -50.6949 };
    const expected = { x: local.a * center.x + local.e, y: local.d * center.y + local.f };
    for (const root of [
      { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      { a: 0.45, b: 0, c: 0, d: 0.45, e: 18, f: 130 },
      { a: 2, b: 0, c: 0, d: 2, e: 180, f: 90 },
      { a: -1.5, b: 0, c: 0, d: 1.5, e: 1440, f: 0 },
    ]) {
      const marker = {
        a: root.a * local.a, b: 0, c: 0, d: root.d * local.d,
        e: root.a * local.e + root.e, f: root.d * local.f + root.f,
      };
      const actual = projectMarkerCenter(center, marker, root);
      expect(actual.x).toBeCloseTo(expected.x, 8);
      expect(actual.y).toBeCloseTo(expected.y, 8);
    }
  });

  it("selects the specified Russian and English assets for RU, EN and HE", () => {
    expect(getStarMap("ru")).toEqual({ source: "supabase", path: "north-stars/north-stars.svg" });
    expect(getStarMap("en")).toEqual({ source: "r2", path: "quests/quest-1/maps/north-stars-en.svg" });
    expect(getStarMap("he")).toEqual(getStarMap("en"));
  });

  it("uses localized instructions and dialogue without manual drawing prompts", () => {
    for (const locale of ["ru", "en", "he"] as const) {
      const ui = getStarNavigationUi(locale);
      expect(ui.find_merak).toBeTruthy();
      expect(ui.find_dubhe).toBeTruthy();
      expect(ui.find_polaris).toBeTruthy();
      const dialogue = getStarRouteDialogs(locale).map((step) => step.text).join(" ");
      expect(dialogue).not.toMatch(/проведи линию|соедини их|draw a line|keep drawing|המשך לצייר|חבר ביניהם/iu);
    }
    expect(getStarNavigationUi("en").find_merak).toBe("Find Merak and tap it.");
    expect(getStarNavigationUi("en").find_dubhe).toBe("Now find Dubhe and tap it.");
    expect(getStarNavigationUi("en").find_polaris).toBe("Follow the direction of the line. Find Polaris and tap it.");
  });

  it("uses the confirmed video ID for each locale", () => {
    expect(getStarNavigationVideoId("ru")).toBe("CWf0_sdJOJI");
    expect(getStarNavigationVideoId("en")).toBe("4DlNhbkPiYY");
    expect(getStarNavigationVideoId("he")).toBe("rfotY1iZ6o8");
    for (const locale of ["ru", "en", "he"] as const) {
      const url = new URL(getStarNavigationVideoEmbedUrl(locale)!);
      expect(url.origin).toBe("https://www.youtube-nocookie.com");
      expect(url.pathname).toBe(`/embed/${getStarNavigationVideoId(locale)}`);
      expect(url.searchParams.get("controls")).toBe("1");
      expect(url.searchParams.get("playsinline")).toBe("1");
      expect(url.searchParams.has("autoplay")).toBe(false);
    }
  });
});
