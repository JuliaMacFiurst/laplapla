import { describe, expect, it } from "vitest";
import {
  sanitizeRichText,
  sanitizeSvg,
  serializeJsonLd,
} from "@/lib/security/sanitize";
import { getSafeRelativeRedirect } from "@/lib/security/safeRedirect";
import { isTrustedMediaUrl } from "@/lib/security/mediaUrl";
import { parseAllowedMediaProxyUrl } from "@/pages/api/media-proxy";

describe("security sanitization", () => {
  it("removes executable HTML and dangerous URLs", () => {
    const clean = sanitizeRichText(
      '<img src=x onerror=alert(1)><script>alert(1)</script><a href="javascript:alert(1)">x</a><strong>safe</strong>',
    );

    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("javascript:");
    expect(clean).not.toContain("<img");
    expect(clean).toContain("<strong>safe</strong>");
  });

  it("keeps required map geometry and strips executable SVG", () => {
    const clean = sanitizeSvg(
      '<svg viewBox="0 0 10 10" onload="alert(1)"><defs><linearGradient id="g"/></defs><path id="country" d="M0 0L1 1" fill="red"/><foreignObject><script>alert(1)</script></foreignObject></svg>',
    );

    expect(clean).toContain("<svg");
    expect(clean).toContain("<linearGradient");
    expect(clean).toContain('<path id="country"');
    expect(clean).not.toContain("onload");
    expect(clean).not.toContain("foreignObject");
    expect(clean).not.toContain("<script");
  });

  it("preserves safe map presentation styles", () => {
    const clean = sanitizeSvg(
      '<svg viewBox="0 0 10 10"><g id="biome" style="display:inline"><path id="region" class="biome" data-name="forest" d="M0 0L1 1" style="fill:#447821;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:1;visibility:visible"/></g></svg>',
    );

    expect(clean).toContain('id="biome"');
    expect(clean).toContain("display:inline");
    expect(clean).toContain('id="region"');
    expect(clean).toContain('class="biome"');
    expect(clean).toContain('data-name="forest"');
    expect(clean).toContain("fill:#447821");
    expect(clean).toContain("stroke:none");
    expect(clean).toContain("fill-rule:evenodd");
  });

  it("keeps local SVG references and rejects external CSS and use targets", () => {
    const clean = sanitizeSvg(
      '<svg><defs><linearGradient id="safe"/></defs><path id="local" fill="url(#safe)"/><path id="external" fill="url(https://evil.example/x)" stroke="javascript:alert(1)"/><use href="#safe"/><use href="https://evil.example/icon.svg#x"/><path onload="alert(1)"/><foreignObject>bad</foreignObject><style>.x{fill:url(https://evil.example/x)}</style></svg>',
    );

    expect(clean).toContain('fill="url(#safe)"');
    expect(clean).toContain('<use href="#safe"></use>');
    expect(clean).not.toContain("evil.example");
    expect(clean).not.toContain("onload");
    expect(clean).not.toContain("foreignObject");
    expect(clean).not.toContain("<style");
  });

  it("removes unsafe inline SVG CSS while retaining a safe fallback", () => {
    const clean = sanitizeSvg(
      '<svg><path id="x" style="fill:url(https://evil.example/x);stroke:#1684ad;behavior:url(javascript:alert(1));opacity:1"/></svg>',
    );

    expect(clean).not.toContain("evil.example");
    expect(clean).not.toContain("javascript:");
    expect(clean).not.toContain("behavior");
    expect(clean).toContain("stroke:#1684ad");
    expect(clean).toContain("opacity:1");
  });

  it("escapes script-breaking characters in JSON-LD", () => {
    const serialized = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c");
  });
});

describe("SVG map regression coverage", () => {
  it("preserves countries map identifiers and interaction classes", () => {
    const clean = sanitizeSvg(
      '<svg viewBox="0 0 100 50"><path id="FR" class="country" data-name="France" d="M0 0L10 0L10 10Z" stroke="#999" stroke-width="1"/></svg>',
    );

    expect(clean).toContain('id="FR"');
    expect(clean).toContain('class="country"');
    expect(clean).toContain('data-name="France"');
    expect(clean).toContain('stroke="#999"');
  });

  it("preserves rivers map strokes and fill none", () => {
    const clean = sanitizeSvg(
      '<svg><path id="amazon" class="river" d="M0 0L10 10" fill="none" stroke="#00BCD4" stroke-width="1"/></svg>',
    );

    expect(clean).toContain('class="river"');
    expect(clean).toContain('fill="none"');
    expect(clean).toContain('stroke="#00BCD4"');
  });

  it("preserves relief gradients and local paint references", () => {
    const clean = sanitizeSvg(
      '<svg><defs><linearGradient id="mountain"><stop offset="0" stop-color="#fff099"/><stop offset="1" stop-color="#228b22"/></linearGradient></defs><path id="ridge" d="M0 0L10 10" fill="url(#mountain)"/></svg>',
    );

    expect(clean).toContain('<linearGradient id="mountain">');
    expect(clean).toContain('stop-color="#fff099"');
    expect(clean).toContain('fill="url(#mountain)"');
  });

  it("preserves animals map palette and region identifiers", () => {
    const clean = sanitizeSvg(
      '<svg><g id="forest-layer" style="display:inline"><path id="east-deccan" data-name="East Deccan" d="M0 0L10 10" style="fill:#447821;fill-opacity:1;fill-rule:evenodd;stroke:none;visibility:visible"/></g></svg>',
    );

    expect(clean).toContain('id="east-deccan"');
    expect(clean).toContain('data-name="East Deccan"');
    expect(clean).toContain("fill:#447821");
    expect(clean).not.toContain("fill:#000000");
  });
});

describe("safe OAuth redirect policy", () => {
  it.each([
    ["/raccoons", "/raccoons"],
    ["/en/raccoons?screen=flags", "/en/raccoons?screen=flags"],
    ["", "/fallback"],
    ["https://evil.example", "/fallback"],
    ["//evil.example/path", "/fallback"],
    ["%2F%2Fevil.example", "/fallback"],
    ["javascript:alert(1)", "/fallback"],
    ["/\\evil.example", "/fallback"],
  ])("normalizes %s", (value, expected) => {
    expect(getSafeRelativeRedirect(value, "/fallback")).toBe(expected);
  });
});

describe("external media URL policy", () => {
  it("allows required trusted HTTPS media", () => {
    expect(isTrustedMediaUrl("https://images.pexels.com/photos/1/example.jpeg")).toBe(true);
    expect(isTrustedMediaUrl("/supabase-storage/map-data/example.webp")).toBe(true);
  });

  it.each([
    "http://images.pexels.com/example.jpeg",
    "https://evil.example/example.jpeg",
    "file:///etc/passwd",
    "http://127.0.0.1/private",
    "http://169.254.169.254/latest/meta-data",
    "/supabase-storage/../private/file",
  ])("blocks untrusted or private URL %s", (url) => {
    expect(isTrustedMediaUrl(url)).toBe(false);
  });

  it("restricts the server media proxy allowlist", () => {
    expect(parseAllowedMediaProxyUrl("https://media.giphy.com/media/x/giphy.gif").ok).toBe(true);
    expect(parseAllowedMediaProxyUrl("https://127.0.0.1/private").ok).toBe(false);
    expect(parseAllowedMediaProxyUrl("https://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(parseAllowedMediaProxyUrl("https://evil.example/media.jpg").ok).toBe(false);
  });
});
