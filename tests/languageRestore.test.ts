import { describe, expect, it } from "vitest";
import {
  getLanguageRestoreRedirect,
  isLanguageRestoreExcludedPath,
} from "@/lib/i18n/languageRestore";

describe("server-side language restore", () => {
  it.each([
    ["en", "/cats", "/en/cats"],
    ["he", "/cats", "/he/cats"],
    ["ru", "/cats", null],
    ["en", "/he/cats", null],
    ["he", "/en/cats", null],
  ] as const)("cookie %s and %s resolves redirect %s", (cookie, path, expected) => {
    expect(getLanguageRestoreRedirect(path, cookie)).toBe(expected);
  });

  it.each([
    "/api/dog-lesson",
    "/_next/static/chunk.js",
    "/admin/dashboard",
    "/admin-login",
    "/studio",
    "/cats/studio",
    "/cats/export",
    "/parrots/studio",
    "/caps/stories/create",
    "/install",
    "/sw.js",
    "/favicon_io/site.webmanifest",
    "/images/cat.png",
  ])("excludes system path %s", (path) => {
    expect(isLanguageRestoreExcludedPath(path)).toBe(true);
    expect(getLanguageRestoreRedirect(path, "en")).toBeNull();
  });
});
