import type { Lang } from "@/i18n";

export const MAX_QUEST_PARTICIPANTS = 8;
export const MAX_QUEST_PERSONALIZATION_NAME_LENGTH = 80;

export type QuestPersonalization = {
  locale: Lang;
  leadName: string;
  participants: string[];
};

export function createQuestPersonalization(
  locale: Lang,
  initial?: {
    leadName?: string;
    participants?: readonly string[];
  },
): QuestPersonalization {
  return {
    locale,
    leadName: initial?.leadName ?? "",
    participants: (initial?.participants ?? []).slice(
      0,
      MAX_QUEST_PARTICIPANTS,
    ),
  };
}

export function updateQuestParticipant(
  personalization: QuestPersonalization,
  index: number,
  name: string,
): QuestPersonalization {
  if (index < 0 || index >= personalization.participants.length) {
    return personalization;
  }

  return {
    ...personalization,
    participants: personalization.participants.map((participant, participantIndex) =>
      participantIndex === index ? name : participant,
    ),
  };
}

export function removeQuestParticipant(
  personalization: QuestPersonalization,
  index: number,
): QuestPersonalization {
  if (index < 0 || index >= personalization.participants.length) {
    return personalization;
  }

  return {
    ...personalization,
    participants: personalization.participants.filter(
      (_, participantIndex) => participantIndex !== index,
    ),
  };
}

export function addQuestParticipant(
  personalization: QuestPersonalization,
  name = "",
): QuestPersonalization {
  if (personalization.participants.length >= MAX_QUEST_PARTICIPANTS) {
    return personalization;
  }

  return {
    ...personalization,
    participants: [...personalization.participants, name],
  };
}

export function isValidQuestPersonalization(
  personalization: QuestPersonalization,
): boolean {
  const isValidName = (name: string) => {
    const trimmed = name.trim();
    return (
      trimmed.length > 0 &&
      trimmed.length <= MAX_QUEST_PERSONALIZATION_NAME_LENGTH &&
      !/[<>\u0000-\u001f\u007f]/u.test(trimmed)
    );
  };

  return (
    (personalization.locale === "ru" ||
      personalization.locale === "en" ||
      personalization.locale === "he") &&
    isValidName(personalization.leadName) &&
    personalization.participants.length <= MAX_QUEST_PARTICIPANTS &&
    personalization.participants.every((name) => !name.trim() || isValidName(name))
  );
}
