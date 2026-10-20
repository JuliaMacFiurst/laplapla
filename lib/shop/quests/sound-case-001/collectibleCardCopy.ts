import type { Lang } from "@/i18n";

export type SoundCase001CollectibleCopy = {
  caseName: string;
  titles: readonly string[];
  stats: readonly [string, string, string];
  stamp: string;
  backCase: string;
  backClosed: string;
  backProof: string;
  backKeep: string;
  backNext: string;
  qrTitle: string;
  qrScan: string;
  qrTagline: string;
  collectionTitle: string;
  keepTitle: string;
  keepBody: string;
  easterEgg: string;
  frontGuide: string;
  backGuide: string;
  printHelpTitle: string;
  printHelpSummary: string;
};

export const SOUND_CASE_001_COLLECTIBLE_COPY: Record<Lang, SoundCase001CollectibleCopy> = {
  ru: {
    caseName: "ПОЮЩАЯ ДЮНА",
    titles: [
      "ПОВЕЛИТЕЛЬ ПЕСКА", "СПЕЦИАЛИСТ ПО ПОДОЗРИТЕЛЬНЫМ ЗВУКАМ", "УКРОТИТЕЛЬ ДЮН", "ИНСПЕКТОР ПЕСЧАНЫХ ВИБРАЦИЙ",
      "МАСТЕР НИЗКОЧАСТОТНОГО ГУЛА", "ЭКСПЕРТ ПО НАУЧНО НЕОБХОДИМЫМ ПОПАМ", "ДЕТЕКТИВ ПЕСЧАНЫХ ОТРЫЖЕК", "ХРАНИТЕЛЬ СЕКРЕТНОГО БУ-У-У-М",
      "ГЛАВНЫЙ СЛУШАТЕЛЬ ДЮН", "ИНЖЕНЕР ПЕСЧАНОГО ХАОСА", "ДИРИЖЁР ПЕСЧАНОГО ОРКЕСТРА", "ИНСПЕКТОР ОСОБО ШУМНЫХ ПУСТЫНЬ",
    ],
    stats: ["СЛУХ", "СМЕЛОСТЬ", "ЛЮБОПЫТСТВО"],
    stamp: "ИССЛЕДОВАТЕЛЬ",
    backCase: "ДЕЛО №001", backClosed: "ЗАКРЫТО",
    backProof: "Эта карта доказывает, что ты раскрыл тайну поющей дюны.",
    backKeep: "Сохрани её.", backNext: "Следующее дело принесёт новую карту.",
    qrTitle: "ХАБ ИССЛЕДОВАТЕЛЯ", qrScan: "СКАНИРУЙ", qrTagline: "Приключение продолжается здесь.",
    collectionTitle: "LAPLAPLA INVESTIGATOR COLLECTION",
    keepTitle: "НЕ ВЫБРАСЫВАТЬ.", keepBody: "Официальное доказательство раскрытого дела поющей дюны.",
    easterEgg: "Научно необходимая попа всё подтверждает.",
    frontGuide: "ЛИЦЕВАЯ СТОРОНА · ПЕЧАТАТЬ 100%", backGuide: "ОБОРОТ · FLIP ON LONG EDGE",
    printHelpTitle: "COLLECTIBLE INVESTIGATOR CARDS",
    printHelpSummary: "Одна именная карточка каждому игроку. Печатайте в масштабе 100% и переворачивайте по длинному краю.",
  },
  en: {
    caseName: "SINGING DUNE",
    titles: [
      "SAND COMMANDER", "SUSPICIOUS SOUND SPECIALIST", "DUNE WHISPERER", "SAND VIBRATION INSPECTOR",
      "LOW-RUMBLE MASTER", "SCIENTIFICALLY NECESSARY BUTT EXPERT", "SAND BURP DETECTIVE", "KEEPER OF THE SECRET BO-O-O-M",
      "CHIEF DUNE LISTENER", "SAND CHAOS ENGINEER", "SAND ORCHESTRA CONDUCTOR", "INSPECTOR OF EXTREMELY NOISY DESERTS",
    ],
    stats: ["HEARING", "COURAGE", "CURIOSITY"],
    stamp: "INVESTIGATOR",
    backCase: "CASE #001", backClosed: "CLOSED",
    backProof: "This card proves that you solved the mystery of the singing dune.",
    backKeep: "Keep it safe.", backNext: "The next case brings a new card.",
    qrTitle: "INVESTIGATOR HUB", qrScan: "SCAN", qrTagline: "The adventure continues here.",
    collectionTitle: "LAPLAPLA INVESTIGATOR COLLECTION",
    keepTitle: "DO NOT DISCARD.", keepBody: "Official proof that you cracked the singing-dune case.",
    easterEgg: "The scientifically necessary butt confirms it.",
    frontGuide: "FRONT · PRINT AT 100%", backGuide: "BACK · FLIP ON LONG EDGE",
    printHelpTitle: "COLLECTIBLE INVESTIGATOR CARDS",
    printHelpSummary: "One named card for every player. Print at 100% and flip on the long edge.",
  },
  he: {
    caseName: "הדיונה המזמרת",
    titles: [
      "שליט החול", "מומחה לצלילים חשודים", "מאלף הדיונות", "מפקח תנודות החול",
      "אמן הרעשים הנמוכים", "מומחה לטוסיקים הכרחיים למדע", "בלש גיהוקי החול", "שומר הבו־ו־ו־ם הסודי",
      "המאזין הראשי לדיונות", "מהנדס כאוס חולי", "מנצח תזמורת החול", "מפקח מדבריות רועשים במיוחד",
    ],
    stats: ["שמיעה", "אומץ", "סקרנות"],
    stamp: "חוקר רשמי",
    backCase: "תיק מס׳ 001", backClosed: "נסגר",
    backProof: "הכרטיס הזה מוכיח שפענחת את תעלומת הדיונה המזמרת.",
    backKeep: "כדאי לשמור עליו.", backNext: "בתיק הבא מחכה לך כרטיס חדש.",
    qrTitle: "מרכז החוקרים", qrScan: "לסריקה", qrTagline: "ההרפתקה ממשיכה כאן.",
    collectionTitle: "LAPLAPLA INVESTIGATOR COLLECTION",
    keepTitle: "לא לזרוק.", keepBody: "הוכחה רשמית שפענחת את תיק הדיונה המזמרת.",
    easterEgg: "הטוסיק שהיה הכרחי למדע מאשר הכול.",
    frontGuide: "צד קדמי · הדפסה ב־100%", backGuide: "צד אחורי · היפוך בצד הארוך",
    printHelpTitle: "כרטיסי חוקר לאספנים",
    printHelpSummary: "כרטיס אישי לכל שחקן ושחקנית. מדפיסים ב־100% והופכים בצד הארוך.",
  },
};
