import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import {
  MAX_QUEST_PERSONALIZATION_NAME_LENGTH,
  MAX_QUEST_PARTICIPANTS,
  addQuestParticipant,
  createQuestPersonalization,
  isValidQuestPersonalization,
  removeQuestParticipant,
  updateQuestParticipant,
  type QuestPersonalization,
} from "@/lib/shop/questPersonalization";
import { printPreparedQuestDocument } from "@/lib/shop/printableAssets";
import { QuestDocument } from "./QuestDocument";
import { QuestReadyResult } from "./QuestReadyResult";

const LANGUAGE_OPTIONS: Array<{ value: Lang; label: string }> = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "he", label: "עברית" },
];

type SaveStatus = "idle" | "saving" | "error";
type PrintStatus = "idle" | "preparing" | "error";
type BuilderStep = "personalize" | "ready";
export type QuestBuilderMode = "default" | "edit" | "ready";

export function normalizeQuestPersonalization(personalization: QuestPersonalization): QuestPersonalization {
  return {
    locale: personalization.locale,
    leadName: personalization.leadName.trim(),
    participants: personalization.participants.map((name) => name.trim()).filter(Boolean),
  };
}

export function questPersonalizationsMatch(left: QuestPersonalization, right: QuestPersonalization) {
  return JSON.stringify(normalizeQuestPersonalization(left)) ===
    JSON.stringify(normalizeQuestPersonalization(right));
}

export function shouldEnterReadyAfterSave(currentDraft: QuestPersonalization, savedSnapshot: QuestPersonalization) {
  return questPersonalizationsMatch(currentDraft, savedSnapshot);
}

