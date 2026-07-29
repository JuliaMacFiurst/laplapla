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

  it("escapes script-breaking characters in JSON-LD", () => {
    const serialized = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c");
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
