import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SingingDunesArticle } from "@/components/quests/sound-case-001/SingingDunesArticle";
import {
  getSingingDunesArticleCopy,
  SINGING_DUNES_ARTICLE_ROUTE,
  SINGING_DUNE_SOURCES,
  SINGING_DUNE_STICKERS,
} from "@/lib/quests/singingDunesArticle";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";

const DUNE_AUDIO_URL = "https://media.laplapla.com/quests/sound-case-001/stage-01-sound-crocodile/unknown-sound/audio/unknown-sound-001-master.mp3";

describe("Singing Dunes article", () => {
  it("uses the semantic Sound Case route and the real centralized R2 sticker set", () => {
    expect(SINGING_DUNES_ARTICLE_ROUTE).toBe("/quests/sound-case-001/singing-dunes");
    expect(SINGING_DUNE_STICKERS).toHaveLength(24);
    expect(SINGING_DUNE_STICKERS.every(({ url }) => url.startsWith("https://media.laplapla.com/stickers/singing-dune-stickers/"))).toBe(true);
    expect(SINGING_DUNE_STICKERS.map(({ fileName }) => fileName)).toContain("singing-dune-stickers-sticker-24.webp");
  });

  it.each(["ru", "en", "he"] as const)("renders the full illustrated %s article", (lang) => {
    const text = getSingingDunesArticleCopy(lang);
    const html = renderToStaticMarkup(<SingingDunesArticle lang={lang} />);
    expect(html).toContain(`lang="${lang}"`);
    expect(html).toContain(`dir="${lang === "he" ? "rtl" : "ltr"}"`);
    expect(html).toContain(text.title);
    expect(html).toContain(text.boom);
    expect(html).toContain(text.audio.title);
    expect(html).toContain(text.audio.note);
    expect(html).toContain(text.audio.caption);
    expect(html).toContain(`aria-label="${text.audio.playLabel}"`);
    expect(html).toContain(`src="${DUNE_AUDIO_URL}"`);
    expect(html).toContain('preload="metadata"');
    expect(html).not.toContain(" controls");
    for (const section of text.sections) {
      expect(html).toContain(section.title);
      expect(html).toContain(`id="${section.id}"`);
    }
    expect(html).toContain(text.chainTitle);
    expect(html).toContain(text.readMore);
    expect(html.match(/target="_blank"/g)).toHaveLength(SINGING_DUNE_SOURCES.length);
    expect(html).toContain("/quests/sound-case-001/hub");
  });

  it("reuses the typed Stage 01 recording asset", () => {
    expect(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-1-unknown-recording"]).toEqual({
      id: "stage-1-unknown-recording",
      kind: "audio",
      source: { status: "external", url: DUNE_AUDIO_URL },
    });
  });

  it("keeps the main copy unrotated and contains mobile overflow", () => {
    const css = readFileSync(`${process.cwd()}/styles/SingingDunesArticle.css`, "utf8");
    expect(css).toContain("overflow-x: hidden");
    expect(css).not.toMatch(/singing-dunes-article__copy[^}]*transform:\s*rotate/s);
    expect(css).toContain("@media (max-width: 700px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".singing-dunes-audio.is-playing .singing-dunes-audio__wave i");
  });
});
