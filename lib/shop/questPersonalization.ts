import type { Lang } from "@/i18n";

export const MAX_QUEST_PARTICIPANTS = 8;

export type QuestPersonalization = {
  locale: Lang;
  leadName: string;
  participants: string[];
};

export function createQuestPersonalization(locale: Lang): QuestPersonalization {
  return {
    locale,
    leadName: "",
    participants: [],
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
