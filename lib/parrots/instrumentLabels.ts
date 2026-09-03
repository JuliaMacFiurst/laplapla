import type { Lang } from "@/i18n";

type InstrumentLabels = Record<Exclude<Lang, "ru">, string>;

const LABELS_BY_ID: Record<string, InstrumentLabels> = {
  arp: { en: "Arpeggio", he: "ארפג'יו" },
  bass: { en: "Bass", he: "בס" },
  beat: { en: "Drums", he: "תופים" },
  bells: { en: "Bells", he: "פעמונים" },
  brass: { en: "Brass", he: "כלי נשיפה" },
  chords: { en: "Chords", he: "אקורדים" },
  choir: { en: "Choir", he: "מקהלה" },
  drone: { en: "Drones", he: "צלילים מתמשכים" },
  drums: { en: "Drums", he: "תופים" },
  flute: { en: "Flute", he: "חליל" },
  fx: { en: "Sound effects", he: "אפקטים קוליים" },
  gamelan_core: { en: "Instruments", he: "כלים" },
  guitar: { en: "Guitar", he: "גיטרה" },
  harp: { en: "Harp", he: "נבל" },
  keys: { en: "Keys", he: "קלידים" },
  lead: { en: "Lead", he: "ליד" },
  mallet: { en: "Mallets", he: "קסילופון" },
  pads: { en: "Pads", he: "פאדים" },
  perc: { en: "Percussion", he: "כלי הקשה" },
  percussion: { en: "Percussion", he: "כלי הקשה" },
  piano: { en: "Piano", he: "פסנתר" },
  sax: { en: "Saxophone", he: "סקסופון" },
  shakers: { en: "Shakers", he: "שייקרים" },
  strings: { en: "Strings", he: "כלי קשת" },
  suling: { en: "Suling", he: "סולינג" },
  synths: { en: "Synths", he: "סינתים" },
  tavern_ambience: { en: "Lute", he: "לאוטה" },
  violin: { en: "Violin", he: "כינור" },
};

const LABEL_OVERRIDES: Record<string, InstrumentLabels> = {
  "beat:Бит": { en: "Beat", he: "ביט" },
  "beat:Бодхран": { en: "Bodhrán", he: "בודראן" },
  "piano:Клавиши": { en: "Keys", he: "קלידים" },
};

export function getParrotInstrumentDisplayLabel(
  lang: Lang,
  instrumentId: string,
  fallbackLabel: string,
) {
  if (lang === "ru") return fallbackLabel;
  return LABEL_OVERRIDES[`${instrumentId}:${fallbackLabel}`]?.[lang]
    ?? LABELS_BY_ID[instrumentId]?.[lang]
    ?? fallbackLabel;
}

export function getParrotVariantDisplayLabel(
  lang: Lang,
  instrumentId: string,
  fallbackInstrumentLabel: string,
  fallbackVariantLabel: string,
) {
  if (lang === "ru" || !fallbackVariantLabel) return fallbackVariantLabel;

  const instrumentLabel = getParrotInstrumentDisplayLabel(lang, instrumentId, fallbackInstrumentLabel);
  if (fallbackVariantLabel === fallbackInstrumentLabel) return instrumentLabel;
  if (fallbackVariantLabel.startsWith(`${fallbackInstrumentLabel} `)) {
    return `${instrumentLabel}${fallbackVariantLabel.slice(fallbackInstrumentLabel.length)}`;
  }

  return fallbackVariantLabel;
}
