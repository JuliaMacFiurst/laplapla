// Whitelisted educational YouTube channels.
// This file is informational + structural:
// it helps curate content but is NOT used for auto-fetching.
//
// Rule of thumb:
// videos → only from channels listed here
// adding a channel ≠ auto-adding its videos

export type VideoChannel = {
  id: string;
  title: string;
  youtubeChannelId?: string;
  focus: string;
  ageNote?: string;
  languages?: Array<"en" | "ru" | "he">;
};

// --------------------
// Recommended safe channels
// --------------------

export const channels: VideoChannel[] = [
  {
    id: "kurzgesagt",
    title: "Kurzgesagt – In a Nutshell",
    youtubeChannelId: "UCsXVk37bltHxD1rDPwtNM8Q",
    focus: "Science, space, biology, big questions",
    ageNote: "8+ (some topics better 10+)",
    languages: ["en"],
  },
  {
    id: "scishow-kids",
    title: "SciShow Kids",
    youtubeChannelId: "UCZYTClx2T1of7BRZ86-8fow",
    focus: "Basic science explained for kids",
    ageNote: "6–10",
    languages: ["en"],
  },
  {
    id: "natgeo-kids",
    title: "National Geographic Kids",
    youtubeChannelId: "UCXVCgDuD_QCkI7gTKU7-tpg",
    focus: "Animals, nature, geography",
    ageNote: "6+",
    languages: ["en"],
  },
  {
    id: "slivki-show",
    title: "SlivkiShow",
    youtubeChannelId: "UCkJt1KpYQW9tG5h7k0s1J8A",
    focus: "Experiments, nature, everyday science explained visually",
    ageNote: "7+ (watch together, some experiments are intense)",
    languages: ["ru"],
  },
  {
    id: "dr-plants",
    title: "Dr Plants",
    youtubeChannelId: "UCVvQ5a2YzJ4Kc4N0Y2lYf3A",
    focus: "Plants, botany, nature facts, calm educational shorts",
    ageNote: "6+",
    languages: ["en"],
  },
  {
    id: "minuteearth",
    title: "MinuteEarth",
    youtubeChannelId: "UCeiYXex_fwgYDonaTcSIk6w",
    focus: "Earth science, short explainers",
    ageNote: "8+",
    languages: ["en"],
  },
  {
    id: "ted-ed",
    title: "TED-Ed",
    youtubeChannelId: "UCsooa4yRKGN_zEE8iknghZA",
    focus: "Short educational lessons and animations",
    ageNote: "8–12",
    languages: ["en", "ru"],
  },
  {
    id: "veritasium",
    title: "Veritasium",
    youtubeChannelId: "UCHnyfMqiRRG1u-2MsSQLbXA",
    focus: "Science experiments and explanations",
    ageNote: "10+ (select carefully)",
    languages: ["en"],
  },
  {
    id: "smarter-every-day",
    title: "Smarter Every Day",
    youtubeChannelId: "UC6107grRI4m0o2-emgoDnAA",
    focus: "Engineering, physics, curiosity-driven science",
    ageNote: "10+",
    languages: ["en"],
  },
];