import { useEffect, useRef, useState } from "react";
import { dictionaries, type Lang } from "@/i18n";
import {
  SOUND_CASE_001_PAGES,
  getSoundCase001Stage2Pages,
  getSoundCase001Stage4Pages,
  getSoundCase001Stage5Pages,
  getPrintableQuestPages,
  type QuestPageDefinition,
  type Stage1CardBoxPageDefinition,
  type SoundCardBacksPageDefinition,
  type SoundCardsPageDefinition,
} from "@/lib/shop/questDocument";
import {
  MAX_QUEST_PARTICIPANTS,
  addQuestParticipant,
  createQuestPersonalization,
  removeQuestParticipant,
  type QuestPersonalization,
  updateQuestParticipant,
} from "@/lib/shop/questPersonalization";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { QuestDocument } from "./QuestDocument";

const LAB_LOCALES: readonly Lang[] = ["ru", "en", "he"];

const DEFAULT_FIXTURE = createQuestPersonalization("ru", {
  leadName: "Майя",
  participants: ["Ноя", "Саша"],
});

type QuestPrintLabProps = {
  initialPersonalization?: QuestPersonalization;
  initialStage?: "01" | "02" | "04" | "05";
};

export type QuestPrintLabDuplexPair = {
  pairId: SoundCardsPageDefinition["pairId"];
  sheetNumber: 1 | 2;
  frontLabel: string;
  backLabel: string;
  frontPageNumber: number;
  backPageNumber: number;
};

export function getQuestPrintLabDuplexPairs(
  pages: readonly QuestPageDefinition[],
): QuestPrintLabDuplexPair[] {
  const printablePages = getPrintableQuestPages(pages);
  const fronts = printablePages.filter(
    (page): page is SoundCardsPageDefinition => page.type === "sound-cards",
  );

  return fronts.map((front) => {
    const back = printablePages.find(
      (page): page is SoundCardBacksPageDefinition =>
        page.type === "sound-card-backs" && page.pairId === front.pairId,
    );
    if (!back) {
      throw new Error(`Missing back page for duplex pair ${front.pairId}`);
    }

    return {
      pairId: front.pairId,
      sheetNumber: front.sheetNumber,
      frontLabel: `SOUND CARDS ${front.sheetNumber}/${front.sheetCount}`,
      backLabel: `SOUND CARD BACKS ${back.sheetNumber}/${back.sheetCount}`,
      frontPageNumber: printablePages.indexOf(front) + 1,
      backPageNumber: printablePages.indexOf(back) + 1,
    };
  });
}

export function getQuestPrintLabCardBoxPage(
  pages: readonly QuestPageDefinition[],
): { definition: Stage1CardBoxPageDefinition; pageNumber: number } {
  const printablePages = getPrintableQuestPages(pages);
  const definition = printablePages.find(
    (page): page is Stage1CardBoxPageDefinition =>
      page.type === "stage-1-card-box",
  );
  if (!definition) {
    throw new Error("Missing Stage 01 card box page");
  }

  return {
    definition,
    pageNumber: printablePages.indexOf(definition) + 1,
  };
}

function requireTwoDuplexPairs(
  pairs: QuestPrintLabDuplexPair[],
): readonly [QuestPrintLabDuplexPair, QuestPrintLabDuplexPair] {
  const first = pairs[0];
  const second = pairs[1];
  if (pairs.length !== 2 || !first || !second) {
    throw new Error("Sound Case #001 Print Lab requires exactly two duplex pairs");
  }
  return [first, second];
}

const SOUND_CASE_001_DUPLEX_PAIRS = requireTwoDuplexPairs(
  getQuestPrintLabDuplexPairs(SOUND_CASE_001_PAGES),
);
const SOUND_CASE_001_CARD_BOX_PAGE = getQuestPrintLabCardBoxPage(
  SOUND_CASE_001_PAGES,
);

