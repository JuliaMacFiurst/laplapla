import type { Lang } from "@/i18n";
import type { WakeTheDuneStemId } from "./wakeTheDuneAssets";
import type { WakeTheDuneAccuracy } from "./wakeTheDuneProgress";

export const WAKE_THE_DUNE_ROUTE = "/mini-games/wake-the-dune" as const;
export const WAKE_THE_DUNE_GAME_ID = "wake-the-dune" as const;
export const WAKE_THE_DUNE_SOURCE_CASE_ID = "sound-case-001" as const;

export type RhythmGuide = "full" | "soft" | "memory";

export type RhythmLevel = {
  id: `level-${number}`;
  beatPositions: readonly number[];
  tempo: number;
  toleranceMs: number;
  stem: WakeTheDuneStemId;
  guide: RhythmGuide;
  phraseStarts?: readonly number[];
};

export const RHYTHM_LEAD_IN_MS = 620;
export const RHYTHM_TAIL_MS = 520;

/** Hand-authored musical phrases in beat units, not display strings. */
export const WAKE_THE_DUNE_LEVELS: readonly RhythmLevel[] = [
  { id: "level-1", beatPositions: [0, 1, 2], tempo: 82, toleranceMs: 250, stem: "stem-01", guide: "full" },
  { id: "level-2", beatPositions: [0, 1.5, 2.5], tempo: 84, toleranceMs: 250, stem: "stem-02", guide: "full" },
  { id: "level-3", beatPositions: [0, 1, 2.5, 3.5], tempo: 88, toleranceMs: 240, stem: "stem-03", guide: "full" },
  { id: "level-4", beatPositions: [0, 1.5, 3, 4, 4.75], tempo: 90, toleranceMs: 235, stem: "stem-04", guide: "full" },
  { id: "level-5", beatPositions: [0, 0.75, 2, 3.5, 4.25], tempo: 92, toleranceMs: 230, stem: "stem-05", guide: "soft" },
  { id: "level-6", beatPositions: [0, 1, 1.75, 3.25, 4.25, 5.75], tempo: 94, toleranceMs: 225, stem: "stem-06", guide: "soft" },
  { id: "level-7", beatPositions: [0, 0.75, 1.5, 3, 3.75, 5, 6.25], tempo: 97, toleranceMs: 215, stem: "stem-07", guide: "soft" },
  { id: "level-8", beatPositions: [0, 0.75, 1.5, 3, 3.75, 5.25, 6, 7.5], tempo: 100, toleranceMs: 210, stem: "stem-08", guide: "memory", phraseStarts: [0, 3, 5, 7] },
];

export type WakeDuneLighting = {
  progress: number;
  sunTravel: number;
  sunX: number;
  sunY: number;
  sunOpacity: number;
  lightLeft: number;
  lightRight: number;
  shadowLeft: number;
  shadowRight: number;
  night: number;
  dawn: number;
  day: number;
  sunset: number;
  ambientGlow: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const normalized = clamp01((value - edge0) / (edge1 - edge0));
  return normalized * normalized * (3 - 2 * normalized);
};

/** One canonical progress drives the sun, sky, ambient glow, and every dune lighting layer. */
export function getWakeDuneLighting(progress: number): WakeDuneLighting {
  const canonical = clamp01(progress);
  const sunTravel = clamp01(canonical / 0.82);
  const sunSide = Math.cos(Math.PI * sunTravel); // +1 right, 0 overhead, -1 left.
  const overhead = Math.sin(Math.PI * sunTravel);
  const night = smoothstep(0.7, 0.9, canonical);
  const daylight = 1 - night;
  const rightLight = Math.max(0, sunSide);
  const leftLight = Math.max(0, -sunSide);
  const neutralTopLight = overhead * 0.16;

  return {
    progress: canonical,
    sunTravel,
    sunX: 88 - sunTravel * 76,
    sunY: 70 - overhead * 56,
    sunOpacity: 1 - smoothstep(0.76, 0.86, canonical),
    lightRight: daylight * (0.06 + rightLight * 0.5 + neutralTopLight),
    lightLeft: daylight * (0.06 + leftLight * 0.5 + neutralTopLight),
    shadowLeft: 0.14 + rightLight * 0.5 + night * 0.2,
    shadowRight: 0.14 + leftLight * 0.5 + night * 0.2,
    night,
    dawn: 1 - smoothstep(0.12, 0.34, canonical),
    day: Math.min(smoothstep(0.18, 0.4, canonical), 1 - smoothstep(0.54, 0.72, canonical)),
    sunset: smoothstep(0.5, 0.7, canonical) * (1 - smoothstep(0.82, 0.98, canonical)),
    ambientGlow: daylight * (0.32 + overhead * 0.3),
  };
}

