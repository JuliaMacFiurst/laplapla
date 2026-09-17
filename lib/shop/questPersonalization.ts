import type { Lang } from "@/i18n";

export const MAX_QUEST_PARTICIPANTS = 8;

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
  return (
    personalization.leadName.trim().length > 0 &&
    personalization.participants.length <= MAX_QUEST_PARTICIPANTS
  );
}
