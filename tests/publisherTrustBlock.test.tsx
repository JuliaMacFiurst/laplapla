import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PublisherTrustBlock from "@/components/editorial/PublisherTrustBlock";
import {
  formatEditorialDate,
  getSafeEditorialSourceUrl,
  normalizeEditorialSources,
} from "@/lib/editorial/trust";

describe("PublisherTrustBlock", () => {
  it.each([
    ["ru", "Материал LapLapLa", "Редактура для публикации", "/author"],
    ["en", "LapLapLa material", "Edited for publication", "/en/author"],
    ["he", "תוכן של LapLapLa", "נערך לקראת פרסום", "/he/author"],
  ] as const)("renders localized publisher identity for %s", (lang, heading, label, authorPath) => {
    const markup = renderToStaticMarkup(<PublisherTrustBlock lang={lang} />);
    expect(markup).toContain(heading);
    expect(markup).toContain(label);
    expect(markup).toContain(`href="${authorPath}"`);
    expect(markup).toContain("Julia Noah Makhlin");
  });

  it("renders a real source only when provided and never creates an empty Sources heading", () => {
    const empty = renderToStaticMarkup(<PublisherTrustBlock lang="en" sources={[]} />);
    expect(empty).not.toContain(">Sources<");

    const withSource = renderToStaticMarkup(
      <PublisherTrustBlock
        lang="en"
        sources={[{ title: "Example Research", url: "https://example.org/reference", publisher: "Example Institute" }]}
      />,
    );
    expect(withSource).toContain(">Sources<");
    expect(withSource).toContain('href="https://example.org/reference"');
    expect(withSource).toContain('rel="noopener noreferrer"');
  });

  it("rejects unsafe source URLs and relies on React escaping for labels", () => {
    expect(getSafeEditorialSourceUrl("javascript:alert(1)")).toBeUndefined();
    expect(normalizeEditorialSources([{ title: "<script>alert(1)</script>", url: "javascript:alert(1)" }]))
      .toEqual([{ title: "<script>alert(1)</script>", url: undefined, publisher: undefined }]);
    const markup = renderToStaticMarkup(
      <PublisherTrustBlock lang="en" sources={normalizeEditorialSources([{ title: "<b>Source</b>" }])} />,
    );
    expect(markup).toContain("&lt;b&gt;Source&lt;/b&gt;");
    expect(markup).not.toContain("<b>Source</b>");
  });

  it("formats only valid real dates for RU, EN and HE", () => {
    const value = "2026-09-04T12:00:00.000Z";
    expect(formatEditorialDate(value, "ru")).toBe("4 сентября 2026 г.");
    expect(formatEditorialDate(value, "en")).toBe("September 4, 2026");
    expect(formatEditorialDate(value, "he")).toBe("4 בספטמבר 2026");
    expect(formatEditorialDate(null, "en")).toBeNull();
    expect(formatEditorialDate("not-a-date", "en")).toBeNull();
  });

  it("preserves Hebrew RTL semantics", () => {
    expect(renderToStaticMarkup(<PublisherTrustBlock lang="he" />)).toContain('dir="rtl"');
  });

  it.each([
    ["ru", "/about/editorial"],
    ["en", "/en/about/editorial"],
    ["he", "/he/about/editorial"],
  ] as const)("links %s trust UI to the regular localized About section", (lang, href) => {
    expect(renderToStaticMarkup(<PublisherTrustBlock lang={lang} />)).toContain(`href="${href}"`);
  });

  it("is included after recipe content without inventing recipe sources", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../pages/raccoons/kitchen/[slug].tsx"),
      "utf8",
    );
    expect(source).toContain('<PublisherTrustBlock lang={lang} updatedAt={recipe.updated_at} />');
    expect(source).not.toMatch(/PublisherTrustBlock[^>]+sources=/);
  });
});