export function getExpectedTapTimesMs(level: RhythmLevel): number[] {
  const beatMs = 60_000 / level.tempo;
  return level.beatPositions.map((beat) => RHYTHM_LEAD_IN_MS + beat * beatMs);
}

export function getPhraseMarkerTimesMs(level: RhythmLevel): number[] {
  const expected = getExpectedTapTimesMs(level);
  return (level.phraseStarts ?? []).slice(1).flatMap((beatIndex) => expected[beatIndex] === undefined ? [] : [expected[beatIndex]]);
}

export function getRhythmDurationMs(level: RhythmLevel): number {
  const taps = getExpectedTapTimesMs(level);
  return (taps.at(-1) ?? RHYTHM_LEAD_IN_MS) + RHYTHM_TAIL_MS;
}

export type TapJudgement = "hit" | "early" | "late";

export function judgeRhythmTap(expectedMs: number, actualMs: number, toleranceMs: number): TapJudgement {
  const delta = actualMs - expectedMs;
  if (delta < -toleranceMs) return "early";
  if (delta > toleranceMs) return "late";
  return "hit";
}

export function scoreRhythmTap(expectedMs: number, actualMs: number): { accuracy: WakeTheDuneAccuracy; points: number } {
  const error = Math.abs(actualMs - expectedMs);
  if (error <= 70) return { accuracy: "perfect", points: 100 };
  if (error <= 140) return { accuracy: "great", points: 75 };
  return { accuracy: "good", points: 50 };
}

export const WAKE_THE_DUNE_MAX_SCORE = WAKE_THE_DUNE_LEVELS.reduce(
  (total, level) => total + level.beatPositions.length * 100 + 250 + 150,
  0,
);

export type WakeTheDuneCopy = {
  pageTitle: string;
  metaDescription: string;
  caseLabel: string;
  title: string;
  level: string;
  firstInstruction: string;
  start: string;
  listenTitle: string;
  listenDetail: string;
  listenDetailFirst: string;
  transitionReady: string;
  playTitle: string;
  playDetail: string;
  playDetailFirst: string;
  tapLabel: string;
  tapHint: string;
  early: string;
  asleep: string;
  retry: string;
  awake: string;
  layerUnlocked: string;
  music: string;
  nextLevel: string;
  finish: string;
  completeTitle: string;
  completeBody: string;
  playAgain: string;
  finalListening: string;
  finalRhythm: string;
  finalByEar: string;
  finalAlmostAwake: string;
  found: string;
  audioLoading: string;
  audioWarning: string;
  audioRetry: string;
  newLayer: string;
  score: string;
  levelComplete: string;
  rhythmScore: string;
  firstTryBonus: string;
  levelBonus: string;
  total: string;
  perfect: string;
  great: string;
  good: string;
  exitLabel: string;
  pauseLabel: string;
  resume: string;
  exitQuestion: string;
  exitWarning: string;
  stay: string;
  exit: string;
  hintQuestion: string;
  hintShow: string;
  hintTryAgain: string;
  finalVoicesTogether: string;
  listenToDune: string;
  finishGame: string;
  pauseMusic: string;
  playMusic: string;
  turnPortrait: string;
};

