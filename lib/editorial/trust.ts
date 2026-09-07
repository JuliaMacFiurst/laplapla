import type { Lang } from "@/i18n";

export type EditorialSource = {
  title: string;
  url?: string;
  publisher?: string;
};

const DATE_LOCALES: Record<Lang, string> = {
  ru: "ru-RU",
  en: "en-US",
  he: "he-IL",
};

export function getSafeEditorialSourceUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function normalizeEditorialSources(value: unknown): EditorialSource[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === "string") {
      const text = item.trim();
      if (!text) return [];
      const url = getSafeEditorialSourceUrl(text);
      return [{ title: url ? new URL(url).hostname.replace(/^www\./, "") : text, url }];
    }

    const record = asRecord(item);
    if (!record) return [];
    const url = getSafeEditorialSourceUrl(record.url ?? record.source_url ?? record.href);
    const titleValue = record.title ?? record.name ?? record.label;
    const publisherValue = record.publisher ?? record.organization;
    const title = typeof titleValue === "string" && titleValue.trim()
      ? titleValue.trim()
      : url
        ? new URL(url).hostname.replace(/^www\./, "")
        : "";
    if (!title) return [];
    return [{
      title,
      url,
      publisher: typeof publisherValue === "string" && publisherValue.trim()
        ? publisherValue.trim()
        : undefined,
    }];
  });
}

export function formatEditorialDate(value: string | null | undefined, lang: Lang) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(DATE_LOCALES[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function getLatestEditorialDate(values: Array<string | null | undefined>) {
  const validDates = values
    .flatMap((value) => {
      if (!value) return [];
      const timestamp = new Date(value).getTime();
      return Number.isNaN(timestamp) ? [] : [{ value, timestamp }];
    })
    .sort((left, right) => right.timestamp - left.timestamp);
  return validDates[0]?.value ?? null;
}

export function dedupeEditorialSources(sources: EditorialSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.url || ""}\u0000${source.title}\u0000${source.publisher || ""}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