export function QuestBuilder({
  interfaceLang,
  initialPersonalization,
  initialMode = "default",
  onSave,
}: {
  interfaceLang: Lang;
  initialPersonalization?: QuestPersonalization | null;
  initialMode?: QuestBuilderMode;
  onSave?: (personalization: QuestPersonalization) => Promise<QuestPersonalization>;
}) {
  const initial = initialPersonalization
    ? { ...initialPersonalization, participants: [...initialPersonalization.participants] }
    : createQuestPersonalization(interfaceLang);
  const [draft, setDraft] = useState<QuestPersonalization>(initial);
  const [lastSaved, setLastSaved] = useState<QuestPersonalization | null>(initialPersonalization ? initial : null);
  const [step, setStep] = useState<BuilderStep>(
    initialPersonalization && initialMode !== "edit" ? "ready" : "personalize",
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [printStatus, setPrintStatus] = useState<PrintStatus>("idle");
  const initialDraftRef = useRef(initial);
  const savingRef = useRef(false);
  const printingRef = useRef(false);
  const draftRef = useRef(draft);
  const printHostRef = useRef<HTMLDivElement>(null);
  const text = dictionaries[interfaceLang].shop.soundCase.builder;
  const accountPath = buildLocalizedPublicPath("/account", interfaceLang);
  const isDirty = lastSaved
    ? !questPersonalizationsMatch(draft, lastSaved)
    : !questPersonalizationsMatch(draft, initialDraftRef.current);
  const canAddParticipant = draft.participants.length < MAX_QUEST_PARTICIPANTS;

  useEffect(() => { draftRef.current = draft; }, [draft]);

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  const updateDraft = (update: (current: QuestPersonalization) => QuestPersonalization) => {
    setDraft((current) => {
      const next = update(current);
      draftRef.current = next;
      return next;
    });
    setSaveStatus((current) => current === "saving" ? "saving" : "idle");
    setStep("personalize");
  };

  const savePersonalization = async () => {
    if (!onSave || savingRef.current || !isValidQuestPersonalization(draft)) return;
    const snapshot = normalizeQuestPersonalization(draft);
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const saved = await onSave(snapshot);
      setLastSaved(saved);
      setSaveStatus("idle");
      setStep(shouldEnterReadyAfterSave(draftRef.current, saved) ? "ready" : "personalize");
    } catch {
      setSaveStatus("error");
      setStep("personalize");
    } finally {
      savingRef.current = false;
    }
  };

  const printSavedQuest = async () => {
    const printHost = printHostRef.current;
    if (!lastSaved || isDirty || !printHost || printingRef.current) return;
    printingRef.current = true;
    setPrintStatus("preparing");
    try {
      await printPreparedQuestDocument(printHost);
      setPrintStatus("idle");
    } catch {
      setPrintStatus("error");
    } finally {
      printingRef.current = false;
    }
  };

  const confirmLeave = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isDirty && !window.confirm(text.leaveConfirm)) event.preventDefault();
  };
  const status = saveStatus === "saving" ? text.saving
    : saveStatus === "error" ? text.saveFailed
      : isDirty ? text.unsaved : lastSaved ? text.saved : text.startHint;

  return (
    <main className="quest-builder-shell" dir={interfaceLang === "he" ? "rtl" : "ltr"}>
      <header className="quest-builder-heading">
        <Link className="quest-builder-back-link" href={accountPath} onClick={confirmLeave}>
          <span aria-hidden="true">{interfaceLang === "he" ? "→" : "←"}</span>{text.backToPurchases}
        </Link>
        <p>{dictionaries[interfaceLang].shop.soundCase.eyebrow}</p>
        <h1>{text.title}</h1>
        <span>{text.intro}</span>
      </header>

      <ol className="quest-builder-progress" aria-label={text.progressLabel}>
        <li aria-current={step === "personalize" ? "step" : undefined} className={step === "personalize" ? "is-current" : "is-complete"}><span>1</span>{text.stepPersonalize}</li>
        <li aria-current={step === "ready" ? "step" : undefined} className={step === "ready" ? "is-current" : undefined}><span>2</span>{text.stepReady}</li>
        <li className={step === "ready" ? "is-available" : undefined}><span>3</span>{text.stepPrint}</li>
      </ol>

      {step === "personalize" ? (
        <div className="quest-builder-workspace quest-builder-workspace--personalize">
          <section className="quest-builder-controls" aria-labelledby="quest-personalize-title">
            <header className="quest-builder-section-heading"><h2 id="quest-personalize-title">{text.personalizeTitle}</h2><p>{text.personalizeHelp}</p></header>
            <label className="quest-builder-field"><span>{text.languageLabel}</span>
              <select value={draft.locale} onChange={(event) => updateDraft((current) => ({ ...current, locale: event.target.value as Lang }))}>
                {LANGUAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="quest-builder-field"><span>{text.leadLabel}</span>
              <input type="text" value={draft.leadName} maxLength={MAX_QUEST_PERSONALIZATION_NAME_LENGTH}
                onChange={(event) => updateDraft((current) => ({ ...current, leadName: event.target.value }))}
                placeholder={text.leadPlaceholder} dir="auto" required aria-describedby={!draft.leadName.trim() ? "quest-lead-error" : undefined} />
            </label>
            {!draft.leadName.trim() ? <p id="quest-lead-error" className="quest-builder-validation">{text.leadRequired}</p> : null}

            <fieldset className="quest-builder-participants">
              <legend>{text.participantsLabel}</legend>
              <div className="quest-builder-participant-list">
                {draft.participants.map((participant, index) => (
                  <div className="quest-builder-participant" key={index}>
                    <input type="text" value={participant} maxLength={MAX_QUEST_PERSONALIZATION_NAME_LENGTH}
                      onChange={(event) => updateDraft((current) => updateQuestParticipant(current, index, event.target.value))}
                      placeholder={`${text.participantPlaceholder} ${index + 1}`} aria-label={`${text.participantPlaceholder} ${index + 1}`} dir="auto" />
                    <button type="button" onClick={() => updateDraft((current) => removeQuestParticipant(current, index))}>{text.removeParticipant}</button>
                  </div>
                ))}
              </div>
              <button className="quest-builder-add" type="button" disabled={!canAddParticipant} onClick={() => updateDraft((current) => addQuestParticipant(current))}>+ {text.addParticipant}</button>
              <small>{text.participantLimit}</small>
            </fieldset>

            <div className={`quest-builder-save quest-builder-save--${saveStatus === "error" ? "error" : isDirty ? "dirty" : "saved"}`}>
              <p role={saveStatus === "error" ? "alert" : "status"} aria-live="polite">{status}</p>
              <button type="button" disabled={saveStatus === "saving" || !isValidQuestPersonalization(draft)} onClick={() => void savePersonalization()}>
                {saveStatus === "saving" ? text.saving : saveStatus === "error" ? text.retrySave : text.saveAndContinue}
              </button>
            </div>
          </section>

          <aside className="quest-builder-draft-summary" aria-label={text.draftSummaryTitle}>
            <h2>{text.draftSummaryTitle}</h2>
            <dl>
              <div><dt>{text.readyLead}</dt><dd><bdi>{draft.leadName.trim() || text.namePending}</bdi></dd></div>
              <div><dt>{text.readyLanguage}</dt><dd>{LANGUAGE_OPTIONS.find(({ value }) => value === draft.locale)?.label}</dd></div>
              <div><dt>{text.readyTeam}</dt><dd>{draft.participants.filter((name) => name.trim()).length + 1}</dd></div>
            </dl>
            <p>{text.draftPrintNotice}</p>
          </aside>
        </div>
      ) : lastSaved ? (
        <QuestReadyResult personalization={lastSaved} interfaceLang={interfaceLang} printStatus={printStatus}
          onEdit={() => { setPrintStatus("idle"); setStep("personalize"); }} onPrint={() => void printSavedQuest()} accountPath={accountPath} />
      ) : null}

      {lastSaved ? <div className="quest-document-print-host" aria-hidden="true" ref={printHostRef}><QuestDocument personalization={lastSaved} /></div> : null}
    </main>
  );
}
