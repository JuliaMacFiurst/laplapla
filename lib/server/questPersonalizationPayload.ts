import {
  MAX_QUEST_PERSONALIZATION_NAME_LENGTH,
  type QuestPersonalization,
} from "@/lib/shop/questPersonalization";

export { MAX_QUEST_PERSONALIZATION_NAME_LENGTH };
export const MAX_QUEST_PERSONALIZATION_PAYLOAD_BYTES = 4096;

type ParseResult =
  | { ok: true; value: QuestPersonalization }
  | { ok: false; error: string };

const ALLOWED_KEYS = new Set(["locale", "leadName", "participants"]);
const UNSAFE_NAME_PATTERN = /[<>\u0000-\u001f\u007f]/u;

function normalizeName(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > MAX_QUEST_PERSONALIZATION_NAME_LENGTH ||
    UNSAFE_NAME_PATTERN.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function parseSoundCasePersonalizationPayload(value: unknown): ParseResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Personalization must be an object" };
  }

  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !ALLOWED_KEYS.has(key))) {
    return { ok: false, error: "Personalization contains unsupported fields" };
  }

  if (record.locale !== "ru" && record.locale !== "en" && record.locale !== "he") {
    return { ok: false, error: "Unsupported personalization locale" };
  }

  const leadName = normalizeName(record.leadName);
  if (!leadName) {
    return { ok: false, error: "A valid lead name is required" };
  }

  if (!Array.isArray(record.participants) || record.participants.length > 8) {
    return { ok: false, error: "Participants must contain at most eight names" };
  }

  const participants: string[] = [];
  for (const participant of record.participants) {
    if (typeof participant !== "string") {
      return { ok: false, error: "Every participant must be a string" };
    }
    if (!participant.trim()) continue;
    const normalized = normalizeName(participant);
    if (!normalized) {
      return { ok: false, error: "A participant name is invalid" };
    }
    participants.push(normalized);
  }

  const personalization: QuestPersonalization = {
    locale: record.locale,
    leadName,
    participants,
  };
  if (Buffer.byteLength(JSON.stringify(personalization), "utf8") > MAX_QUEST_PERSONALIZATION_PAYLOAD_BYTES) {
    return { ok: false, error: "Personalization payload is too large" };
  }

  return { ok: true, value: personalization };
}
