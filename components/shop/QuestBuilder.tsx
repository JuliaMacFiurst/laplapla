import { useRef, useState } from "react";
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
import { QuestPreview } from "./QuestPreview";

const LANGUAGE_OPTIONS: Array<{ value: Lang; label: string }> = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "he", label: "עברית" },
];

type SaveStatus = "idle" | "saving" | "saved" | "error";
type PrintStatus = "idle" | "preparing" | "error";

export function QuestBuilder({
  interfaceLang,
  initialPersonalization,
  onSave,
}: {
  interfaceLang: Lang;
  initialPersonalization?: QuestPersonalization | null;
  onSave?: (personalization: QuestPersonalization) => Promise<QuestPersonalization>;
}) {
  const [personalization, setPersonalization] = useState(() =>
    initialPersonalization
      ? { ...initialPersonalization, participants: [...initialPersonalization.participants] }
      : createQuestPersonalization(interfaceLang),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [printStatus, setPrintStatus] = useState<PrintStatus>("idle");
  const savingRef = useRef(false);
  const printHostRef = useRef<HTMLDivElement>(null);
  const text = dictionaries[interfaceLang].shop.soundCase.builder;
  const accountPath = buildLocalizedPublicPath("/account", interfaceLang);
  const canPrint = isValidQuestPersonalization(personalization);
  const canAddParticipant =
    personalization.participants.length < MAX_QUEST_PARTICIPANTS;

  const updatePersonalization = (
    update: (current: QuestPersonalization) => QuestPersonalization,
  ) => {
    setPersonalization(update);
    setSaveStatus("idle");
  };

  const updateParticipant = (index: number, name: string) => {
    updatePersonalization((current) =>
      updateQuestParticipant(current, index, name),
    );
  };

  const removeParticipant = (index: number) => {
    updatePersonalization((current) => removeQuestParticipant(current, index));
  };

  const savePersonalization = async () => {
    if (!onSave || savingRef.current || !isValidQuestPersonalization(personalization)) {
      return;
    }
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const saved = await onSave(personalization);
      setPersonalization(saved);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    } finally {
      savingRef.current = false;
    }
  };

  const printCurrentQuest = async () => {
    const printHost = printHostRef.current;
    if (!printHost || printStatus === "preparing") return;

    setPrintStatus("preparing");
    try {
      await printPreparedQuestDocument(printHost);
      setPrintStatus("idle");
    } catch {
      setPrintStatus("error");
    }
  };

  return (
    <main className="quest-builder-shell" dir={interfaceLang === "he" ? "rtl" : "ltr"}>
      <header className="quest-builder-heading">
        <Link className="quest-builder-back-link" href={accountPath}>
          <span aria-hidden="true">{interfaceLang === "he" ? "→" : "←"}</span>
          {text.backToPurchases}
        </Link>
        <p>{dictionaries[interfaceLang].shop.soundCase.eyebrow}</p>
        <h1>{text.title}</h1>
        <span>{text.intro}</span>
      </header>

      <div className="quest-builder-workspace">
        <section className="quest-builder-controls" aria-label={text.title}>
          <label className="quest-builder-field">
            <span>{text.languageLabel}</span>
            <select
              value={personalization.locale}
              onChange={(event) => {
                const locale = event.target.value as Lang;
                updatePersonalization((current) => ({ ...current, locale }));
              }}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="quest-builder-field">
            <span>{text.leadLabel}</span>
            <input
              type="text"
              value={personalization.leadName}
              maxLength={MAX_QUEST_PERSONALIZATION_NAME_LENGTH}
              onChange={(event) => {
                const leadName = event.target.value;
                updatePersonalization((current) => ({ ...current, leadName }));
              }}
              placeholder={text.leadPlaceholder}
              dir="auto"
              required
            />
          </label>
          {!personalization.leadName.trim() ? (
            <p className="quest-builder-validation">{text.leadRequired}</p>
          ) : null}

          <fieldset className="quest-builder-participants">
            <legend>{text.participantsLabel}</legend>
            <div className="quest-builder-participant-list">
              {personalization.participants.map((participant, index) => (
                <div className="quest-builder-participant" key={index}>
                  <input
                    type="text"
                    value={participant}
                    maxLength={MAX_QUEST_PERSONALIZATION_NAME_LENGTH}
                    onChange={(event) => updateParticipant(index, event.target.value)}
                    placeholder={`${text.participantPlaceholder} ${index + 1}`}
                    aria-label={`${text.participantPlaceholder} ${index + 1}`}
                    dir="auto"
                  />
                  <button type="button" onClick={() => removeParticipant(index)}>
                    {text.removeParticipant}
                  </button>
                </div>
              ))}
            </div>
            <button
              className="quest-builder-add"
              type="button"
              disabled={!canAddParticipant}
              onClick={() => updatePersonalization((current) => addQuestParticipant(current))}
            >
              + {text.addParticipant}
            </button>
            <small>{text.participantLimit}</small>
          </fieldset>

          {onSave ? (
            <div className="quest-builder-save">
              <button
                type="button"
                disabled={saveStatus === "saving" || !isValidQuestPersonalization(personalization)}
                onClick={() => void savePersonalization()}
              >
                {saveStatus === "saving" ? text.saving : text.save}
              </button>
              {saveStatus === "saved" ? <p role="status">{text.saved}</p> : null}
              {saveStatus === "error" ? <p role="alert">{text.saveFailed}</p> : null}
            </div>
          ) : null}

          <div className="quest-builder-delivery">
            <button
              type="button"
              disabled={!canPrint || printStatus === "preparing"}
              aria-busy={printStatus === "preparing"}
              onClick={() => void printCurrentQuest()}
            >
              {printStatus === "preparing" ? text.printPreparing : text.print}
            </button>
            <p>{text.printHelp}</p>
            {printStatus === "error" ? <p role="alert">{text.printFailed}</p> : null}
          </div>
        </section>

        <QuestPreview personalization={personalization} presentation="owned" />
      </div>

      <div className="quest-document-print-host" aria-hidden="true" ref={printHostRef}>
        <QuestDocument personalization={personalization} />
      </div>
    </main>
  );
}
