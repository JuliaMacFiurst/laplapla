import { useState } from "react";
import { dictionaries, type Lang } from "@/i18n";
import {
  MAX_QUEST_PARTICIPANTS,
  addQuestParticipant,
  createQuestPersonalization,
  removeQuestParticipant,
  updateQuestParticipant,
} from "@/lib/shop/questPersonalization";
import { QuestDocument } from "./QuestDocument";
import { QuestPreview } from "./QuestPreview";

const LANGUAGE_OPTIONS: Array<{ value: Lang; label: string }> = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "he", label: "עברית" },
];

export function QuestBuilder({ interfaceLang }: { interfaceLang: Lang }) {
  const [personalization, setPersonalization] = useState(() =>
    createQuestPersonalization(interfaceLang),
  );
  const text = dictionaries[interfaceLang].shop.soundCase.builder;
  const canAddParticipant =
    personalization.participants.length < MAX_QUEST_PARTICIPANTS;

  const updateParticipant = (index: number, name: string) => {
    setPersonalization((current) =>
      updateQuestParticipant(current, index, name),
    );
  };

  const removeParticipant = (index: number) => {
    setPersonalization((current) => removeQuestParticipant(current, index));
  };

  return (
    <main className="quest-builder-shell" dir={interfaceLang === "he" ? "rtl" : "ltr"}>
      <header className="quest-builder-heading">
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
                setPersonalization((current) => ({ ...current, locale }));
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
              onChange={(event) => {
                const leadName = event.target.value;
                setPersonalization((current) => ({ ...current, leadName }));
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
              onClick={() => setPersonalization((current) => addQuestParticipant(current))}
            >
              + {text.addParticipant}
            </button>
            <small>{text.participantLimit}</small>
          </fieldset>
        </section>

        <QuestPreview personalization={personalization} />
      </div>

      <div className="quest-document-print-host" aria-hidden="true">
        <QuestDocument personalization={personalization} />
      </div>
    </main>
  );
}
