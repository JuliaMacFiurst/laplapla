// content/cats/presets/index.ts (was presets.ts)
// Aggregator + shared types for Cats presets.
// Language-specific content lives in ./presets/ru|en|he.ts
// This file is intentionally Supabase-ready.

import { CAT_PRESETS_RU } from "./presets/ru";
import { CAT_PRESETS_EN } from "./presets/en";
import { CAT_PRESETS_HE } from "./presets/he";

import { CAT_TEXT_PRESETS_RU } from "./presets-text/ru";
import { CAT_TEXT_PRESETS_EN } from "./presets-text/en";
import { CAT_TEXT_PRESETS_HE } from "./presets-text/he";

// -----------------------------------------------------------------------------
// Shared types
// -----------------------------------------------------------------------------

export type CatPresetMediaType = "gif" | "video";

export type CatPresetSlide = {
  order: number;
  text: string;       // HTML or markdown
  mediaUrl: string;   // direct CDN link (Giphy / Pexels)
  mediaType: CatPresetMediaType;
};

export type CatPreset = {
  id: string;         // stable id, later = Supabase uuid
  lang: "ru" | "en" | "he";
  prompt: string;     // question shown to the child
  slides: CatPresetSlide[];
};

export type CatTextPreset = {
  id: string;         // stable id
  lang: "ru" | "en" | "he";
  prompt: string;     // вопрос
  texts: string[];    // ТОЛЬКО тексты слайдов
};

// -----------------------------------------------------------------------------
// Aggregated export
// -----------------------------------------------------------------------------

export const CAT_PRESETS: CatPreset[] = [
  ...CAT_PRESETS_RU,
  ...CAT_PRESETS_EN,
  ...CAT_PRESETS_HE,
];

export const CAT_TEXT_PRESETS: CatTextPreset[] = [
  ...CAT_TEXT_PRESETS_RU,
  ...CAT_TEXT_PRESETS_EN,
  ...CAT_TEXT_PRESETS_HE,
];