export const WAKE_THE_DUNE_COPY: Record<Lang, WakeTheDuneCopy> = {
  ru: {
    pageTitle: "Разбуди дюну — мини-игра LapLapLa",
    metaDescription: "Слушай ритм, отбивай его по песку и пробуждай восемь музыкальных голосов поющей дюны.",
    caseLabel: "SOUND CASE #001 · THE SINGING DUNE",
    title: "РАЗБУДИ ДЮНУ",
    level: "УРОВЕНЬ",
    firstInstruction: "ПОСЛУШАЙ РИТМ. ПОТОМ ОТБЕЙ ЕГО ПО ПЕСКУ.",
    start: "СЛУШАТЬ РИТМ",
    listenTitle: "👂 СЛУШАЙ РИТМ",
    listenDetail: "Сейчас играет дюна. Пока не стучи.",
    listenDetailFirst: "Дюна сыграет ритм. Пока не стучи.",
    transitionReady: "ГОТОВЫ?",
    playTitle: "👆 ТЕПЕРЬ ВЫ",
    playDetail: "Отбейте тот же ритм по дюне.",
    playDetailFirst: "Повторите тот же ритм, стуча по песку.",
    tapLabel: "Ударить по песку",
    tapHint: "Ударяй по песку",
    early: "РАНО!",
    asleep: "ОЙ. ДЮНА УСНУЛА.",
    retry: "ПОПРОБОВАТЬ ЕЩЁ РАЗ",
    awake: "ДЮНА ПРОСНУЛАСЬ!",
    layerUnlocked: "ЕЩЁ ОДИН ГОЛОС ПРОСНУЛСЯ",
    music: "МУЗЫКА ДЮНЫ",
    nextLevel: "СЛЕДУЮЩИЙ УРОВЕНЬ",
    finish: "УСЛЫШАТЬ ФИНАЛ",
    completeTitle: "ВЫ РАЗБУДИЛИ ДЮНУ.",
    completeBody: "ТЕПЕРЬ ОНА ПОЁТ.",
    playAgain: "СЫГРАТЬ СНАЧАЛА",
    finalListening: "ДЮНА ТЕБЯ УЖЕ СЛЫШИТ.",
    finalRhythm: "ПОСЛЕДНИЙ РИТМ",
    finalByEar: "👂 ЗАПОМНИТЕ РИТМ.",
    finalAlmostAwake: "Дюна уже почти проснулась.",
    found: "НАЙДЕНО В ПЕСКЕ",
    audioLoading: "Новый голос готовится…",
    audioWarning: "Не удалось загрузить музыку.",
    audioRetry: "ПОВТОРИТЬ",
    newLayer: "НОВЫЙ СЛОЙ МУЗЫКИ",
    score: "СЧЁТ",
    levelComplete: "УРОВЕНЬ ПРОЙДЕН",
    rhythmScore: "Ритм",
    firstTryBonus: "С первой попытки",
    levelBonus: "Бонус уровня",
    total: "ИТОГО",
    perfect: "ИДЕАЛЬНО",
    great: "ОТЛИЧНО",
    good: "ХОРОШО",
    exitLabel: "Выйти из игры",
    pauseLabel: "Пауза",
    resume: "ПРОДОЛЖИТЬ",
    exitQuestion: "Выйти из игры?",
    exitWarning: "Текущий результат будет потерян.",
    stay: "ОСТАТЬСЯ",
    exit: "ВЫЙТИ",
    hintQuestion: "Слишком сложно?\nПоказать подсказку?",
    hintShow: "ПОКАЗАТЬ",
    hintTryAgain: "ЕЩЁ ПОПРОБУЮ",
    finalVoicesTogether: "Все восемь голосов звучат вместе.",
    listenToDune: "СЛУШАТЬ ДЮНУ",
    finishGame: "ЗАВЕРШИТЬ",
    pauseMusic: "Поставить музыку на паузу",
    playMusic: "Продолжить музыку",
    turnPortrait: "Поверните телефон вертикально",
  },
  en: {
    pageTitle: "Wake the Dune — a LapLapLa mini-game",
    metaDescription: "Listen to the rhythm, tap it on the sand, and wake eight musical voices of the singing dune.",
    caseLabel: "SOUND CASE #001 · THE SINGING DUNE",
    title: "WAKE THE DUNE",
    level: "LEVEL",
    firstInstruction: "LISTEN TO THE RHYTHM. THEN TAP IT ON THE SAND.",
    start: "LISTEN TO THE RHYTHM",
    listenTitle: "👂 LISTEN TO THE RHYTHM",
    listenDetail: "The dune is playing. Don’t tap yet.",
    listenDetailFirst: "The dune will play a rhythm. Don’t tap yet.",
    transitionReady: "READY?",
    playTitle: "👆 NOW YOU",
    playDetail: "Tap the same rhythm on the dune.",
    playDetailFirst: "Repeat the same rhythm by tapping the sand.",
    tapLabel: "Tap the sand",
    tapHint: "Tap the sand",
    early: "TOO EARLY!",
    asleep: "OOPS. THE DUNE FELL ASLEEP.",
    retry: "TRY THAT RHYTHM AGAIN",
    awake: "THE DUNE IS AWAKE!",
    layerUnlocked: "ANOTHER DUNE VOICE WOKE UP",
    music: "DUNE MUSIC",
    nextLevel: "NEXT LEVEL",
    finish: "HEAR THE FINALE",
    completeTitle: "YOU WOKE THE DUNE.",
    completeBody: "NOW IT SINGS.",
    playAgain: "PLAY AGAIN",
    finalListening: "THE DUNE CAN HEAR YOU NOW.",
    finalRhythm: "FINAL RHYTHM",
    finalByEar: "👂 REMEMBER THE RHYTHM.",
    finalAlmostAwake: "The dune is almost awake.",
    found: "FOUND IN THE SAND",
    audioLoading: "Preparing the new voice…",
    audioWarning: "Music could not be loaded.",
    audioRetry: "RETRY",
    newLayer: "NEW MUSIC LAYER",
    score: "SCORE",
    levelComplete: "LEVEL COMPLETE",
    rhythmScore: "Rhythm",
    firstTryBonus: "First try",
    levelBonus: "Level bonus",
    total: "TOTAL",
    perfect: "PERFECT",
    great: "GREAT",
    good: "GOOD",
    exitLabel: "Exit game",
    pauseLabel: "Pause",
    resume: "RESUME",
    exitQuestion: "Exit the game?",
    exitWarning: "Your current score will be lost.",
    stay: "STAY",
    exit: "EXIT",
    hintQuestion: "Too tricky?\nWant a hint?",
    hintShow: "SHOW HINT",
    hintTryAgain: "TRY AGAIN",
    finalVoicesTogether: "All eight voices are singing together.",
    listenToDune: "LISTEN TO THE DUNE",
    finishGame: "FINISH",
    pauseMusic: "Pause music",
    playMusic: "Resume music",
    turnPortrait: "Turn your phone upright",
  },
  he: {
    pageTitle: "להעיר את הדיונה — משחקון של LapLapLa",
    metaDescription: "הקשיבו לקצב, הקישו אותו על החול והעירו שמונה קולות מוזיקליים של הדיונה המזמרת.",
    caseLabel: "תיק צליל 001 · הדיונה המזמרת",
    title: "להעיר את הדיונה",
    level: "שלב",
    firstInstruction: "הקשיבו לקצב. אחר כך הקישו אותו על החול.",
    start: "להקשיב לקצב",
    listenTitle: "👂 מקשיבים לקצב",
    listenDetail: "עכשיו הדיונה מנגנת. עדיין לא מקישים.",
    listenDetailFirst: "הדיונה תנגן קצב. עדיין לא מקישים.",
    transitionReady: "מוכנים?",
    playTitle: "👆 עכשיו אתם",
    playDetail: "הקישו את אותו הקצב על הדיונה.",
    playDetailFirst: "חזרו על אותו הקצב בהקשות על החול.",
    tapLabel: "להקיש על החול",
    tapHint: "הקישו על החול",
    early: "מוקדם מדי!",
    asleep: "אופס. הדיונה נרדמה.",
    retry: "לנסות שוב את אותו הקצב",
    awake: "הדיונה התעוררה!",
    layerUnlocked: "עוד קול של הדיונה התעורר",
    music: "המוזיקה של הדיונה",
    nextLevel: "לשלב הבא",
    finish: "לשמוע את הסיום",
    completeTitle: "הערתם את הדיונה.",
    completeBody: "עכשיו היא שרה.",
    playAgain: "לשחק מההתחלה",
    finalListening: "הדיונה כבר שומעת אתכם.",
    finalRhythm: "הקצב האחרון",
    finalByEar: "👂 זכרו את הקצב.",
    finalAlmostAwake: "הדיונה כמעט התעוררה.",
    found: "נמצא בחול",
    audioLoading: "הקול החדש מתכונן…",
    audioWarning: "לא הצלחנו לטעון את המוזיקה.",
    audioRetry: "לנסות שוב",
    newLayer: "שכבת מוזיקה חדשה",
    score: "ניקוד",
    levelComplete: "השלב הושלם",
    rhythmScore: "קצב",
    firstTryBonus: "בניסיון הראשון",
    levelBonus: "בונוס שלב",
    total: "סך הכול",
    perfect: "מושלם",
    great: "מצוין",
    good: "טוב",
    exitLabel: "יציאה מהמשחק",
    pauseLabel: "השהיה",
    resume: "להמשיך",
    exitQuestion: "לצאת מהמשחק?",
    exitWarning: "הניקוד הנוכחי יאבד.",
    stay: "להישאר",
    exit: "לצאת",
    hintQuestion: "קצת קשה?\nרוצים רמז?",
    hintShow: "להראות רמז",
    hintTryAgain: "אנסה שוב",
    finalVoicesTogether: "כל שמונת הקולות שרים יחד.",
    listenToDune: "להקשיב לדיונה",
    finishGame: "לסיים",
    pauseMusic: "להשהות את המוזיקה",
    playMusic: "להמשיך את המוזיקה",
    turnPortrait: "סובבו את הטלפון למצב אנכי",
  },
};

export const SAND_SURPRISES = ["🌵", "🪨", "🦎", "🐾", "👓", "🦆", "🐚", "🧭", "🪶", "🔑", "🦴", "⭐"] as const;
