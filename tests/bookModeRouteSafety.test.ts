import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findExplanationModeBySegment } from "@/lib/books/shared";
import type { ExplanationMode } from "@/types/types";

const modes = [
  { id: 1, slug: "plot", title: "Plot" },
  { id: 2, slug: "main_idea", title: "Main idea" },
] as ExplanationMode[];

describe("book mode route safety", () => {
  it("continues to resolve supported modes and rejects unknown segments", () => {
    expect(findExplanationModeBySegment(modes, "plot")?.id).toBe(1);
    expect(findExplanationModeBySegment(modes, "main-idea")?.id).toBe(2);
    expect(findExplanationModeBySegment(modes, "not-a-real-mode")).toBeNull();
  });

  it("does not use is_published as a public explanation visibility criterion", () => {
    const projectRoot = path.resolve(__dirname, "..");
    const sources = [
      "pages/books/[slug].tsx",
      "pages/books/[slug]/[mode].tsx",
      "pages/api/books/explanation.ts",
    ].map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8")).join("\n");
    expect(sources).not.toMatch(/\.eq\(["']is_published["']/);
  });

  it("returns notFound when the dynamic route cannot resolve a mode", () => {
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "../pages/books/[slug]/[mode].tsx"),
      "utf8",
    );
    expect(routeSource).toMatch(/if \(!resolvedMode\) \{\s*return \{ notFound: true \};/);
  });
});
