import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getMobileHueDarkness,
  mobileBrightnessToDarkness,
} from "@/lib/dogLessonMobileColor";

const lessonSource = readFileSync("pages/dog/lessons/[slug].tsx", "utf8");
const lessonCss = readFileSync("styles/DogLessons.css", "utf8");

describe("dog lesson mobile UX", () => {
  it("keeps black until an explicit hue selection, then makes that hue usable", () => {
    expect(getMobileHueDarkness({ currentDarkness: 100, hasChosenHue: false })).toBe(35);
    expect(getMobileHueDarkness({ currentDarkness: 82, hasChosenHue: true })).toBe(82);
    expect(mobileBrightnessToDarkness(65)).toBe(35);
  });

  it("keeps all artwork layers inside one transformed stage", () => {
    expect(lessonSource).toContain('data-testid="dog-lesson-mobile-artwork-stage"');
    for (const id of [
      "lesson-canvas-mobile",
      "color-canvas-mobile",
      "paw-overlay-canvas-mobile",
      "drawing-canvas-mobile",
    ]) {
      expect(lessonSource).toContain(`id="${id}"`);
    }
    expect(lessonCss).toMatch(/\.lesson-mobile-artwork-stage[\s\S]*transform-origin:\s*0 0/);
    expect(lessonCss).toMatch(/\.lesson-mobile-artwork-viewport\s*\{[\s\S]*inset:\s*0;[\s\S]*aspect-ratio:\s*1 \/ 1/);
    expect(lessonCss).toMatch(/\.lesson-mobile-artwork-stage\s*\{[\s\S]*width:\s*100%;[\s\S]*height:\s*100%;[\s\S]*aspect-ratio:\s*1 \/ 1/);
    expect(lessonCss).not.toMatch(/\.lesson-mobile-artwork-viewport\s*\{[\s\S]{0,180}inset:\s*38px 8px 8px/);
    expect(lessonSource).toContain("scale(${mobileCanvasViewport.scale})");
    expect(lessonCss).toMatch(/\.lesson-canvas-wrapper-mobile\s*\{[\s\S]*flex:\s*0 0 var\(--dog-mobile-canvas-size\);[\s\S]*height:\s*var\(--dog-mobile-canvas-size\)/);
    expect(lessonCss).toMatch(/\.lesson-canvas-wrapper-mobile\s*\{[\s\S]*background:\s*transparent;[\s\S]*box-shadow:\s*none/);
    expect(lessonCss).toMatch(/\.lesson-mobile-artwork-viewport\s*\{[\s\S]*background:\s*rgba\(255,255,255,0\.94\)/);
  });

  it("places mobile progression beside Next Step without changing desktop control", () => {
    expect(lessonSource).toContain('className="lesson-mobile-progress-row"');
    expect(lessonSource).toContain('className="lesson-button lesson-button-next"');
    expect(lessonSource).toContain('data-testid="dog-lesson-mobile-workspace"');
    expect(lessonSource).toContain('data-testid="dog-lesson-mobile-progress"');
    expect(lessonCss).toMatch(/\.lesson-mobile-stage\s*\{[\s\S]*overflow:\s*hidden/);
    expect(lessonCss).toMatch(/\.lesson-mobile-workspace\s*\{[\s\S]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto/);
    expect(lessonCss).toMatch(/\.lesson-mobile-progress-row\s*\{[\s\S]*justify-content:\s*space-between/);
  });

  it("exposes independent Brush and Eraser tools and removes the old toggle", () => {
    expect(lessonSource).toContain("setIsEraser(false)");
    expect(lessonSource).toContain("setIsEraser(true)");
    expect(lessonSource).toContain('setMobileSizePopover("brush")');
    expect(lessonSource).toContain('setMobileSizePopover("eraser")');
    // The legacy toggle remains only in the intentionally unchanged desktop toolbar.
    expect(lessonSource.match(/setIsEraser\(\(prev\) => !prev\)/g)).toHaveLength(1);
    const mobileBrushPanel = lessonSource.slice(
      lessonSource.indexOf('mobilePanel === "brushes"'),
      lessonSource.indexOf('mobilePanel === "coloring"'),
    );
    expect(mobileBrushPanel).not.toContain("setIsEraser((prev) => !prev)");
  });

  it("uses one shared brush size in the anchored popover and draft", () => {
    expect(lessonSource.match(/className="lesson-mobile-size-popover"/g)).toHaveLength(2);
    expect(lessonSource.match(/value=\{brushSize\}/g)?.length).toBeGreaterThanOrEqual(3);
    expect(lessonSource).toContain("document.addEventListener(\"pointerdown\", handleOutsidePointerDown)");
    expect(lessonSource).toContain("anchor?.contains(event.target as Node)");
    expect(lessonSource).toContain("document.removeEventListener(\"pointerdown\", handleOutsidePointerDown)");
    expect(lessonSource).toContain("brushSize,");
    expect(lessonSource).not.toContain("eraserSize");
  });

  it("renders artist advice as a fixed overlay instead of an inline Fibi block", () => {
    expect(lessonSource).toContain('className="lesson-mobile-artist-advice"');
    expect(lessonSource).toContain('className="lesson-mobile-overlay lesson-mobile-fibi-overlay"');
    expect(lessonSource).not.toContain('className="lesson-mobile-fibi"');
    expect(lessonSource).toContain("setMobileFibiFact(getRandomArtFact(lang))");
    expect(lessonCss).toMatch(/\.lesson-mobile-overlay\s*\{[\s\S]*position:\s*fixed;[\s\S]*inset:\s*0/);
    expect(lessonCss).toMatch(/\.lesson-mobile-overlay-close\s*\{[\s\S]*width:\s*48px;[\s\S]*height:\s*48px/);
  });

  it("keeps mobile color in an overlay and mobile Brush settings style-only", () => {
    expect(lessonSource).toContain('className="lesson-mobile-color-button"');
    expect(lessonSource).toContain('className="lesson-mobile-overlay lesson-mobile-color-overlay"');
    expect(lessonSource).toContain("setShowMobileColorSheet(true)");
    expect(lessonSource).toContain("value={brushOpacity}");
    const mobileBrushPanel = lessonSource.slice(
      lessonSource.indexOf('mobilePanel === "brushes"'),
      lessonSource.indexOf('mobilePanel === "coloring"'),
    );
    expect(mobileBrushPanel).toContain("value={brushStyle}");
    expect(mobileBrushPanel).not.toContain("lesson-mobile-color-wheel");
    expect(mobileBrushPanel).not.toContain("brushOpacity");
    expect(mobileBrushPanel).not.toContain("brushSize");
  });

  it("places contextual coloring immediately above tools without attaching it to Frank", () => {
    expect(lessonSource).toContain("lesson-mobile-colorize-cta-contextual");
    expect(lessonSource).not.toContain("lesson-mobile-colorize-cta-floating");
    expect(lessonCss).toMatch(/\.lesson-mobile-colorize-cta-contextual\s*\{[\s\S]*justify-self:\s*center/);
    expect(lessonSource).not.toContain("lesson-mobile-shell--colorizer");
    expect(lessonCss).toMatch(/\.lesson-mobile-canvas-controls\s*\{[\s\S]*display:\s*grid/);
  });

  it("keeps all final top actions in one responsive row", () => {
    expect(lessonCss).toMatch(/\.lesson-mobile-action-row\s*\{[\s\S]*flex-wrap:\s*nowrap/);
    expect(lessonCss).toMatch(/\.lesson-mobile-gallery\s*\{[\s\S]*flex:\s*1 1 0;[\s\S]*min-width:\s*0/);
    expect(lessonCss).toMatch(/\.lesson-mobile-artist-advice\s*\{[\s\S]*flex:\s*1 1 0;[\s\S]*min-width:\s*0/);
    const topActions = lessonSource.slice(
      lessonSource.indexOf('className="lesson-mobile-action-row"'),
      lessonSource.indexOf('className="lesson-mobile-frank"'),
    );
    expect(topActions).toContain('className="lesson-mobile-gallery"');
    expect(topActions).toContain('className="lesson-mobile-artist-advice"');
    expect(topActions).not.toContain("isLessonComplete ?");
    expect(lessonCss).toMatch(/\.lesson-mobile-gallery\s*\{[\s\S]*font-family:\s*var\(--font-nunito\)[\s\S]*font-size:\s*clamp\(0\.8rem, 3\.2vw, 0\.95rem\)/);
    expect(lessonCss).toMatch(/\.lesson-mobile-artist-advice\s*\{[\s\S]*font-family:\s*var\(--font-nunito\)[\s\S]*font-size:\s*clamp\(0\.8rem, 3\.2vw, 0\.95rem\)/);
  });

  it("uses one typography system for Colorize and Next/Repeat", () => {
    expect(lessonCss).toMatch(/\.lesson-mobile-progress-next,\s*\.lesson-mobile-colorize-cta\s*\{[\s\S]*font-family:\s*var\(--font-nunito\)[\s\S]*font-size:\s*0\.95rem;[\s\S]*font-weight:\s*800;[\s\S]*line-height:\s*1\.2;[\s\S]*letter-spacing:\s*0\.01em/);
  });

  it("renders Fibi advice as plain card text without a nested gray bubble", () => {
    expect(lessonCss).toMatch(/\.lesson-mobile-fibi-card \.lesson-mobile-fibi-bubble\s*\{[\s\S]*background:\s*transparent;[\s\S]*box-shadow:\s*none/);
  });

  it("keeps viewport gestures out of special modes and artwork persistence", () => {
    expect(lessonSource).toContain('animationMode === "puzzle"');
    expect(lessonSource).toContain('animationMode === "replay"');
    expect(lessonSource).toContain("cancelActiveDrawingForViewportRef.current?.()");
    const draftType = lessonSource.slice(
      lessonSource.indexOf("type DogLessonDraft"),
      lessonSource.indexOf("function getDogLessonDraftKey"),
    );
    expect(draftType).not.toContain("mobileCanvasViewport");
    expect(draftType).toContain("version: 1");
  });

  it("uses readable mobile-only typography and 44px history targets", () => {
    expect(lessonCss).toMatch(/\.lesson-mobile-frank-bubble,[\s\S]*font-family:\s*var\(--font-nunito\)/);
    expect(lessonCss).toMatch(/\.lesson-mobile-tool-button,[\s\S]*width:\s*44px;[\s\S]*height:\s*44px;/);
  });

  it("has a reopenable first-run guide and all supported locales", () => {
    expect(lessonSource).toContain("dog-lesson-onboarding:v1:");
    expect(lessonSource).toContain("setShowMobileOnboarding(true)");
    for (const locale of ["ru", "en", "he"]) {
      const source = readFileSync(`i18n/${locale}.ts`, "utf8");
      expect(source).toContain("manualTitle:");
      expect(source).toContain("manualPuzzleText:");
      expect(source).toContain("artistAdvice:");
      expect(source).toContain("chooseColor:");
      expect(source).toContain("closeColorMenu:");
    }
  });
});
