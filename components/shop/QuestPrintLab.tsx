import { useEffect, useRef, useState } from "react";
import { type Lang } from "@/i18n";
import {
  SOUND_CASE_001_PAGES,
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
};

export function QuestPrintLab({
  initialPersonalization = DEFAULT_FIXTURE,
}: QuestPrintLabProps) {
  const [personalization, setPersonalization] = useState(initialPersonalization);
  const [xRayEnabled, setXRayEnabled] = useState(false);
  const documentHostRef = useRef<HTMLDivElement>(null);

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
  }, [personalization, xRayEnabled]);

  return (
    <main
      className={`quest-print-lab${xRayEnabled ? " quest-print-lab--xray" : ""}`}
      data-xray={xRayEnabled ? "on" : "off"}
    >
      <section className="quest-print-lab__toolbar" aria-label="Quest Print Lab controls">
        <header className="quest-print-lab__identity">
          <strong>Quest Print Lab</strong>
          <span>Sound Case #001</span>
          <span className="quest-print-lab__print-guidance">
            Cover: print separately · Card pages 2–5: A4 portrait · 100% /
            Actual Size · Duplex: flip on long edge
          </span>
        </header>

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
          pages={SOUND_CASE_001_PAGES}
          assetManifest={SOUND_CASE_001_ASSET_MANIFEST}
        />
      </div>
    </main>
  );
}
