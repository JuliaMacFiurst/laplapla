import seaNames from "@/utils/sea_names.json";

export type SeaNameLocale = "ru" | "en" | "he";

type SeaNameEntry = Partial<Record<SeaNameLocale, string>>;

const SEA_NAMES = seaNames as Record<string, SeaNameEntry>;

export function localizeSeaName(id: string, locale: SeaNameLocale) {
  const entry = SEA_NAMES[id];
  if (!entry) return id;

  // The map's semantic IDs are already the approved English names.
  const localized = locale === "en" ? entry.en ?? id : entry[locale];
  return localized?.trim() || id;
}

export function localizeSeaRoute(ids: Iterable<string>, locale: SeaNameLocale) {
  return Array.from(ids, (id) => localizeSeaName(id, locale))
    .filter((name) => name.trim().length > 0)
    .join(", ");
}

export function formatSeaRouteMessage(
  template: string,
  ids: Iterable<string>,
  locale: SeaNameLocale,
) {
  return template.replace("{seas}", localizeSeaRoute(ids, locale));
}
