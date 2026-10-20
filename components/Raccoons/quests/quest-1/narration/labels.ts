import type { Lang } from "@/i18n";

export const QUEST_1_NARRATION_LABELS: Record<Lang, {
  expand: string;
  collapse: string;
  enable: string;
  disable: string;
  previous: string;
  play: string;
  pause: string;
  next: string;
  unavailable: string;
}> = {
  ru: {
    expand: "Открыть озвучку",
    collapse: "Свернуть озвучку",
    enable: "Включить озвучку",
    disable: "Отключить озвучку",
    previous: "Предыдущий фрагмент",
    play: "Воспроизвести",
    pause: "Пауза",
    next: "Следующий фрагмент",
    unavailable: "Запись пока недоступна",
  },
  en: {
    expand: "Open narration",
    collapse: "Collapse narration",
    enable: "Enable narration",
    disable: "Disable narration",
    previous: "Previous passage",
    play: "Play",
    pause: "Pause",
    next: "Next passage",
    unavailable: "Recording is not available yet",
  },
  he: {
    expand: "פתיחת ההקראה",
    collapse: "צמצום ההקראה",
    enable: "הפעלת ההקראה",
    disable: "כיבוי ההקראה",
    previous: "הקטע הקודם",
    play: "הפעלה",
    pause: "השהיה",
    next: "הקטע הבא",
    unavailable: "ההקלטה עדיין לא זמינה",
  },
};
