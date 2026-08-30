import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/local", () => ({
  default: () => ({ className: "test-font", style: { fontFamily: "test" } }),
}));

import TranslationWarning, {
  getTranslationHelpCopy,
  getTranslationWarningDismissLabel,
  reduceTranslationWarningUi,
  toggleTranslationHelp,
} from "@/components/TranslationWarning";
import MobileSlideshowViewer, {
  runSingleFlightAction,
} from "@/components/studio/mobile/MobileSlideshowViewer";
import { getContentTranslationMetadata } from "@/lib/contentTranslationMetadata";
import { buildMapTextPageHref } from "@/lib/mapEntityRouting";

describe("translation warning help disclosure", () => {
  it("renders the English disclosure collapsed for a Russian fallback", () => {
    const markup = renderToStaticMarkup(
      <TranslationWarning
        lang="en"
        translation={getContentTranslationMetadata("en", false)}
      />,
    );

    expect(markup).toContain("How to translate");
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-label="Dismiss translation notice"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("Chrome / Android:");
  });

  it("toggles the disclosure open and closed", () => {
    expect(toggleTranslationHelp(false)).toBe(true);
    expect(toggleTranslationHelp(true)).toBe(false);
  });

  it("dismisses the complete notice, including expanded instructions", () => {
    const expanded = reduceTranslationWarningUi(
      { expanded: false, dismissed: false },
      "toggle-help",
    );
    const dismissed = reduceTranslationWarningUi(expanded, "dismiss");

    expect(expanded).toEqual({ expanded: true, dismissed: false });
    expect(dismissed).toEqual({ expanded: false, dismissed: true });
    expect(readFileSync("components/TranslationWarning.tsx", "utf8"))
      .toContain('onClick={() => dispatch("dismiss")}');
  });

  it("keeps dismissal local to each warning instance", () => {
    const culture = reduceTranslationWarningUi(
      { expanded: false, dismissed: false },
      "dismiss",
    );
    const food = { expanded: false, dismissed: false };

    expect(culture.dismissed).toBe(true);
    expect(food.dismissed).toBe(false);

    const markup = renderToStaticMarkup(
      <>
        <TranslationWarning
          lang="en"
          translation={getContentTranslationMetadata("en", false)}
        />
        <TranslationWarning
          lang="en"
          translation={getContentTranslationMetadata("en", false)}
        />
      </>,
    );
    expect(markup.match(/aria-label="Dismiss translation notice"/g)).toHaveLength(2);
  });

  it("provides Hebrew UI copy", () => {
    const markup = renderToStaticMarkup(
      <TranslationWarning
        lang="he"
        translation={getContentTranslationMetadata("he", false)}
      />,
    );

    expect(markup).toContain(getTranslationHelpCopy("he").show);
    expect(markup).toContain(`aria-label="${getTranslationWarningDismissLabel("he")}"`);
    expect(getTranslationHelpCopy("he").chrome).toContain("חפשו");
  });

  it("does not render help for Russian or fallback-free translations", () => {
    expect(renderToStaticMarkup(
      <TranslationWarning
        lang="ru"
        translation={getContentTranslationMetadata("ru", false)}
      />,
    )).toBe("");
    expect(renderToStaticMarkup(
      <TranslationWarning
        lang="en"
        translation={getContentTranslationMetadata("en", true)}
      />,
    )).toBe("");
  });
});

describe("map slideshow Open text action", () => {
  it("runs one navigation for two interactions while navigation is pending", async () => {
    let resolveNavigation: (() => void) | undefined;
    const navigation = new Promise<void>((resolve) => {
      resolveNavigation = resolve;
    });
    const action = vi.fn(() => navigation);
    const pendingStates: boolean[] = [];
    const lock = { current: false };

    const first = runSingleFlightAction(lock, (pending) => pendingStates.push(pending), action);
    const second = runSingleFlightAction(lock, (pending) => pendingStates.push(pending), action);

    expect(action).toHaveBeenCalledTimes(1);
    expect(await second).toBe(false);
    expect(pendingStates).toEqual([true]);

    resolveNavigation?.();
    await expect(first).resolves.toBe(true);
    expect(pendingStates).toEqual([true, false]);
  });

  it("builds the canonical localized country URL", () => {
    expect(buildMapTextPageHref("country", "Russia", "en"))
      .toBe("/en/map/country/russia");
    expect(buildMapTextPageHref("country", "Russia", "ru"))
      .toBe("/map/country/russia");
  });

  it("keeps a semantic keyboard-activatable button with an idle busy state", () => {
    const markup = renderToStaticMarkup(
      <MobileSlideshowViewer
        isOpen
        slides={[]}
        currentSlideIndex={0}
        loading={false}
        showSwipeHint={false}
        lang="en"
        loadingLabel="Loading"
        swipeHintLabel="Swipe"
        randomQuestionLabel=""
        findNewImageLabel=""
        editInStudioLabel=""
        closeLabel="Close"
        topLeftActionLabel="Open text"
        topLeftActionPendingLabel="Opening…"
        onClose={() => undefined}
        onIndexChange={() => undefined}
        onInteract={() => undefined}
        onFindNewImage={() => undefined}
        onEditInStudio={() => undefined}
        onRandomQuestion={() => undefined}
        onTopLeftAction={() => undefined}
      />,
    );

    expect(markup).toContain('<button type="button" class="mobile-slideshow-top-left-action"');
    expect(markup).toContain('aria-busy="false"');
    expect(markup).toContain("Open text");
  });

  it("keeps Open text outside the swipe gesture layer and preserves a 44px target", () => {
    const viewerSource = readFileSync(
      "components/studio/mobile/MobileSlideshowViewer.tsx",
      "utf8",
    );
    const css = readFileSync("styles/CatPage.css", "utf8");
    const actionIndex = viewerSource.indexOf("mobile-slideshow-top-left-action");
    const swipeIndex = viewerSource.indexOf("<SwipeLayer");

    expect(actionIndex).toBeGreaterThan(-1);
    expect(actionIndex).toBeLessThan(swipeIndex);
    expect(css).toMatch(/\.mobile-slideshow-top-left-action\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/);
    expect(css).toMatch(/\.mobile-slideshow-top-left-action:active/);
    expect(css).toMatch(/\.mobile-slideshow-top-left-action:focus-visible/);
  });
});
