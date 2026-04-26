import type { Lang } from "@/i18n";
import { getMusicStyle } from "@/content/parrots/musicStyles";
import {
  PARROT_PRESETS,
  iconForInstrument,
  iconForMusicStyle,
  type ParrotLoop,
  type ParrotPreset,
} from "@/utils/parrot-presets";

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
};

export function mapParrotLoopToStyleInstrument(loop: ParrotLoop): ParrotStyleInstrument {
  return {
    id: loop.id,
    label: loop.label,
    iconUrl: iconForInstrument(loop.label || loop.id),
    variants: loop.variants.map((variant) => ({
      id: variant.id,
      src: variant.src,
      label: variant.label,
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
    loops: preset.loops.map(mapParrotLoopToStyleInstrument),
    slides: localizedStyle?.slides ?? [],
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
