import type { VideoItem } from "./index";

export const videos: VideoItem[] = [
  {
    id: "science-why-sky-blue",
    format: "video",
    categoryKey: "science",

    title: {
      en: "Why Is the Sky Blue?",
      ru: "Почему небо голубое?",
      he: "למה השמיים כחולים?",
    },

    contentLanguages: ["en", "ru", "he"],

    source: {
      platform: "youtube",
      channelHandle: "@veritasium",
    },

    languageDependency: "spoken",
    youtubeId: "AAAA",

    durationLabel: "5:20",
    status: "approved",
  },

  {
    id: "animals-cute-dogs",
    format: "video",
    categoryKey: "animals",

    title: {
      en: "Cute Dogs Compilation",
      ru: "Подборка милых собак",
      he: "אוסף כלבים חמודים",
    },

    contentLanguages: ["en"],

    source: {
      platform: "youtube",
      channelHandle: "@animalplanet",
    },

    languageDependency: "spoken",
    youtubeId: "BBBB",

    durationLabel: "8:10",
    status: "approved",
  },
];
