// content/cats/presets/index.ts (was presets.ts)
// Aggregator + shared types for Cats presets.
// Language-specific content lives in ./presets/ru|en|he.ts
// This file is intentionally Supabase-ready.

import { CAT_PRESETS_RU } from "./presets/ru";
import { CAT_PRESETS_EN } from "./presets/en";
import { CAT_PRESETS_HE } from "./presets/he";

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

// -----------------------------------------------------------------------------
// Aggregated export
// -----------------------------------------------------------------------------

export const CAT_PRESETS: CatPreset[] = [
  ...CAT_PRESETS_RU,
  ...CAT_PRESETS_EN,
  ...CAT_PRESETS_HE,
];