import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/router";
import { useOriginMode } from "@/lib/runtime/OriginModeContext";
import { buildLocalizedQuery } from "@/lib/i18n/routing";
import { useQuest1I18n } from "./i18n";
import type { PageId } from "./QuestEngine";
import { getFlightQuestions, getSailQuestions, type QuestQuestion } from "./i18n/tests";
import DialogBox from "./logic/DialogBox";
import DialogBoxStars from "./logic/DialogBoxStars";
import DialogBoxStarsInteractive from "./logic/DialogBoxStarsInteractive";
import CockpitHint from "./flight/CockpitHint";
import PlaneWindshield, { type PlaneWindshieldRef } from "./flight/PlaneWindshield";
import InstrumentPanel from "./flight/InstrumentPanel";
import SteeringYoke from "./flight/SteeringYoke";
import { getTakeoffHints } from "./i18n/takeoffHints";
import {
  getFlightRouteDialogs,
  getSeaRouteDialogs,
  getStarNavigationUi,
  getStarRouteDialogs,
  relocalizeStarDialogueQueue,
  type FlightDialogueStep,
  type SeaDialogueStep,
  type StarDialogueStep,
} from "./i18n/dialogs";
import MobileSvgDrawMap, { type MobileSvgMapHit, type MobileSvgMapPointerEvent } from "./mobile/MobileSvgDrawMap";
import CharacterStage from "./logic/dress-up-game/CharacterStage";
import FinalSummary from "./logic/dress-up-game/FinalSummary";
import MobileLabGameStage from "./logic/lab-game/MobileLabGameStage";
import DogsSledSVG from "./logic/dog-sled-game/DogsSledSVG";
import PreparationPopup from "./logic/dog-sled-game/PreparationPopup";
import StatBar from "./logic/dog-sled-game/StatBar";
import SledAnimationOverlay from "./logic/dog-sled-game/SledAnimationOverlay";
import DogSledRunStage from "./logic/dog-sled-game/DogSledRunStage";
import type { PreparationResult, SledPart } from "./logic/dog-sled-game/PreparationPopup";
import type { CharacterResult } from "@/types/types";
import countryNames from "@/utils/country_names.json";
import {
  findStarInfo,
  formatLocalizedStarFactText,
  getLocalizedStarName,
} from "@/utils/starInfo";
import { sanitizeRichText } from "@/lib/security/sanitize";
import {
  advanceStarNavigation,
  findStarNavigationTarget,
  getStarMap,
  type StarNavigationPhase,
} from "./sail/starNavigation";
import { getStarNavigationVideoEmbedUrl } from "./sail/starNavigationVideos";
import { getDay7VideoEmbedUrl } from "./videoEmbeds";
import { getInformationalStarIdAtPoint } from "./sail/starNavigationInfo";
import { useQuest1Progress } from "./useQuest1Progress";
import { formatSeaRouteMessage, localizeSeaRoute } from "./sail/seaRouteLocalization";
import { isQuest1NarrationEnabled } from "./narration/catalog";
import { QuestNarrationScope } from "./narration/availability";
import { QuestNarrationSlot, useAvailableNarrationBlocks } from "./narration/availability";
import type { NarrationBlockId } from "./narration/catalog";
import {
  DAY_1_BLOCKS,
  DAY_2_BLOCKS,
  DAY_2_CHOICE_BLOCK,
  DAY_6_BLOCKS,
  FLIGHT_STATIC_BLOCKS,
  SAIL_STATIC_BLOCKS,
  STARS_INTRO_BLOCKS,
  STATION_BLOCKS,
  TAKEOFF_STORY_BLOCKS,
  flightDialogueBlockId,
  garagePartBlockId,
  seaDialogueBlockId,
  starDialogueBlockId,
  takeoffHintBlockId,
} from "./narration/gameMappings";

type MobilePageProps = {
  go: (id: PageId) => void;
};

type MobileStationDoorId = "heat" | "lab" | "garage";
type MobileGaragePhase = "inspect" | "ride";
type MobileSledAnimation = null | "loads" | "water" | "food" | "dogs" | "skids";

const MOBILE_PAGE_ORDER: PageId[] = [
  "day1",
  "day2",
  "day3flight",
  "day3sail",
  "day4_takeoff",
  "day4_sail",
  "day5_spitsbergen",
  "day5_heat",
  "day5_lab",
  "day5_garage",
  "day6_expedition",
  "day7_treasure_of_times",
];

const MOBILE_MAP_BAD_IDS = new Set([
  "__next",
  "map-wrap",
  "route-svg",
  "route-path",
  "route-root",
  "svalbard-marker",
  "svalbard-label",
]);

function flattenBlocks(blocks: string[][]) {
  return blocks.flatMap((block) => block);
}

function QuestMobileShell({
  title,
  children,
  onExit,
  onRestart,
  restartLabel,
  progress,
}: {
  title: string;
  children: ReactNode;
  onExit: () => void;
  onRestart: () => void;
  restartLabel: string;
  progress: string;
}) {
  const { lang, t } = useQuest1I18n();

  return (
    <main
      className={`quest-mobile-screen${isQuest1NarrationEnabled ? " quest-narration-enabled" : ""}`}
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      <header className="quest-mobile-topbar">
        <button type="button" className="quest-mobile-back" onClick={onExit}>
          {t.engine.homeButton}
        </button>
        <div className="quest-mobile-progress">{progress}</div>
        <button type="button" className="quest-mobile-restart" onClick={onRestart}>
          {restartLabel}
        </button>
      </header>
      <section className="quest-mobile-content">
        <h1 className="quest-mobile-title">{title}</h1>
        {children}
      </section>
    </main>
  );
}

function QuestMobileMedia({
  src,
  type = "video",
  alt = "",
}: {
  src: string;
  type?: "video" | "image";
  alt?: string;
}) {
  return (
    <div className="quest-mobile-media">
      {type === "video" ? (
        <video src={src} autoPlay muted loop playsInline />
      ) : (
        <Image src={src} alt={alt} width={1280} height={800} unoptimized />
      )}
    </div>
  );
}

function QuestMobileTextReveal({
  paragraphs,
  revealCount,
  onRevealNext,
}: {
  paragraphs: string[];
  revealCount: number;
  onRevealNext: () => void;
}) {
  const visible = paragraphs.slice(0, revealCount);
  const hasMore = revealCount < paragraphs.length;
  const { lang } = useQuest1I18n();

  return (
    <div className="quest-mobile-story" onClick={hasMore ? onRevealNext : undefined}>
      {visible.map((paragraph, index) => (
        <p
          key={`${index}-${paragraph.slice(0, 16)}`}
          className="quest-mobile-paragraph"
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(paragraph) }}
        />
      ))}
      {hasMore ? (
        <button type="button" className="quest-mobile-tap" onClick={onRevealNext}>
          {lang === "ru" ? "Нажми, чтобы продолжить" : lang === "he" ? "לחצו להמשך" : "Tap to continue"}
        </button>
      ) : null}
    </div>
  );
}

function QuestMobileTips({ tips }: { tips: string[] }) {
  return (
    <div className="quest-mobile-tips">
      {tips.map((tip, index) => (
        <p key={`${index}-${tip.slice(0, 16)}`}>{tip}</p>
      ))}
    </div>
  );
}

function QuestMobileFeedback({
  speaker,
  text,
}: {
  speaker: string;
  text: string;
}) {
  const cleanText = sanitizeRichText(text);

  return (
    <div className="quest-mobile-feedback" aria-live="polite">
      <span>{speaker}</span>
      <p dangerouslySetInnerHTML={{ __html: cleanText }} />
    </div>
  );
}

function QuestMobileDialog({
  queue,
  onNext,
}: {
  queue: Array<FlightDialogueStep | SeaDialogueStep>;
  onNext: () => void;
}) {
  if (!queue.length) return null;

  return (
    <div className="quest-mobile-dialog-wrapper">
      <DialogBox queue={queue} onNext={onNext} />
    </div>
  );
}

function QuestMobileStarsDialog({
  queue,
  onNext,
}: {
  queue: StarDialogueStep[];
  onNext: () => void;
}) {
  if (!queue.length) return null;

  return (
    <div className="quest-mobile-dialog-wrapper">
      <DialogBoxStars queue={queue} onNext={onNext} />
    </div>
  );
}

