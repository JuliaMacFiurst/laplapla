import { useEffect, useMemo, useRef, useState } from "react";
import { dictionaries, type Lang } from "@/i18n";
import {
  getSoundCase001PrintPlan,
  type QuestPageDefinition,
} from "@/lib/shop/questDocument";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { QuestPage } from "./QuestPage";
import { renderQuestPageDefinition } from "./questPageRenderers";

const A4_WIDTH_PX = 210 * 96 / 25.4;

export function clampQuestPreviewPage(index: number, pageCount: number): number {
  return Math.min(Math.max(index, 0), Math.max(pageCount - 1, 0));
}

export function getQuestPreviewPage(
  pages: readonly QuestPageDefinition[],
  index: number,
): QuestPageDefinition | null {
  return pages[clampQuestPreviewPage(index, pages.length)] ?? null;
}

export function QuestPagePreview({ personalization, interfaceLang }: {
  personalization: QuestPersonalization;
  interfaceLang: Lang;
}) {
  const text = dictionaries[interfaceLang].shop.soundCase.builder;
  const pages = useMemo(
    () => getSoundCase001PrintPlan(personalization).pages,
    [personalization],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const selectedPage = getQuestPreviewPage(pages, selectedIndex);

  useEffect(() => {
    setSelectedIndex((current) => clampQuestPreviewPage(current, pages.length));
  }, [pages.length]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => setScale(Math.min(1, viewport.clientWidth / A4_WIDTH_PX));
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(viewport);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  if (!selectedPage) return null;
  const pageNumber = selectedIndex + 1;
  const pageLabel = text.previewPageIndicator
    .replace("{current}", String(pageNumber))
    .replace("{total}", String(pages.length));

  return (
    <section className="quest-page-preview" aria-labelledby="quest-page-preview-title">
      <header className="quest-page-preview__heading">
        <div><p>{text.previewEyebrow}</p><h3 id="quest-page-preview-title">{text.previewTitle}</h3></div>
        <output aria-live="polite">{pageLabel}</output>
      </header>

      <div
        className="quest-page-preview__viewport"
        ref={viewportRef}
      >
        <div
          className="quest-page-preview__paper"
          style={{ transform: `scale(${scale})` }}
          data-preview-page-id={selectedPage.id}
        >
          <QuestPage definition={selectedPage} locale={personalization.locale}>
            {renderQuestPageDefinition(selectedPage, {
              personalization,
              assetManifest: SOUND_CASE_001_ASSET_MANIFEST,
            })}
          </QuestPage>
        </div>
      </div>

      <nav className="quest-page-preview__navigation" aria-label={text.previewNavigationLabel}>
        <button type="button" disabled={selectedIndex === 0} onClick={() => setSelectedIndex((current) => clampQuestPreviewPage(current - 1, pages.length))}>{text.previewPrevious}</button>
        <ol className="quest-page-preview__pages" aria-label={text.previewPageListLabel}>
          {pages.map((page, index) => (
            <li key={page.id}>
              <button
                className="quest-page-preview__page-button"
                type="button"
                aria-label={text.previewOpenPage.replace("{page}", String(index + 1))}
                aria-current={index === selectedIndex ? "page" : undefined}
                onClick={() => setSelectedIndex(index)}
              >
                {index + 1}
              </button>
            </li>
          ))}
        </ol>
        <button type="button" disabled={selectedIndex === pages.length - 1} onClick={() => setSelectedIndex((current) => clampQuestPreviewPage(current + 1, pages.length))}>{text.previewNext}</button>
      </nav>
      <p className="quest-page-preview__note">{text.previewNote}</p>
    </section>
  );
}
