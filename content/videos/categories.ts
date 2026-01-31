// Video categories used across videos and shorts.
// This file defines ONLY category keys and meta-information.
// All user-facing labels must come from i18n dictionaries.

export const videoCategories = [
    {
    key: "animals",
    icon: "🐾",
    description: "All about animals and wildlife",
    },
  {
    key: "science",
    icon: "🔬",
    description: "General science, physics, biology, space",
  },
  {
    key: "nature",
    icon: "🌿",
    description: "Animals, ecosystems, Earth",
  },
  {
    key: "art",
    icon: "🎨",
    description: "Art, creativity, visual thinking",
  },
  {
    key: "space",
    icon: "🚀",
    description: "Astronomy and space science",
  },
  {
    key: "music",
    icon: "🎵",
    description: "Music, sound, rhythm",
  },
  {
    key: "human",
    icon: "🧠",
    description: "Human body, mind, society",
  },
] as const;

// Union of allowed category keys, derived from the whitelist above
export type VideoCategoryKey =
  (typeof videoCategories)[number]["key"];

// Optional meta type if needed elsewhere
export type VideoCategory = {
  key: VideoCategoryKey;
  icon?: string;
  description?: string;
};