function QuestMobileQuiz({
  questions,
  finishTitle,
  finishButtonText,
  onFinish,
  explanationBlockIds = [],
}: {
  questions: QuestQuestion[];
  finishTitle: string;
  finishButtonText: string;
  onFinish: () => void;
  explanationBlockIds?: readonly (NarrationBlockId | null)[];
}) {
  const { lang, t } = useQuest1I18n();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const question = questions[questionIndex];
  const isLast = questionIndex >= questions.length - 1;
  const explanationBlockId = explanationBlockIds[questionIndex] ?? null;
  useAvailableNarrationBlocks(
    "mobile-quiz-explanation",
    checked && question?.explanation && explanationBlockId ? [explanationBlockId] : [],
  );

  if (!question) {
    return (
      <div className="quest-mobile-quiz">
        <h2>{finishTitle}</h2>
        <button type="button" onClick={onFinish}>
          {finishButtonText}
        </button>
      </div>
    );
  }

  const selectedAnswer = selectedIndex === null ? null : question.answers[selectedIndex];
  const canContinue = checked && selectedAnswer?.correct;

  return (
    <div className="quest-mobile-quiz">
      <div className="quest-mobile-quiz-count">
        {t.miniTest.question
          .replace("{current}", String(questionIndex + 1))
          .replace("{total}", String(questions.length))}
      </div>
      <h2>{question.text}</h2>
      <div className="quest-mobile-answer-list">
        {question.answers.map((answer, index) => {
          const isSelected = selectedIndex === index;
          const stateClass = checked && isSelected
            ? answer.correct
              ? "is-correct"
              : "is-wrong"
            : checked && answer.correct
              ? "is-correct"
              : "";

          return (
            <button
              key={`${index}-${answer.text}`}
              type="button"
              className={`quest-mobile-answer ${isSelected ? "is-selected" : ""} ${stateClass}`}
              onClick={() => {
                setSelectedIndex(index);
                setChecked(false);
              }}
            >
              {answer.text}
            </button>
          );
        })}
      </div>

      {checked && question.explanation ? (
        <p className="quest-mobile-quiz-explanation">{question.explanation}</p>
      ) : null}

      <button
        type="button"
        className="quest-mobile-primary"
        disabled={selectedIndex === null}
        onClick={() => {
          if (!checked) {
            setChecked(true);
            return;
          }

          if (!canContinue) {
            return;
          }

          if (isLast) {
            onFinish();
            return;
          }

          setQuestionIndex((value) => value + 1);
          setSelectedIndex(null);
          setChecked(false);
        }}
      >
        {!checked
          ? t.miniTest.check
          : canContinue
            ? isLast
              ? finishButtonText
              : t.miniTest.next
            : lang === "ru"
              ? "Выбери другой ответ"
              : lang === "he"
                ? "בחרו תשובה אחרת"
                : "Choose another answer"}
      </button>
    </div>
  );
}

function buildFlightRoutePoints(
  start: { x: number; y: number },
  target: { x: number; y: number },
  routeType: "straight" | "arc" | "zigzag",
) {
  if (routeType === "straight") {
    return [start, target];
  }

  if (routeType === "arc") {
    return [
      start,
      { x: (start.x + target.x) / 2, y: Math.max(0.06, Math.min(start.y, target.y) - 0.28) },
      target,
    ];
  }

  return [
    start,
    { x: start.x + 0.14, y: start.y - 0.16 },
    { x: start.x + 0.24, y: start.y + 0.04 },
    { x: target.x - 0.14, y: target.y + 0.18 },
    target,
  ];
}

function getMobileLoganName(lang: string) {
  if (lang === "he") return "לוגן";
  if (lang === "en") return "Logan";
  return "Логан";
}

function getCountryLabel(id: string, lang: "ru" | "en" | "he") {
  const entry = (countryNames as Record<string, Partial<Record<"ru" | "en" | "he", string>>>)[id.toLowerCase()];
  return entry?.[lang] || id;
}

function isSeaHit(hit: MobileSvgMapHit | null) {
  return Boolean(hit?.id && hit.tagName === "path" && !hit.classNames.includes("land"));
}

function getStarHumanName(id: string, lang: "ru" | "en" | "he" = "ru") {
  const star = findStarInfo(id);
  return star ? getLocalizedStarName(star, lang) : id;
}

function getMobileStarSemanticId(hit: MobileSvgMapHit | null) {
  const target = findStarNavigationTarget(hit?.ancestorIds ?? [hit?.id]);
  if (target === "merak") return "Merak-Star";
  if (target === "dubhe") return "Dubhe-Star";
  if (target === "polaris") return "Polar-Star";
  return (hit?.ancestorIds ?? [hit?.id]).find((id): id is string => Boolean(id && findStarInfo(id))) ?? "";
}

const TAKEOFF_VIDEO_MAP: Record<string, string[]> = {
  "switcher-on-1": ["takeoff-1", "takeoff-2"],
  "switcher-on-2": ["low_altitude-forest", "low_altitude-island", "low_altitude-city"],
  "switcher-on-3": ["low_altitude-mountains", "low_altitude-north", "low_altitude-green-fields"],
  "switcher-on-4": ["takeoff-1"],
  "switcher-on-5": ["clouds-1", "clouds-2"],
  "switcher-on-6": ["clouds-3", "clouds-4"],
  "switcher-on-7": ["clouds-5"],
  "switcher-on-8": ["wind-1"],
  "switcher-on-9": ["troposphere"],
  "switcher-on-10": ["stratosphere-1", "stratosphere-2", "stratosphere-3"],
  "switcher-on-11": ["storm-1", "storm-gets-better"],
  "switcher-on-12": ["troposphere"],
  "switcher-on-13": ["turb-1"],
  "switcher-on-14": ["aurora-1"],
};

const MOBILE_STATION_DOORS: Array<{
  id: MobileStationDoorId;
  page: PageId;
  accent: string;
}> = [
  { id: "heat", page: "day5_heat", accent: "#f97316" },
  { id: "lab", page: "day5_lab", accent: "#2563eb" },
  { id: "garage", page: "day5_garage", accent: "#16a34a" },
];

const MOBILE_HEAT_CHARACTERS = [
  {
    name: "Stas",
    img: "/supabase-storage/quests/1_quest/games/dress-up/Stas/Stas.webp",
  },
  {
    name: "Clare",
    img: "/supabase-storage/quests/1_quest/games/dress-up/Clare/Clare.webp",
  },
  {
    name: "Sam",
    img: "/supabase-storage/quests/1_quest/games/dress-up/Sam/Sam.webp",
  },
  {
    name: "Matilda",
    img: "/supabase-storage/quests/1_quest/games/dress-up/Matilda/Matilda.webp",
  },
  {
    name: "Joe",
    img: "/supabase-storage/quests/1_quest/games/dress-up/Joe/Joe.webp",
  },
  {
    name: "Tamara",
    img: "/supabase-storage/quests/1_quest/games/dress-up/Tamara/Tamara.webp",
  },
];

const MOBILE_GARAGE_PARTS: SledPart[] = [
  "reins",
  "harness",
  "water",
  "food",
  "brake",
  "skids",
  "loads",
  "dogs",
];

const QUEST_MOBILE_CONFETTI = Array.from({ length: 42 }, (_, index) => ({
  id: index,
  left: `${(index * 23) % 100}%`,
  delay: `${(index % 9) * 0.11}s`,
  duration: `${1.7 + (index % 5) * 0.18}s`,
  drift: `${((index % 7) - 3) * 18}px`,
}));

function useMobileLandscape() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const update = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return isLandscape;
}

