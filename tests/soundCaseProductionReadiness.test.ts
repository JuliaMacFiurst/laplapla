import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CORE_SITEMAP_PAGES } from "@/lib/sitemapPolicy";
import { buildCanonicalUrl, buildHreflangLinks } from "@/lib/i18n/routing";
import { SINGING_DUNES_ARTICLE_ROUTE, SINGING_DUNE_ARTICLE_COVER_URL } from "@/lib/quests/singingDunesArticle";

const ROOT = process.cwd();
const ORIGIN = "https://www.laplapla.com";
const FLOW_PAGES = [
  "pages/quests/sound-case-001/hub.tsx",
  "pages/quests/sound-case-001/solved.tsx",
  "pages/quests/sound-case-001/stage-01/unknown-sound.tsx",
  "pages/quests/sound-case-001/stage-02/clue.tsx",
  "pages/quests/sound-case-001/stage-03/equalizer.tsx",
  "pages/quests/sound-case-001/stage-04/check/[result].tsx",
  "pages/quests/sound-case-001/stage-06/sound-code.tsx",
  "pages/quests/sound-case-001/stage-07/expert-club.tsx",
  "pages/mini-games/wake-the-dune.tsx",
] as const;

describe("Sound Case #001 production readiness", () => {
  it("keeps every quest-flow page accessible but noindex", () => {
    for (const path of FLOW_PAGES) {
      const source = readFileSync(`${ROOT}/${path}`, "utf8");
      expect(source, path).toMatch(/<SEO[\s\S]*?\bnoindex\b[\s\S]*?\/?\s*>/);
      expect(source, path).toContain("noindexFollow");
    }
    expect(readFileSync(`${ROOT}/components/SEO.tsx`, "utf8")).toContain('noindexFollow ? "follow" : "nofollow"');
  });

  it("server-renders the dynamic Stage 04 result and rejects invalid result slugs", () => {
    const page = readFileSync(`${ROOT}/pages/quests/sound-case-001/stage-04/check/[result].tsx`, "utf8");
    expect(page).toContain("getServerSideProps");
    expect(page).toContain("resultSlug");
    expect(page).toContain("return { notFound: true }");
    expect(page).not.toContain("router.query.result");
  });

  it("publishes only the article—not flow or query routes—in the sitemap policy", () => {
    const paths = CORE_SITEMAP_PAGES.map(({ path }) => path);
    expect(paths).toContain(SINGING_DUNES_ARTICLE_ROUTE);
    expect(paths).not.toContain("/quests/sound-case-001/hub");
    expect(paths).not.toContain("/mini-games/wake-the-dune");
    expect(paths.some((path) => path.includes("?style="))).toBe(false);
  });

  it.each(["ru", "en", "he"] as const)("builds production article SEO URLs for %s", (lang) => {
    expect(buildCanonicalUrl(ORIGIN, SINGING_DUNES_ARTICLE_ROUTE, lang)).toMatch(
      new RegExp(`^${ORIGIN}/(?:${lang === "ru" ? "" : `${lang}/`})quests/sound-case-001/singing-dunes$`),
    );
    expect(buildHreflangLinks(ORIGIN, SINGING_DUNES_ARTICLE_ROUTE)).toHaveLength(4);
  });

  it("uses Article JSON-LD and the existing Singing Dunes cover for sharing", () => {
    const page = readFileSync(`${ROOT}/pages/quests/sound-case-001/singing-dunes.tsx`, "utf8");
    expect(page).toContain('type="article"');
    expect(page).toContain('"@type": "Article"');
    expect(page).toContain("inLanguage: lang");
    expect(page).toContain("publisher: { \"@id\": ENTITY_IDS.organization }");
    expect(page).toContain("image={SINGING_DUNE_ARTICLE_COVER_URL}");
    expect(SINGING_DUNE_ARTICLE_COVER_URL).toMatch(/^https:\/\/media\.laplapla\.com\//);
  });

  it("keeps the TWA scope global and Digital Asset Links constrained to the established app", () => {
    const manifest = JSON.parse(readFileSync(`${ROOT}/public/favicon_io/site.webmanifest`, "utf8"));
    const assetLinks = JSON.parse(readFileSync(`${ROOT}/public/.well-known/assetlinks.json`, "utf8"));
    expect(manifest).toMatchObject({ id: "/", start_url: "/", scope: "/", display: "standalone" });
    expect(assetLinks[0].target.package_name).toBe("com.laplapla.app");
    expect(assetLinks[0].target.sha256_cert_fingerprints).toHaveLength(2);
  });

  it("does not precache or runtime-cache cross-origin Sound Case audio", () => {
    const serviceWorker = readFileSync(`${ROOT}/public/sw.js`, "utf8");
    expect(serviceWorker).not.toContain("unknown-sound-001-master.mp3");
    expect(serviceWorker).not.toContain("wake-the-dune/audio");
    expect(serviceWorker).toContain("url.origin !== self.location.origin");
    expect(serviceWorker).toContain('request.mode === "navigate"');
    expect(serviceWorker).toContain("navigationNetworkFirst(request)");
  });

  it("uses TWA-safe internal links and explicit protection for external tabs", () => {
    const hub = readFileSync(`${ROOT}/components/quests/sound-case-001/SoundCaseHubScene.tsx`, "utf8");
    const article = readFileSync(`${ROOT}/components/quests/sound-case-001/SingingDunesArticle.tsx`, "utf8");
    const soundCode = readFileSync(`${ROOT}/components/quests/sound-case-001/SoundCodeScene.tsx`, "utf8");
    expect(hub).toContain("buildLocalizedPublicPath");
    expect(hub).toContain("buildParrotStyleHref");
    expect(hub).not.toContain('href="https://www.laplapla.com');
    expect(article).toContain('rel="noreferrer noopener"');
    expect(soundCode.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
  });

  it("keeps Wake The Dune fullscreen state and listeners route-local", () => {
    const game = readFileSync(`${ROOT}/components/mini-games/WakeTheDuneGame.tsx`, "utf8");
    expect(game).toContain('document.body.classList.add("wake-dune-game-active")');
    expect(game).toContain('document.body.classList.remove("wake-dune-game-active")');
    expect(game).toContain('document.removeEventListener("visibilitychange", pauseForVisibility)');
    expect(game).toContain('window.removeEventListener("pagehide", pauseForPageHide)');
    expect(game).toContain("audio.dispose()");
  });
});