export function QuestPrintLab({
  initialPersonalization = DEFAULT_FIXTURE,
  initialStage = "01",
}: QuestPrintLabProps) {
  const [personalization, setPersonalization] = useState(initialPersonalization);
  const [stage, setStage] = useState<"01" | "02" | "04" | "05">(initialStage);
  const [xRayEnabled, setXRayEnabled] = useState(false);
  const [printHelpOpen, setPrintHelpOpen] = useState(false);
  const documentHostRef = useRef<HTMLDivElement>(null);
  const printGuidance =
    dictionaries[personalization.locale].shop.soundCase.soundCardBacks;
  const cardBoxGuidance =
    dictionaries[personalization.locale].shop.soundCase.cardBox;
  const stage2Guidance =
    dictionaries[personalization.locale].shop.soundCase.stage02.printHelp;
  const stage4Guidance = dictionaries[personalization.locale].shop.soundCase.stage04.print;
  const stage5Guidance = dictionaries[personalization.locale].shop.soundCase.stage05.print;
  const [firstPair, secondPair] = SOUND_CASE_001_DUPLEX_PAIRS;
  const cardPageRange = `${firstPair.frontPageNumber}–${secondPair.backPageNumber}`;
  const selectedPages = stage === "01" ? SOUND_CASE_001_PAGES
    : stage === "02" ? getSoundCase001Stage2Pages(personalization.locale)
    : stage === "04" ? getSoundCase001Stage4Pages(personalization.locale)
    : getSoundCase001Stage5Pages(personalization.locale);

  useEffect(() => {
    const host = documentHostRef.current;
    if (!host) return;

    const pages = Array.from(
      host.querySelectorAll<HTMLElement>(".quest-page-frame"),
    );
    const clearMeasurements = () => {
      for (const page of pages) {
        delete page.dataset.labOverflow;
      }
    };

    if (!xRayEnabled) {
      clearMeasurements();
      return;
    }

    const measure = () => {
      for (const page of pages) {
        const hasOverflow =
          page.scrollWidth > page.clientWidth ||
          page.scrollHeight > page.clientHeight;
        page.dataset.labOverflow = hasOverflow ? "true" : "false";
      }
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    for (const page of pages) resizeObserver?.observe(page);

    const images = Array.from(host.querySelectorAll<HTMLImageElement>("img"));
    for (const image of images) image.addEventListener("load", measure);
    window.addEventListener("resize", measure);
    const animationFrame = window.requestAnimationFrame(measure);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", measure);
      for (const image of images) image.removeEventListener("load", measure);
      resizeObserver?.disconnect();
      clearMeasurements();
    };
  }, [personalization, stage, xRayEnabled]);

  return (
    <main
      className={`quest-print-lab${xRayEnabled ? " quest-print-lab--xray" : ""}`}
      data-xray={xRayEnabled ? "on" : "off"}
    >
      <section className="quest-print-lab__toolbar" aria-label="Quest Print Lab controls">
        <header className="quest-print-lab__identity">
          <strong>Quest Print Lab</strong>
          <span>Sound Case #001</span>
        </header>

        <fieldset className="quest-print-lab__stage-picker" data-stage-selector="true">
          <legend>Выберите printable-этап</legend>
          <div>
            <button
              type="button"
              aria-label="Открыть STAGE 01 — Sound Cards"
              aria-pressed={stage === "01"}
              onClick={() => setStage("01")}
            >
              <strong>STAGE 01</strong>
              <span>SOUND CARDS</span>
            </button>
            <button
              type="button"
              aria-label="Открыть STAGE 02 — Vibrating Cards"
              aria-pressed={stage === "02"}
              onClick={() => setStage("02")}
            >
              <strong>STAGE 02</strong>
              <span>VIBRATING CARDS</span>
            </button>
            <button
              type="button"
              aria-label="Открыть STAGE 04 — Broken Rhythm"
              aria-pressed={stage === "04"}
              onClick={() => setStage("04")}
            >
              <strong>STAGE 04</strong>
              <span>BROKEN RHYTHM</span>
            </button>
            <button type="button" aria-label="Открыть STAGE 05 — Scattered Sand" aria-pressed={stage === "05"} onClick={() => setStage("05")}><strong>STAGE 05</strong><span>SCATTERED SAND</span></button>
          </div>
        </fieldset>

        <section
          className="quest-print-lab__print-help"
          dir={personalization.locale === "he" ? "rtl" : "ltr"}
        >
          <button
            type="button"
            className="quest-print-lab__print-help-toggle"
            aria-expanded={printHelpOpen}
            aria-controls="quest-print-lab-print-help-content"
            onClick={() => setPrintHelpOpen((open) => !open)}
          >
            <span>{stage === "01" ? printGuidance.printHelpTitle : stage === "02" ? stage2Guidance.title : stage === "04" ? stage4Guidance.printHelpTitle : stage5Guidance.printHelpTitle}</span>
            <span aria-hidden="true">{printHelpOpen ? "▴" : "▾"}</span>
          </button>
          <div
            id="quest-print-lab-print-help-content"
            className="quest-print-lab__print-help-content"
            hidden={!printHelpOpen}
          >
          {stage === "01" ? (
          <section className="quest-print-lab__duplex-help" aria-label={printGuidance.manualTitle}>
          <details className="quest-print-lab__duplex-scenario" data-duplex-scenario="auto">
            <summary>{printGuidance.autoTitle}</summary>
            <div className="quest-print-lab__duplex-scenario-body">
              <p>
                {printGuidance.autoPrintPrefix}{" "}
                <bdi dir="ltr">{cardPageRange}</bdi>{" "}
                {printGuidance.autoPrintSuffix}
              </p>
              <strong>{printGuidance.autoSettingsLabel}</strong>
              <ul>
                {printGuidance.autoSettings.map((setting) => (
                  <li key={setting}>{setting}</li>
                ))}
              </ul>
              <p className="quest-print-lab__duplex-result">
                {printGuidance.autoResult}
              </p>
            </div>
          </details>

          <details
            className="quest-print-lab__duplex-scenario"
            data-duplex-scenario="manual"
            open
          >
            <summary>{printGuidance.manualTitle}</summary>
            <div className="quest-print-lab__duplex-scenario-body">
              <p>{printGuidance.manualIntro}</p>
              <p className="quest-print-lab__same-sheet-warning">
                {printGuidance.notNewSheet}
              </p>

              <ol className="quest-print-lab__manual-steps">
                <li>
                  <strong>{printGuidance.stepLabel} 1</strong>
                  <span>
                    {printGuidance.manualPrintOnly}{" "}
                    <bdi dir="ltr">{printGuidance.pageLabel} {firstPair.frontPageNumber}</bdi>:{" "}
                    <bdi dir="ltr">{firstPair.frontLabel}</bdi>.
                  </span>
                </li>
                <li>
                  <strong>{printGuidance.stepLabel} 2</strong>
                  <span>{printGuidance.manualSameSheet}</span>
                  <span className="quest-print-lab__front-mark-sample">
                    <span aria-hidden="true">↑</span>{" "}
                    {printGuidance.frontTopEdge}{" "}
                    <span aria-hidden="true">↑</span>
                    <br />
                    {printGuidance.frontSideLabel}{" "}
                    <span aria-hidden="true">•</span>{" "}
                    {printGuidance.sheetLabel}{" "}
                    <bdi dir="ltr">{firstPair.sheetNumber}</bdi>
                  </span>
                  <span>{printGuidance.manualAlreadyMarked}</span>
                </li>
                <li>
                  <strong>{printGuidance.stepLabel} 3</strong>
                  <span>{printGuidance.manualReinsertWithTest}</span>
                </li>
                <li>
                  <strong>{printGuidance.stepLabel} 4</strong>
                  <span>
                    {printGuidance.manualPrintOnly}{" "}
                    <bdi dir="ltr">{printGuidance.pageLabel} {firstPair.backPageNumber}</bdi>:{" "}
                    <bdi dir="ltr">{firstPair.backLabel}</bdi>.
                  </span>
                </li>
                <li>
                  <strong>{printGuidance.stepLabel} 5</strong>
                  <span>
                    {printGuidance.manualRepeat}{" "}
                    <bdi dir="ltr">
                      {printGuidance.pageLabel} {secondPair.frontPageNumber}: {secondPair.frontLabel}
                    </bdi>{" + "}
                    <bdi dir="ltr">
                      {printGuidance.pageLabel} {secondPair.backPageNumber}: {secondPair.backLabel}
                    </bdi>.
                  </span>
                </li>
              </ol>

              <p className="quest-print-lab__feed-warning">
                {printGuidance.feedWarning}
              </p>

              <details className="quest-print-lab__printer-test">
                <summary>{printGuidance.testTitle}</summary>
                <div>
                  <p>{printGuidance.testIntro}</p>
                  <ol>
                    {printGuidance.testSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <strong>{printGuidance.testCheckLabel}</strong>
                  <ul>
                    {printGuidance.testChecks.map((check) => (
                      <li key={check}>{check}</li>
                    ))}
                  </ul>
                  <p>{printGuidance.testResult}</p>
                </div>
              </details>
            </div>
          </details>

          <aside
            className="quest-print-lab__single-sided-sheet"
            data-print-mode="single-sided"
          >
            <strong>{cardBoxGuidance.printLabGuidance}</strong>
            <span>
              {printGuidance.pageLabel}{" "}
              <bdi dir="ltr">{SOUND_CASE_001_CARD_BOX_PAGE.pageNumber}</bdi>
              {" · A4 · 100% / Actual Size"}
            </span>
            <span>{cardBoxGuidance.printNote}</span>
          </aside>
          </section>
          ) : stage === "02" ? (
            <section className="quest-print-lab__duplex-help" aria-label={stage2Guidance.title} data-stage-2-print-help="true">
              <p className="quest-print-lab__duplex-result">{stage2Guidance.summary}</p>
              <details className="quest-print-lab__duplex-scenario" data-duplex-scenario="stage-2-duplex" open>
                <summary>{stage2Guidance.duplexTitle}</summary>
                <div className="quest-print-lab__duplex-scenario-body">
                  <ol>{stage2Guidance.duplexSteps.map((step) => <li key={step}>{step}</li>)}</ol>
                </div>
              </details>
              <details className="quest-print-lab__duplex-scenario" data-duplex-scenario="stage-2-single" open>
                <summary>{stage2Guidance.singleTitle}</summary>
                <div className="quest-print-lab__duplex-scenario-body">
                  <ol>{stage2Guidance.singleSteps.map((step) => <li key={step}>{step}</li>)}</ol>
                  <strong>{stage2Guidance.actualSize}</strong>
                </div>
              </details>
            </section>
          ) : stage === "04" ? (
            <section className="quest-print-lab__duplex-help" aria-label={stage4Guidance.printHelpTitle} data-stage-4-print-help="true">
              <p className="quest-print-lab__duplex-result">{stage4Guidance.printHelpSummary}</p>
              <aside className="quest-print-lab__single-sided-sheet" data-print-mode="mixed">
                <strong>A4 · 100% / Actual Size</strong>
                <span>Pages 1/2, 3/4, 5/6, 7/8 · Flip on long edge</span>
                <span>8 PDF pages → 4 physical A4 sheets</span>
              </aside>
            </section>
          ) : <section className="quest-print-lab__duplex-help" data-stage-5-print-help="true"><p className="quest-print-lab__duplex-result">{stage5Guidance.printHelpSummary}</p><aside className="quest-print-lab__single-sided-sheet"><strong>A4 · 100% / Actual Size</strong><span>Pages 1/2: duplex cards · Page 3: single-sided box</span><span>3 PDF pages → 2 physical A4 sheets</span></aside></section>}
          </div>
        </section>

        <div className="quest-print-lab__controls">
          <fieldset className="quest-print-lab__locale">
            <legend>Locale</legend>
            <div>
              {LAB_LOCALES.map((locale) => (
                <button
                  type="button"
                  key={locale}
                  aria-pressed={personalization.locale === locale}
                  onClick={() => {
                    setPersonalization((current) => ({ ...current, locale }));
                  }}
                >
                  {locale.toUpperCase()}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="quest-print-lab__lead">
            <span>Главный исследователь</span>
            <input
              type="text"
              value={personalization.leadName}
              onChange={(event) => {
                const leadName = event.target.value;
                setPersonalization((current) => ({ ...current, leadName }));
              }}
              dir="auto"
            />
          </label>

          <fieldset className="quest-print-lab__team">
            <legend>Команда расследования</legend>
            <div className="quest-print-lab__participant-list">
              {personalization.participants.map((participant, index) => (
                <div className="quest-print-lab__participant" key={index}>
                  <input
                    type="text"
                    value={participant}
                    aria-label={`Участник ${index + 1}`}
                    onChange={(event) => {
                      const name = event.target.value;
                      setPersonalization((current) =>
                        updateQuestParticipant(current, index, name),
                      );
                    }}
                    dir="auto"
                  />
                  <button
                    type="button"
                    aria-label={`Удалить участника ${index + 1}`}
                    onClick={() => {
                      setPersonalization((current) =>
                        removeQuestParticipant(current, index),
                      );
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              className="quest-print-lab__add-participant"
              type="button"
              disabled={
                personalization.participants.length >= MAX_QUEST_PARTICIPANTS
              }
              onClick={() => {
                setPersonalization((current) => addQuestParticipant(current));
              }}
            >
              + Добавить участника
            </button>
          </fieldset>

          <div className="quest-print-lab__actions">
            <button
              type="button"
              aria-pressed={xRayEnabled}
              onClick={() => setXRayEnabled((enabled) => !enabled)}
            >
              X-Ray: {xRayEnabled ? "ON" : "OFF"}
            </button>

            <button type="button" onClick={() => window.print()}>
              Print test
            </button>
          </div>
        </div>
      </section>

      <div className="quest-print-lab__document" ref={documentHostRef}>
        <QuestDocument
          personalization={personalization}
          pages={selectedPages}
          assetManifest={SOUND_CASE_001_ASSET_MANIFEST}
        />
      </div>
    </main>
  );
}