function Day1Mobile({ go }: MobilePageProps) {
  const { t, lang } = useQuest1I18n();
  const fireRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const paragraphs = useMemo(() => flattenBlocks(t.day1.blocks), [t.day1.blocks]);
  const [started, setStarted] = useState(false);
  const [revealCount, setRevealCount] = useState(1);
  const [muted, setMuted] = useState(false);
  useAvailableNarrationBlocks(
    "mobile-day1-story",
    started ? DAY_1_BLOCKS.slice(0, revealCount) : [],
  );

  const start = () => {
    setStarted(true);
    setRevealCount(1);

    if (fireRef.current) {
      fireRef.current.volume = 0.35;
      void fireRef.current.play();
    }

    if (musicRef.current) {
      musicRef.current.volume = 0.18;
      void musicRef.current.play();
    }
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (fireRef.current) fireRef.current.muted = nextMuted;
    if (musicRef.current) musicRef.current.muted = nextMuted;
  };

  const isFinished = started && revealCount >= paragraphs.length;

  return (
    <>
      <QuestMobileMedia src="/supabase-storage/quests/1_quest/images/output.webm" />
      {!started ? (
        <button type="button" className="quest-mobile-primary" onClick={start}>
          {t.day1.startButton}
        </button>
      ) : (
        <>
          <div className="quest-mobile-audio-row">
            <button type="button" className="quest-mobile-audio-toggle" onClick={toggleMute}>
              {muted
                ? lang === "ru"
                  ? "Включить звук"
                  : lang === "he"
                    ? "להפעיל צליל"
                    : "Turn sound on"
                : lang === "ru"
                  ? "Выключить звук"
                  : lang === "he"
                    ? "לכבות צליל"
                    : "Turn sound off"}
            </button>
          </div>
          <QuestMobileTextReveal
            paragraphs={paragraphs}
            revealCount={revealCount}
            onRevealNext={() => setRevealCount((count) => Math.min(paragraphs.length, count + 1))}
          />
          {isFinished ? (
            <button type="button" className="quest-mobile-primary" onClick={() => go("day2")}>
              {t.day1.nextButton}
            </button>
          ) : null}
        </>
      )}
      <audio ref={fireRef} src="/supabase-storage/quests/1_quest/sounds/fireplace.ogg" loop />
      <audio ref={musicRef} src="/supabase-storage/quests/1_quest/sounds/furry_friends.ogg" loop />
    </>
  );
}

function Day2Mobile({ go }: MobilePageProps) {
  const { t } = useQuest1I18n();
  const paragraphs = useMemo(() => flattenBlocks(t.day2.blocks), [t.day2.blocks]);
  const [revealCount, setRevealCount] = useState(1);
  const isFinished = revealCount >= paragraphs.length;
  useAvailableNarrationBlocks("mobile-day2-story", DAY_2_BLOCKS.slice(0, revealCount));
  useAvailableNarrationBlocks(
    "mobile-day2-choice",
    isFinished ? [DAY_2_CHOICE_BLOCK] : [],
  );

  return (
    <>
      <QuestMobileMedia src="/supabase-storage/quests/1_quest/images/day2.webm" />
      <QuestMobileTextReveal
        paragraphs={paragraphs}
        revealCount={revealCount}
        onRevealNext={() => setRevealCount((count) => Math.min(paragraphs.length, count + 1))}
      />
      {isFinished ? (
        <div className="quest-mobile-choice-panel">
          <h2>{t.day2.question}</h2>
          <button type="button" onClick={() => go("day3flight")}>
            {t.day2.flightOption}
          </button>
          <button type="button" onClick={() => go("day3sail")}>
            {t.day2.sailOption}
          </button>
        </div>
      ) : null}
    </>
  );
}

