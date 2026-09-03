import type { Lang } from "@/i18n";
import { getContentTranslationMetadata, type ContentTranslationMetadata } from "@/lib/contentTranslationMetadata";
import { getMusicStyle } from "@/content/parrots/musicStyles";
import {
  PARROT_PRESETS,
  iconForInstrument,
  iconForMusicStyle,
  type ParrotLoop,
  type ParrotPreset,
} from "@/utils/parrot-presets";
import {
  getParrotInstrumentDisplayLabel,
  getParrotVariantDisplayLabel,
} from "@/lib/parrots/instrumentLabels";

export type ParrotStyleSlide = {
  text: string;
  mediaUrl?: string;
  mediaType?: "gif" | "image" | "video";
};

export type ParrotStyleVariant = {
  id: string;
  src: string;
  label?: string;
};

export type ParrotStyleInstrument = {
  id: string;
  label: string;
  iconUrl: string;
  variants: ParrotStyleVariant[];
  defaultIndex?: number;
  defaultOn?: boolean;
};

export type ParrotStyleRecord = {
  id: string;
  title: string;
  description: string;
  iconUrl: string;
  searchArtist: string;
  searchGenre: string;
  loops: ParrotStyleInstrument[];
  slides: ParrotStyleSlide[];
  translation?: ContentTranslationMetadata;
};

export function mapParrotLoopToStyleInstrument(loop: ParrotLoop, lang: Lang): ParrotStyleInstrument {
  const localizedLabel = getParrotInstrumentDisplayLabel(lang, loop.id, loop.label);
  return {
    id: loop.id,
    label: localizedLabel,
    iconUrl: iconForInstrument(loop.label || loop.id),
    variants: loop.variants.map((variant) => ({
      id: variant.id,
      src: variant.src,
      label: variant.label
        ? getParrotVariantDisplayLabel(lang, loop.id, loop.label, variant.label)
        : undefined,
    })),
    defaultIndex: loop.defaultIndex,
    defaultOn: loop.defaultOn,
  };
}

export function mapParrotPresetToStyleRecord(
  preset: ParrotPreset,
  lang: Lang,
): ParrotStyleRecord {
  const localizedStyle = getMusicStyle(lang, preset.id);

  return {
    id: preset.id,
    title: localizedStyle?.title || preset.title,
    description: localizedStyle?.description || preset.description,
    iconUrl: iconForMusicStyle(preset.id),
    searchArtist: preset.searchArtist,
    searchGenre: preset.searchGenre,
    loops: preset.loops.map((loop) => mapParrotLoopToStyleInstrument(loop, lang)),
    slides: localizedStyle?.slides ?? [],
    translation: getContentTranslationMetadata(lang, true),
  };
}

export function getHardcodedParrotStyleRecords(lang: Lang): ParrotStyleRecord[] {
  return PARROT_PRESETS.map((preset) => mapParrotPresetToStyleRecord(preset, lang));
}

export function getHardcodedParrotStyleRecordById(
  lang: Lang,
  styleId: string,
): ParrotStyleRecord | null {
  const preset = PARROT_PRESETS.find((item) => item.id === styleId);
  return preset ? mapParrotPresetToStyleRecord(preset, lang) : null;
}