function Day3FlightMobile({ go }: MobilePageProps) {
  const { lang, t } = useQuest1I18n();
  const paragraphs = useMemo(() => flattenBlocks(t.day3Flight.introBlocks), [t.day3Flight.introBlocks]);
  const questions = useMemo(() => getFlightQuestions(lang), [lang]);
  const flightRouteDialogs = useMemo(() => getFlightRouteDialogs(lang), [lang]);
  const [revealCount, setRevealCount] = useState(1);
  const [startPoint, setStartPoint] = useState({ x: 0.18, y: 0.66 });
  const [routeType, setRouteType] = useState<"straight" | "arc" | "zigzag" | null>(null);
  const [dialogueQueue, setDialogueQueue] = useState<FlightDialogueStep[]>([]);
  const [feedback, setFeedback] = useState(t.day3Flight.speech.drawRoute);
  const [readyForQuiz, setReadyForQuiz] = useState(false);
  const targetPoint = { x: 0.52, y: 0.08 };
  const routePoints = routeType
    ? buildFlightRoutePoints(startPoint, targetPoint, routeType)
    : [];

  const setHomePoint = (event: MobileSvgMapPointerEvent) => {
    setStartPoint(event.point);
    setRouteType(null);
    setDialogueQueue([]);
    setReadyForQuiz(false);
    setFeedback(t.day3Flight.speech.selectType);
  };

  const selectRoute = (nextRouteType: "straight" | "arc" | "zigzag") => {
    setRouteType(nextRouteType);
    setDialogueQueue(flightRouteDialogs.filter((dialog) => dialog.condition === nextRouteType));
    setReadyForQuiz(true);
    setFeedback(t.day3Flight.speech.flyingOver.replace("{name}", "..."));
  };

  const updateFlightFeedback = useCallback((ids: string[]) => {
    if (!routeType) return;

    const routeIds = ids
      .map((id) => id.toLowerCase())
      .filter((id) => !MOBILE_MAP_BAD_IDS.has(id));

    if (!routeIds.length) {
      setFeedback(t.day3Flight.speech.overOcean);
      return;
    }

    const names = Array.from(new Set(routeIds))
      .map((id) => getCountryLabel(id, lang))
      .join(", ");

    setFeedback(t.day3Flight.speech.overCountries.replace("{names}", names));
  }, [lang, routeType, t.day3Flight.speech.overCountries, t.day3Flight.speech.overOcean]);

  const introDone = revealCount >= paragraphs.length;
  const flightDialogueBlock = flightDialogueBlockId(dialogueQueue[0]?.id);
  useAvailableNarrationBlocks("mobile-day3-flight-intro", [FLIGHT_STATIC_BLOCKS[0]]);
  useAvailableNarrationBlocks(
    "mobile-day3-flight-tools",
    introDone ? FLIGHT_STATIC_BLOCKS.slice(1) : [],
  );
  useAvailableNarrationBlocks(
    "mobile-day3-flight-dialogue",
    readyForQuiz && flightDialogueBlock ? [flightDialogueBlock] : [],
  );

  return (
    <>
      <QuestMobileMedia src="/supabase-storage/quests/1_quest/images/route.webm" />
      <QuestMobileTextReveal
        paragraphs={paragraphs}
        revealCount={revealCount}
        onRevealNext={() => setRevealCount((count) => Math.min(paragraphs.length, count + 1))}
      />

      {introDone ? (
        <>
          <QuestMobileTips tips={t.day3Flight.tips} />
          <div className="quest-mobile-map-workspace">
            <div className="quest-mobile-map-heading">
              {lang === "ru"
                ? "Нажми на карту, чтобы поставить дом. Потом выбери маршрут."
                : lang === "he"
                  ? "לחצו על המפה כדי לסמן בית, ואז בחרו מסלול."
                  : "Tap the map to place home, then choose a route."}
            </div>
            <MobileSvgDrawMap
              mapPath="countries/countries_interactive.svg"
              routePoints={routePoints}
              startPoint={startPoint}
              targetPoint={targetPoint}
              targetLabel={t.mapUi.svalbard}
              onPointerDown={setHomePoint}
              onRouteHitIdsChange={updateFlightFeedback}
              ignoredHitIds={MOBILE_MAP_BAD_IDS}
              loadingLabel={lang === "ru" ? "Загружаем карту..." : lang === "he" ? "טוענים מפה..." : "Loading map..."}
              emptyLabel={lang === "ru" ? "Карта не загрузилась" : lang === "he" ? "המפה לא נטענה" : "Map did not load"}
            />
            <div className="quest-mobile-route-buttons">
              {(["straight", "arc", "zigzag"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={routeType === key ? "is-active" : ""}
                  onClick={() => selectRoute(key)}
                >
                  {t.day3Flight.routeButtons[key]}
                </button>
              ))}
            </div>
            <QuestMobileFeedback speaker={getMobileLoganName(lang)} text={feedback} />
          </div>

          {readyForQuiz ? (
            <>
              <QuestMobileDialog
                queue={dialogueQueue}
                onNext={() => setDialogueQueue((queue) => queue.slice(1))}
              />
              <QuestMobileQuiz
                questions={questions}
                finishTitle={t.day3Flight.finishTitle}
                finishButtonText={t.day3Flight.finishButton}
                explanationBlockIds={[null, "svalbard.day03.flight.mercator-explanation.01", null]}
                onFinish={() => go("day4_takeoff")}
              />
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function Day3SailMobile({ go }: MobilePageProps) {
  const { lang, t } = useQuest1I18n();
  const paragraphs = useMemo(() => flattenBlocks(t.day3Sail.introBlocks), [t.day3Sail.introBlocks]);
  const questions = useMemo(() => getSailQuestions(lang), [lang]);
  const seaRouteDialogs = useMemo(() => getSeaRouteDialogs(lang), [lang]);
  const [revealCount, setRevealCount] = useState(1);
  const [routePoints, setRoutePoints] = useState<{ x: number; y: number }[]>([]);
  const [dialogueQueue, setDialogueQueue] = useState<SeaDialogueStep[]>(seaRouteDialogs);
  const [isDrawing, setIsDrawing] = useState(false);
  const [routeFinished, setRouteFinished] = useState(false);
  const [feedback, setFeedback] = useState(t.day3Sail.mapSpeech.startPrompt);
  const touchedSeaIdsRef = useRef<Set<string>>(new Set());
  const targetPoint = { x: 0.535, y: 0.075 };
  const startPoint = routePoints[0] ?? null;

  const isNearTarget = (point: { x: number; y: number }) =>
    Math.hypot(point.x - targetPoint.x, point.y - targetPoint.y) < 0.06;

  const addSeaHit = (hit: MobileSvgMapHit | null) => {
    if (isSeaHit(hit)) {
      touchedSeaIdsRef.current.add(hit!.id);
    }
  };

  const completeRoute = () => {
    setIsDrawing(false);
    setRouteFinished(true);

    const seas = localizeSeaRoute(touchedSeaIdsRef.current, lang);

    setFeedback(
      seas
        ? formatSeaRouteMessage(
            t.day3Sail.mapSpeech.routeThroughSeas,
            touchedSeaIdsRef.current,
            lang,
          )
        : t.day3Sail.mapSpeech.routeComplete,
    );
  };

  useEffect(() => {
    if (!routeFinished) return;
    const seas = localizeSeaRoute(touchedSeaIdsRef.current, lang);
    setFeedback(
      seas
        ? formatSeaRouteMessage(
            t.day3Sail.mapSpeech.routeThroughSeas,
            touchedSeaIdsRef.current,
            lang,
          )
        : t.day3Sail.mapSpeech.routeComplete,
    );
  }, [lang, routeFinished, t.day3Sail.mapSpeech.routeComplete, t.day3Sail.mapSpeech.routeThroughSeas]);

  const validateSeaPoint = (event: MobileSvgMapPointerEvent) => {
    if (isNearTarget(event.point)) {
      return true;
    }

    if (!isSeaHit(event.hit)) {
      setFeedback(t.day3Sail.mapSpeech.landError);
      return false;
    }

    addSeaHit(event.hit);
    return true;
  };

  const startRoute = (event: MobileSvgMapPointerEvent) => {
    if (!validateSeaPoint(event)) {
      return;
    }

    const point = event.point;
    touchedSeaIdsRef.current = new Set();
    addSeaHit(event.hit);
    setRoutePoints([point]);
    setRouteFinished(false);
    setIsDrawing(true);
    setFeedback(t.day3Sail.mapSpeech.guideToSpitsbergen);
    event.originalEvent.currentTarget.setPointerCapture(event.originalEvent.pointerId);
  };

  const drawRoute = (event: MobileSvgMapPointerEvent) => {
    if (!isDrawing || routeFinished) {
      return;
    }

    if (!validateSeaPoint(event)) {
      setIsDrawing(false);
      return;
    }

    const point = event.point;

    setRoutePoints((current) => {
      const previous = current[current.length - 1];
      if (previous && Math.hypot(previous.x - point.x, previous.y - point.y) < 0.01) {
        return current;
      }

      const next = [...current, point];
      if (isNearTarget(point)) {
        completeRoute();
      } else {
        setFeedback(t.day3Sail.mapSpeech.continueRoute);
      }
      return next;
    });
  };

  const stopRoute = (event: MobileSvgMapPointerEvent) => {
    if (!isDrawing) {
      return;
    }

    const point = event.point;
    setIsDrawing(false);

    if (isNearTarget(point)) {
      setRoutePoints((current) => [...current, point]);
      completeRoute();
      return;
    }

    setFeedback(t.day3Sail.mapSpeech.routeTooShort);
  };

  const resetRoute = () => {
    touchedSeaIdsRef.current = new Set();
    setRoutePoints([]);
    setIsDrawing(false);
    setRouteFinished(false);
    setFeedback(t.day3Sail.mapSpeech.resetPrompt);
  };

  const introDone = revealCount >= paragraphs.length;
  const sailDialogueBlock = seaDialogueBlockId(dialogueQueue[0]?.id);
  useAvailableNarrationBlocks("mobile-day3-sail-intro", [SAIL_STATIC_BLOCKS[0]]);
  useAvailableNarrationBlocks(
    "mobile-day3-sail-tools",
    introDone ? SAIL_STATIC_BLOCKS.slice(1) : [],
  );
  useAvailableNarrationBlocks(
    "mobile-day3-sail-dialogue",
    routeFinished && sailDialogueBlock ? [sailDialogueBlock] : [],
  );

  return (
    <>
      <QuestMobileMedia src="/supabase-storage/quests/1_quest/images/sail-route.webm" />
      <QuestMobileTextReveal
        paragraphs={paragraphs}
        revealCount={revealCount}
        onRevealNext={() => setRevealCount((count) => Math.min(paragraphs.length, count + 1))}
      />

      {introDone ? (
        <>
          <QuestMobileTips tips={t.day3Sail.tips} />
          <div className="quest-mobile-map-workspace">
            <div className="quest-mobile-map-heading">
              {lang === "ru"
                ? "Проведи маршрут пальцем от порта к красной точке."
                : lang === "he"
                  ? "שרטטו באצבע נתיב מהנמל אל הנקודה האדומה."
                  : "Draw a route with your finger from the port to the red point."}
            </div>
            <MobileSvgDrawMap
              mapPath="seas/seas-colored-bordered.svg"
              routePoints={routePoints}
              startPoint={startPoint}
              targetPoint={targetPoint}
              targetLabel={t.mapUi.svalbard}
              onPointerDown={startRoute}
              onPointerMove={drawRoute}
              onPointerUp={stopRoute}
              ignoredHitIds={MOBILE_MAP_BAD_IDS}
              routeColor="#ff5533"
              routeStrokeWidth={7}
              loadingLabel={lang === "ru" ? "Загружаем морскую карту..." : lang === "he" ? "טוענים מפת ים..." : "Loading sea map..."}
              emptyLabel={lang === "ru" ? "Морская карта не загрузилась" : lang === "he" ? "מפת הים לא נטענה" : "Sea map did not load"}
            />
            <div className="quest-mobile-route-buttons quest-mobile-route-buttons-single">
              <button type="button" onClick={resetRoute}>
                {t.day3Sail.mapSpeech.rebuildRoute}
              </button>
            </div>
            <QuestMobileFeedback speaker={getMobileLoganName(lang)} text={feedback} />
          </div>

          {routeFinished ? (
            <>
              <QuestMobileDialog
                queue={dialogueQueue}
                onNext={() => setDialogueQueue((queue) => queue.slice(1))}
              />
              <QuestMobileQuiz
                questions={questions}
                finishTitle={t.day3Sail.finishTitle}
                finishButtonText={t.day3Sail.finishButton}
                onFinish={() => go("day4_sail")}
              />
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function Day4TakeoffMobile({ go }: MobilePageProps) {
  const { lang, t } = useQuest1I18n();
  const windshieldRef = useRef<PlaneWindshieldRef>(null);
  const takeoffHints = useMemo(() => getTakeoffHints(lang), [lang]);
  const [angle, setAngle] = useState(0);
  const [pushPull, setPushPull] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [motionMessage, setMotionMessage] = useState("");
  const [activeSwitchId, setActiveSwitchId] = useState<string | null>(null);
  const takeoffHintId = takeoffHintBlockId(activeSwitchId);
  useAvailableNarrationBlocks("mobile-day4-takeoff-story", TAKEOFF_STORY_BLOCKS);
  useAvailableNarrationBlocks(
    "mobile-day4-takeoff-hint",
    takeoffHintId ? [takeoffHintId] : [],
  );

  useEffect(() => {
    if (!motionEnabled || typeof window === "undefined") return undefined;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0;
      const beta = event.beta ?? 45;
      setAngle(Math.max(-35, Math.min(35, gamma * 1.4)));
      setPushPull(Math.max(-20, Math.min(20, (beta - 45) * 0.9)));
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [motionEnabled]);

  const enableMotion = async () => {
    const orientationEvent = typeof window !== "undefined" ? window.DeviceOrientationEvent : undefined;
    const requestPermission = orientationEvent && "requestPermission" in orientationEvent
      ? (orientationEvent as unknown as { requestPermission: () => Promise<PermissionState> }).requestPermission
      : null;

    if (requestPermission) {
      const permission = await requestPermission();
      if (permission !== "granted") {
        setMotionMessage(
          lang === "ru"
            ? "Доступ к датчику наклона не выдан. Можно управлять обзором ползунками."
            : lang === "he"
              ? "לא ניתנה גישה לחיישן ההטיה. אפשר לשלוט במבט בעזרת המחוונים."
              : "Motion access was not granted. You can use the sliders instead.",
        );
        return;
      }
    }

    setMotionEnabled(true);
    setMotionMessage(
      lang === "ru"
        ? "Наклон включен: поворачивай телефон, чтобы менять обзор из кабины."
        : lang === "he"
          ? "ההטיה פעילה: הזיזו את הטלפון כדי לשנות את המבט מהקוקפיט."
          : "Tilt is on: move the phone to change the cockpit view.",
    );
  };

  const handleSwitch = (id: string) => {
    if (!id.startsWith("switcher-on")) {
      setHint(null);
      setActiveSwitchId(null);
      return;
    }

    const text = takeoffHints[id];
    if (text) {
      setHint(text);
      setActiveSwitchId(id);
    }

    const list = TAKEOFF_VIDEO_MAP[id];
    if (!list) return;

    const selected = list[Math.floor(Math.random() * list.length)];
    windshieldRef.current?.setVideoById(selected);
  };

  return (
    <>
      <QuestMobileTextReveal
        paragraphs={flattenBlocks([t.day4Takeoff.introBlocks[0]])}
        revealCount={t.day4Takeoff.introBlocks[0].length}
        onRevealNext={() => {}}
      />

      <div className="quest-mobile-cockpit">
        <div className="quest-mobile-windshield">
          <PlaneWindshield ref={windshieldRef} angle={angle} pushPull={pushPull} />
          {hint ? (
            <div className="quest-mobile-cockpit-hint">
              <CockpitHint text={hint} onClose={() => {
                setHint(null);
                setActiveSwitchId(null);
              }} />
            </div>
          ) : null}
        </div>

        <div className="quest-mobile-cockpit-controls">
          <div className="quest-mobile-instrument-panel">
            <InstrumentPanel onSwitch={handleSwitch} />
          </div>
          <div className="quest-mobile-yoke-container">
            <SteeringYoke
              onAngleChange={(nextAngle, nextPushPull) => {
                if (motionEnabled) return;
                setAngle(nextAngle);
                setPushPull(nextPushPull);
              }}
            />
          </div>
        </div>

        <div className="quest-mobile-motion-panel">
          <button type="button" className="quest-mobile-primary" onClick={enableMotion}>
            {motionEnabled
              ? lang === "ru"
                ? "Наклон телефона включен"
                : lang === "he"
                  ? "הטיית הטלפון פעילה"
                  : "Phone tilt is on"
              : lang === "ru"
                ? "Включить управление наклоном"
                : lang === "he"
                  ? "להפעיל שליטה בהטיה"
                  : "Enable tilt control"}
          </button>
          {motionMessage ? <p>{motionMessage}</p> : null}
          <label>
            {lang === "ru" ? "Поворот" : lang === "he" ? "סיבוב" : "Turn"}
            <input
              type="range"
              min="-35"
              max="35"
              step="1"
              value={angle}
              onChange={(event) => setAngle(Number(event.target.value))}
            />
          </label>
          <label>
            {lang === "ru" ? "Нос самолета" : lang === "he" ? "אף המטוס" : "Pitch"}
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={pushPull}
              onChange={(event) => setPushPull(Number(event.target.value))}
            />
          </label>
        </div>
      </div>

      <QuestMobileTextReveal
        paragraphs={flattenBlocks([t.day4Takeoff.introBlocks[1], t.day4Takeoff.introBlocks[2]])}
        revealCount={t.day4Takeoff.introBlocks[1].length + t.day4Takeoff.introBlocks[2].length}
        onRevealNext={() => {}}
      />

      <div className="quest-mobile-youtube">
        <iframe
          src="https://www.youtube.com/embed/5NhIRwCq428?autoplay=1&mute=1&loop=1&playlist=5NhIRwCq428&controls=0&modestbranding=1&playsinline=1&enablejsapi=1"
          title={t.day4StarsNav.videoTitle}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      </div>

      <button type="button" className="quest-mobile-primary" onClick={() => go("day5_spitsbergen")}>
        {t.day4Takeoff.nextButton}
      </button>
    </>
  );
}

function Day4StarsNavMobile({ go }: MobilePageProps) {
  const { lang, t } = useQuest1I18n();
  const starMap = getStarMap(lang);
  const navigationUi = getStarNavigationUi(lang);
  const navigationVideoUrl = getStarNavigationVideoEmbedUrl(lang);
  const starRouteDialogs = useMemo(() => getStarRouteDialogs(lang), [lang]);
  const introDialogs = useMemo(() => starRouteDialogs.filter((dialog) => dialog.condition === "intro"), [starRouteDialogs]);
  const [dialogueQueue, setDialogueQueue] = useState<StarDialogueStep[]>(introDialogs);
  const [routeStep, setRouteStep] = useState<"idle" | StarNavigationPhase>("idle");
  const [feedback, setFeedback] = useState(t.day4StarsNav.defaultSpeech);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const showVideo = routeStep === "completed";
  const starDialogueBlock = starDialogueBlockId(dialogueQueue[0]?.id);
  useAvailableNarrationBlocks("mobile-day4-stars-story", STARS_INTRO_BLOCKS);
  useAvailableNarrationBlocks(
    "mobile-day4-stars-dialogue",
    starDialogueBlock ? [starDialogueBlock] : [],
  );
  useAvailableNarrationBlocks(
    "mobile-day4-stars-arrival",
    showVideo ? ["svalbard.day04.stars.arrival.01"] : [],
  );

  const setWrongDialog = (phase: "merak" | "dubhe", hit: MobileSvgMapHit | null) => {
    const semanticId = getMobileStarSemanticId(hit);
    const humanName = semanticId ? getStarHumanName(semanticId, lang) : "no_id";
    const dialogId =
      phase === "merak"
        ? humanName === "no_id"
          ? "wrong_merak_no_id"
          : "wrong_merak_wrong_id"
        : humanName === "no_id"
          ? "wrong_dubhe_no_id"
          : "wrong_dubhe_wrong_id";

    const cloned = starRouteDialogs
      .filter((dialog) => dialog.id === dialogId)
      .map((dialog) => ({
        ...dialog,
        text: humanName === "no_id" ? dialog.text : dialog.text.replace("#id", humanName),
      }));

    setDialogueQueue(cloned);
  };

  const handleStarPress = (event: MobileSvgMapPointerEvent) => {
    const id = getMobileStarSemanticId(event.hit);
    const target = findStarNavigationTarget(event.hit?.ancestorIds ?? [event.hit?.id]);
    const informationalStarId = getInformationalStarIdAtPoint(
      event.originalEvent.currentTarget,
      event.originalEvent.clientX,
      event.originalEvent.clientY,
    );
    if (informationalStarId) {
      setSelectedStarId(informationalStarId);
      return;
    }
    if (routeStep === "idle") {
      return;
    }

    if (routeStep === "find_merak") {
      if (target === "merak") {
        setSelectedStarId(id);
        setRouteStep(advanceStarNavigation(routeStep, target));
        setDialogueQueue(starRouteDialogs.filter((dialog) => dialog.condition === "click_merak"));
        return;
      }
      setWrongDialog("merak", event.hit);
      return;
    }

    if (routeStep === "find_dubhe") {
      if (target === "dubhe") {
        setSelectedStarId(id);
        setRouteStep(advanceStarNavigation(routeStep, target));
        setDialogueQueue(starRouteDialogs.filter((dialog) => dialog.condition === "click_dubhe"));
        return;
      }
      setWrongDialog("dubhe", event.hit);
      return;
    }

    if (routeStep === "find_polaris") {
      if (target === "polaris") {
        setSelectedStarId(id);
        setRouteStep(advanceStarNavigation(routeStep, target));
        setDialogueQueue(
          starRouteDialogs.filter(
            (dialog) => dialog.condition === "click_polaris" || dialog.id === "finish_1" || dialog.id === "finish_2",
          ),
        );
        return;
      }
      setDialogueQueue(starRouteDialogs.filter((dialog) => dialog.id === "wrong_polaris"));
    }
  };

  useEffect(() => {
    const fact = selectedStarId ? formatLocalizedStarFactText(selectedStarId, lang) : null;
    setFeedback(fact || t.day4StarsNav.defaultSpeech);
  }, [lang, selectedStarId, t.day4StarsNav.defaultSpeech]);

  useEffect(() => {
    setDialogueQueue((queue) => relocalizeStarDialogueQueue(queue, lang, selectedStarId));
  }, [lang, selectedStarId]);

  const handleDialogNext = () => {
    const current = dialogueQueue[0];
    if (current?.id === "intro_4") {
      setRouteStep("find_merak");
      setSelectedStarId(null);
      setDialogueQueue([]);
      return;
    }

    setDialogueQueue((queue) => queue.slice(1));
  };

  return (
    <>
      <QuestMobileMedia src="/supabase-storage/quests/1_quest/images/svensen-with-compass.webm" />
      <QuestMobileTextReveal
        paragraphs={flattenBlocks(t.day4StarsNav.introBlocks)}
        revealCount={flattenBlocks(t.day4StarsNav.introBlocks).length}
        onRevealNext={() => {}}
      />

      <div className="quest-mobile-map-workspace quest-mobile-map-workspace--stars">
        <div className="quest-mobile-stars-scene" dir="ltr">
          <video className="quest-raccoon-stars-video" aria-hidden="true" autoPlay muted loop playsInline src="/supabase-storage/quests/1_quest/images/sailor-raccoon.webm" />
          <MobileSvgDrawMap
            mapPath={starMap.path}
            mapSource={starMap.source}
            starNavigationPhase={routeStep}
            highlightIds={[
              ...(routeStep !== "idle" && routeStep !== "find_merak" ? ["Merak-Star"] : []),
              ...(["find_polaris", "completed"].includes(routeStep) ? ["Dubhe-Star"] : []),
              ...(routeStep === "completed" ? ["Polar-Star"] : []),
            ]}
            enablePanZoom
            onPointerDown={handleStarPress}
            ignoredHitIds={MOBILE_MAP_BAD_IDS}
            loadingLabel={lang === "ru" ? "Загружаем звездную карту..." : lang === "he" ? "טוענים מפת כוכבים..." : "Loading star map..."}
            emptyLabel={lang === "ru" ? "Звездная карта не загрузилась" : lang === "he" ? "מפת הכוכבים לא נטענה" : "Star map did not load"}
          />
          <video className="quest-svensen-video" aria-hidden="true" autoPlay muted loop playsInline src="/supabase-storage/quests/1_quest/images/svensen-talks.webm" />
        </div>
        {routeStep !== "idle" && routeStep !== "completed" && (
          <div className="star-navigation-status" dir={lang === "he" ? "rtl" : "ltr"} role="status">
            <p className="star-navigation-instruction">{navigationUi[routeStep]}</p>
          </div>
        )}
        <QuestMobileFeedback speaker={getMobileLoganName(lang)} text={feedback} />
      </div>

      {routeStep === "idle" ? (
        <QuestMobileStarsDialog queue={dialogueQueue} onNext={handleDialogNext} />
      ) : (
        <div className="quest-mobile-dialog-wrapper">
          {dialogueQueue.map((line) => <DialogBoxStarsInteractive key={line.id} queue={[line]} />)}
        </div>
      )}

      <QuestNarrationSlot />

      {showVideo && <QuestMobileTextReveal paragraphs={t.day4StarsNav.arrivalBlock} revealCount={t.day4StarsNav.arrivalBlock.length} onRevealNext={() => {}} />}

      {showVideo && (
        <div className="star-navigation-completion" dir={lang === "he" ? "rtl" : "ltr"}>
          {navigationVideoUrl ? <div className="quest-mobile-youtube quest-mobile-youtube-polar">
            <iframe src={navigationVideoUrl} title={t.day4StarsNav.videoTitle} allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
          </div> : <p className="quest-video-unavailable" role="status">{navigationUi.videoUnavailable}</p>}
          <button type="button" className="quest-mobile-primary" onClick={() => go("day5_spitsbergen")}>{t.day4StarsNav.nextButton}</button>
        </div>
      )}
    </>
  );
}

function Day5SpitsbergenMobile({ go }: MobilePageProps) {
  const { lang, t } = useQuest1I18n();
  const [openingDoor, setOpeningDoor] = useState<MobileStationDoorId | null>(null);
  const paragraphs = useMemo(() => flattenBlocks(t.day5Spitsbergen.blocks), [t.day5Spitsbergen.blocks]);
  const introParagraphs = paragraphs.slice(0, 3);
  const detailParagraphs = paragraphs.slice(3);
  useAvailableNarrationBlocks("mobile-day5-station", STATION_BLOCKS);

  const getDoorLabel = (id: MobileStationDoorId) => {
    if (id === "heat") return t.day5Spitsbergen.labels.heat;
    if (id === "lab") return t.day5Spitsbergen.labels.lab;
    return t.day5Spitsbergen.labels.garage;
  };

  const getDoorDescription = (id: MobileStationDoorId) => {
    if (id === "heat") {
      return lang === "ru"
        ? "Одежда, тепло и защита от полярного холода."
        : lang === "he"
          ? "לבוש, חום והגנה מהקור הקוטבי."
          : "Clothing, warmth, and protection from polar cold.";
    }

    if (id === "lab") {
      return lang === "ru"
        ? "Приборы, инструменты и проверка экспедиционного набора."
        : lang === "he"
          ? "מכשירים, כלים ובדיקת ציוד המשלחת."
          : "Instruments, tools, and expedition kit checks.";
    }

    return lang === "ru"
      ? "Техника, сани и подготовка к выезду на лёд."
      : lang === "he"
        ? "כלי רכב, מזחלות והכנה ליציאה אל הקרח."
        : "Vehicles, sleds, and preparation for the ice route.";
  };

  const openDoor = (door: MobileStationDoorId, page: PageId) => {
    setOpeningDoor(door);
    window.setTimeout(() => go(page), 320);
  };

  return (
    <>
      <QuestMobileTextReveal
        paragraphs={introParagraphs}
        revealCount={introParagraphs.length}
        onRevealNext={() => {}}
      />

      <section className="quest-mobile-station" aria-label={t.day5Spitsbergen.title}>
        <div className="quest-mobile-station-visual">
          <Image
            src="/supabase-storage/quests/1_quest/images/Spitzbergen-station.webp"
            alt={t.day5Spitsbergen.stationImageAlt}
            width={1616}
            height={909}
            unoptimized
          />
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="station-video-element"
            src="/supabase-storage/quests/1_quest/images/tourists-group.webm"
            onLoadedData={(event) => {
              void event.currentTarget.play().catch(() => {});
            }}
          />
          {MOBILE_STATION_DOORS.map((door) => (
            <button
              key={`visual-${door.id}`}
              type="button"
              className={`quest-mobile-station-visual-door quest-mobile-station-visual-door--${door.id} ${
                openingDoor === door.id ? "is-opening" : ""
              }`}
              onClick={() => openDoor(door.id, door.page)}
              aria-label={getDoorLabel(door.id)}
            >
              <span className="quest-mobile-station-visual-door-inner" />
            </button>
          ))}
        </div>

        <div className="quest-mobile-station-doors">
          {MOBILE_STATION_DOORS.map((door, index) => (
            <button
              key={door.id}
              type="button"
              className={`quest-mobile-station-door ${openingDoor === door.id ? "is-opening" : ""}`}
              style={{ "--station-door-accent": door.accent } as CSSProperties}
              onClick={() => openDoor(door.id, door.page)}
            >
              <span className="quest-mobile-station-door-number">{index + 1}</span>
              <span className="quest-mobile-station-door-copy">
                <strong>{getDoorLabel(door.id)}</strong>
                <span>{getDoorDescription(door.id)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {detailParagraphs.length ? (
        <QuestMobileTextReveal
          paragraphs={detailParagraphs}
          revealCount={detailParagraphs.length}
          onRevealNext={() => {}}
        />
      ) : null}

      <button type="button" className="quest-mobile-primary" onClick={() => go("day6_expedition")}>
        {t.day5Spitsbergen.nextButton}
      </button>
    </>
  );
}

function Day5HeatMobile({ go }: MobilePageProps) {
  const { lang, t } = useQuest1I18n();
  const isLandscape = useMobileLandscape();
  const [results, setResults] = useState<CharacterResult[]>([]);
  const [showFinal, setShowFinal] = useState(false);

  const rotateTitle =
    lang === "ru"
      ? "Поверни телефон боком"
      : lang === "he"
        ? "סובבו את הטלפון לרוחב"
        : "Turn your phone sideways";

  const rotateText =
    lang === "ru"
      ? "Тепловой модуль работает в альбомном режиме: так видно персонажа, одежду и ленту снаряжения."
      : lang === "he"
        ? "מודול החום פועל במצב אופקי: כך רואים את הדמות, הבגדים ומסוע הציוד."
        : "The thermal module works in landscape mode so the character, clothes, and gear belt fit on screen.";

  return (
    <div className="quest-mobile-heat-shell">
      {!isLandscape ? (
        <div className="quest-mobile-landscape-gate" role="status" aria-live="polite">
          <div className="quest-mobile-landscape-phone" aria-hidden>
            <span />
          </div>
          <h2>{rotateTitle}</h2>
          <p>{rotateText}</p>
          <button type="button" className="quest-mobile-primary" onClick={() => go("day5_spitsbergen")}>
            {t.day5Heat.backButton}
          </button>
        </div>
      ) : (
        <div className="quest-mobile-heat-game">
          <button
            type="button"
            className="quest-mobile-heat-back"
            onClick={() => go("day5_spitsbergen")}
          >
            {t.day5Heat.backButton}
          </button>
          {!showFinal ? (
            <CharacterStage
              characters={MOBILE_HEAT_CHARACTERS}
              onCharacterSelected={() => {}}
              onStartGame={() => {}}
              onCharacterFinished={(result) => {
                setResults((prev) => {
                  const next = [...prev, result];
                  if (next.length === MOBILE_HEAT_CHARACTERS.length) {
                    setShowFinal(true);
                  }
                  return next;
                });
              }}
            />
          ) : (
            <FinalSummary
              results={results}
              onRestart={() => {
                setResults([]);
                setShowFinal(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Day5LabMobile({ go }: MobilePageProps) {
  const { t } = useQuest1I18n();

  return (
    <>
      <QuestMobileTextReveal
        paragraphs={[t.day5Lab.subtitle]}
        revealCount={1}
        onRevealNext={() => {}}
      />
      <MobileLabGameStage />
      <button
        type="button"
        className="quest-mobile-primary"
        onClick={() => go("day5_spitsbergen")}
      >
        {t.day5Lab.backButton}
      </button>
    </>
  );
}

function Day5GarageMobile({ go }: MobilePageProps) {
  const { lang, t } = useQuest1I18n();
  const isLandscape = useMobileLandscape();
  const [phase, setPhase] = useState<MobileGaragePhase>("inspect");
  const [activePart, setActivePart] = useState<SledPart | null>(null);
  const [partsOpen, setPartsOpen] = useState(false);
  const [showRideWarning, setShowRideWarning] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState<MobileSledAnimation>(null);
  const [prep, setPrep] = useState<PreparationResult>({
    speedModifier: 0.1,
    stability: 0.1,
    stamina: 0.5,
    risk: 1,
  });
  const garageBlock = garagePartBlockId(activePart);
  useAvailableNarrationBlocks(
    "mobile-day5-garage-part",
    isLandscape && phase === "inspect" && garageBlock ? [garageBlock] : [],
  );

  function statLevel(value: number) {
    if (value >= 0.9) return "is-max" as const;
    if (value < 0.3) return "is-danger" as const;
    if (value < 0.6) return "is-warning" as const;
    return "is-ok" as const;
  }

  function mapPartToAnimation(part: SledPart): MobileSledAnimation {
    switch (part) {
      case "loads":
      case "water":
      case "food":
      case "dogs":
      case "skids":
        return part;
      default:
        return null;
    }
  }

  function applyGaragePatch(patch: Partial<PreparationResult>) {
    setPrep((prev) => {
      const keys: Array<keyof PreparationResult> = ["speedModifier", "stability", "stamina", "risk"];
      const next = { ...prev };

      keys.forEach((key) => {
        next[key] = Math.min(1, Math.max(0, prev[key] + (patch[key] ?? 0)));
      });

      return next;
    });
  }

  function isDangerous(nextPrep: PreparationResult) {
    return nextPrep.risk > 0.7 || nextPrep.stability < 0.3 || nextPrep.stamina < 0.3;
  }

  const rotateTitle =
    lang === "ru"
      ? "Поверни телефон боком"
      : lang === "he"
        ? "סובבו את הטלפון לרוחב"
        : "Turn your phone sideways";

  const rotateText =
    lang === "ru"
      ? "Гараж и заезд работают в альбомном режиме: так помещаются сани, шкалы и управление."
      : lang === "he"
        ? "הגרז' והנסיעה פועלים במצב אופקי: כך המזחלת, המדדים והשליטה נכנסים למסך."
        : "The garage and ride work in landscape mode so the sled, stats, and controls fit on screen.";

  if (!isLandscape) {
    return (
      <div className="quest-mobile-landscape-gate" role="status" aria-live="polite">
        <div className="quest-mobile-landscape-phone" aria-hidden>
          <span />
        </div>
        <h2>{rotateTitle}</h2>
        <p>{rotateText}</p>
        <button type="button" className="quest-mobile-primary" onClick={() => go("day5_spitsbergen")}>
          {t.day5Garage.backButton}
        </button>
      </div>
    );
  }

  return (
    <div className="quest-mobile-garage-game">
      <button
        type="button"
        className="quest-mobile-garage-back"
        onClick={() => {
          if (phase === "ride") {
            setPhase("inspect");
            return;
          }
          go("day5_spitsbergen");
        }}
      >
        {phase === "ride" ? t.engine.prevButton : t.day5Garage.backButton}
      </button>

      {phase === "inspect" ? (
        <div className="quest-mobile-garage-inspect">
          <div className="quest-mobile-garage-scene">
            <DogsSledSVG
              activePart={activePart}
              onSelect={(part) => setActivePart(part)}
            />
            <SledAnimationOverlay
              animation={activeAnimation}
              onFinished={() => setActiveAnimation(null)}
            />
          </div>

          <button
            type="button"
            className={`quest-mobile-garage-parts-toggle ${partsOpen ? "is-open" : ""}`}
            onClick={() => setPartsOpen((value) => !value)}
            aria-expanded={partsOpen}
            aria-controls="quest-mobile-garage-parts"
          >
            {partsOpen ? "›" : "‹"}
          </button>

          <aside
            id="quest-mobile-garage-parts"
            className={`quest-mobile-garage-parts ${partsOpen ? "is-open" : ""}`}
            aria-label={t.day5Garage.title}
          >
            {MOBILE_GARAGE_PARTS.map((part) => (
              <button
                key={part}
                type="button"
                className={activePart === part ? "is-active" : ""}
                onClick={() => {
                  setActivePart(part);
                  setPartsOpen(false);
                }}
              >
                {t.day5Garage.popup.parts[part]}
              </button>
            ))}
          </aside>

          <div className="garage-stats-panel quest-mobile-garage-stats">
            <StatBar
              values={{
                stability: prep.stability,
                stamina: prep.stamina,
                speed: prep.speedModifier,
                risk: prep.risk,
              }}
              levels={{
                stability: statLevel(prep.stability),
                stamina: statLevel(prep.stamina),
                speed: statLevel(prep.speedModifier),
                risk: statLevel(prep.risk),
              }}
            />
          </div>

          <button
            type="button"
            className="garage-start-ride-btn quest-mobile-garage-start"
            onClick={() => {
              if (isDangerous(prep)) {
                setShowRideWarning(true);
                return;
              }
              setPhase("ride");
            }}
          >
            {t.day5Garage.startRide}
          </button>

          {activePart ? (
            <PreparationPopup
              activePart={activePart}
              prep={prep}
              onApply={applyGaragePatch}
              onClose={() => setActivePart(null)}
              onPlayAnimation={(part) => {
                setActiveAnimation(mapPartToAnimation(part));
              }}
            />
          ) : null}

          {showRideWarning ? (
            <div className="garage-warning-overlay quest-mobile-garage-warning">
              <div className="garage-warning-popup">
                <h2>{t.day5Garage.warningTitle}</h2>
                <p>{t.day5Garage.warningText}</p>
                <div className="garage-warning-actions">
                  <button type="button" onClick={() => setShowRideWarning(false)}>
                    {t.day5Garage.warningBack}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setShowRideWarning(false);
                      setPhase("ride");
                    }}
                  >
                    {t.day5Garage.warningRisk}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="quest-mobile-garage-ride">
          <DogSledRunStage
            prep={prep}
            mobileControls
            onExit={() => setPhase("inspect")}
          />
        </div>
      )}
    </div>
  );
}

function Day6ExpeditionMobile({ go }: MobilePageProps) {
  const { t } = useQuest1I18n();
  const paragraphs = useMemo(() => flattenBlocks(t.day6.blocks), [t.day6.blocks]);
  useAvailableNarrationBlocks("mobile-day6-story", DAY_6_BLOCKS);

  return (
    <>
      <QuestMobileMedia src="/supabase-storage/quests/1_quest/images/expedition.webm" />
      <QuestMobileTextReveal
        paragraphs={paragraphs}
        revealCount={paragraphs.length}
        onRevealNext={() => {}}
      />
      <button
        type="button"
        className="quest-mobile-primary"
        onClick={() => go("day7_treasure_of_times")}
      >
        {t.day6.nextButton}
      </button>
    </>
  );
}

function Day7TreasureMobile() {
  const router = useRouter();
  const originMode = useOriginMode();
  const { lang, t } = useQuest1I18n();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const paragraphs = useMemo(() => flattenBlocks(t.day7.blocks), [t.day7.blocks]);
  useAvailableNarrationBlocks("mobile-day7-ending", ["svalbard.day07.ending.01"]);

  const goToMap = useCallback(() => {
    void router.push(
      { pathname: originMode === "WEB" ? "/shop" : "/raccoons", query: buildLocalizedQuery(lang) },
      undefined,
      { locale: lang },
    );
  }, [lang, router, originMode]);

  const finishQuest = () => {
    if (celebrating) return;

    setCelebrating(true);
    const audio = audioRef.current;

    if (!audio) {
      window.setTimeout(goToMap, 1800);
      return;
    }

    audio.currentTime = 0;
    const playback = audio.play();

    if (playback) {
      playback.catch(() => {
        window.setTimeout(goToMap, 1800);
      });
    }
  };

  return (
    <div className={`quest-mobile-final ${celebrating ? "is-celebrating" : ""}`}>
      <div className="quest-mobile-final-video">
        <iframe
          src={getDay7VideoEmbedUrl(lang)}
          title={t.day7.videoTitle}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      </div>

      {lang !== "ru" && t.day7.videoTranslationNotice ? (
        <p className="quest-mobile-video-note">{t.day7.videoTranslationNotice}</p>
      ) : null}

      <QuestMobileTextReveal
        paragraphs={paragraphs}
        revealCount={paragraphs.length}
        onRevealNext={() => {}}
      />

      <button
        type="button"
        className="quest-mobile-primary quest-mobile-final-button"
        onClick={finishQuest}
        disabled={celebrating}
      >
        {t.day7.backButton}
      </button>

      {celebrating ? (
        <div className="quest-mobile-confetti" aria-hidden>
          {QUEST_MOBILE_CONFETTI.map((piece) => (
            <span
              key={piece.id}
              style={{
                "--confetti-left": piece.left,
                "--confetti-delay": piece.delay,
                "--confetti-duration": piece.duration,
                "--confetti-drift": piece.drift,
              } as CSSProperties}
            />
          ))}
        </div>
      ) : null}

      <audio
        ref={audioRef}
        src="/sounds/finish-quest-sound.ogg"
        preload="auto"
        onEnded={goToMap}
      />
    </div>
  );
}

export default function Quest1MobileEngine() {
  const router = useRouter();
  const originMode = useOriginMode();
  const { lang, t } = useQuest1I18n();
  const { pageId, go, restart } = useQuest1Progress();
  const [devMode, setDevMode] = useState(false);
  const pageIndex = MOBILE_PAGE_ORDER.indexOf(pageId);
  const progress = `${Math.max(1, pageIndex + 1)} / ${MOBILE_PAGE_ORDER.length}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDevMode(window.location.search.includes("dev=1"));
    }
  }, []);

  const exit = useCallback(() => {
    void router.replace(
      { pathname: originMode === "WEB" ? "/shop" : "/raccoons", query: buildLocalizedQuery(lang) },
      undefined,
      { locale: lang },
    );
  }, [lang, router, originMode]);

  const renderPage = () => {
    if (pageId === "day1") return <Day1Mobile go={go} />;
    if (pageId === "day2") return <Day2Mobile go={go} />;
    if (pageId === "day3flight") return <Day3FlightMobile go={go} />;
    if (pageId === "day3sail") return <Day3SailMobile go={go} />;
    if (pageId === "day4_takeoff") return <Day4TakeoffMobile go={go} />;
    if (pageId === "day4_sail") return <Day4StarsNavMobile go={go} />;
    if (pageId === "day5_spitsbergen") return <Day5SpitsbergenMobile go={go} />;
    if (pageId === "day5_heat") return <Day5HeatMobile go={go} />;
    if (pageId === "day5_lab") return <Day5LabMobile go={go} />;
    if (pageId === "day5_garage") return <Day5GarageMobile go={go} />;

    if (pageId === "day6_expedition") {
      return <Day6ExpeditionMobile go={go} />;
    }

    if (pageId === "day7_treasure_of_times") {
      return <Day7TreasureMobile />;
    }

    return (
      <div className="quest-mobile-coming-step">
        <div className="quest-mobile-placeholder-visual" aria-hidden />
        <p>
          {lang === "ru"
            ? "Этот этап уже готовится для мобильного режима. Сейчас можно пройти первые шаги квеста и проверить новый формат."
            : lang === "he"
              ? "השלב הזה כבר בהכנה למצב מובייל. כרגע אפשר לעבור את הצעדים הראשונים ולבדוק את הפורמט החדש."
              : "This step is being prepared for mobile mode. For now, the first quest steps are available in the new format."}
        </p>
        <button
          type="button"
          className="quest-mobile-primary"
          onClick={() => {
            const next = MOBILE_PAGE_ORDER[Math.min(MOBILE_PAGE_ORDER.length - 1, pageIndex + 1)];
            go(next);
          }}
        >
          {t.engine.nextButton}
        </button>
      </div>
    );
  };

  const title =
    pageId === "day1"
      ? t.day1.title
      : pageId === "day3flight"
        ? t.day3Flight.title
        : pageId === "day3sail"
          ? t.day3Sail.title
          : pageId === "day4_takeoff"
            ? t.day4Takeoff.title
            : pageId === "day4_sail"
              ? t.day4StarsNav.title
              : pageId === "day5_spitsbergen"
                ? t.day5Spitsbergen.title
                : pageId === "day5_heat"
                  ? t.day5Heat.title
                  : pageId === "day5_lab"
                    ? t.day5Lab.title
                    : pageId === "day5_garage"
                      ? t.day5Garage.title
                      : pageId === "day6_expedition"
                        ? t.day6.title
                        : pageId === "day7_treasure_of_times"
                          ? t.day7.title
                          : t.day2.question;

  return (
    <QuestNarrationScope key={pageId} pageId={pageId} locale={lang}>
      <QuestMobileShell
        title={title}
        onExit={exit}
        onRestart={restart}
        restartLabel={t.day5Lab.gameFinal.restartButton}
        progress={progress}
      >
        {renderPage()}
        {devMode ? (
        <div className="quest-mobile-dev-nav" aria-label="Quest dev navigation">
          <button
            type="button"
            onClick={() => {
              const previous = MOBILE_PAGE_ORDER[Math.max(0, pageIndex - 1)];
              go(previous);
            }}
            disabled={pageIndex <= 0}
          >
            {t.engine.prevButton}
          </button>
          <select
            value={pageId}
            onChange={(event) => go(event.target.value as PageId)}
          >
            {MOBILE_PAGE_ORDER.map((id, index) => (
              <option key={id} value={id}>
                {index + 1}. {id}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const next = MOBILE_PAGE_ORDER[Math.min(MOBILE_PAGE_ORDER.length - 1, pageIndex + 1)];
              go(next);
            }}
            disabled={pageIndex >= MOBILE_PAGE_ORDER.length - 1}
          >
            {t.engine.nextButton}
          </button>
        </div>
        ) : null}
      </QuestMobileShell>
    </QuestNarrationScope>
  );
}
