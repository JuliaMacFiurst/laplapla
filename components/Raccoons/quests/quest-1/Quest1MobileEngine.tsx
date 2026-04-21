import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import { buildLocalizedQuery } from "@/lib/i18n/routing";
import { useQuest1I18n } from "./i18n";
import type { PageId } from "./QuestEngine";
import { getFlightQuestions, getSailQuestions, type QuestQuestion } from "./i18n/tests";
import DialogBox from "./logic/DialogBox";
import DialogBoxStars from "./logic/DialogBoxStars";
import CockpitHint from "./flight/CockpitHint";
import PlaneWindshield, { type PlaneWindshieldRef } from "./flight/PlaneWindshield";
import InstrumentPanel from "./flight/InstrumentPanel";
import SteeringYoke from "./flight/SteeringYoke";
import { getTakeoffHints } from "./i18n/takeoffHints";
import {
  getFlightRouteDialogs,
  getSeaRouteDialogs,
  getStarRouteDialogs,
  type FlightDialogueStep,
  type SeaDialogueStep,
  type StarDialogueStep,
} from "./i18n/dialogs";
import MobileSvgDrawMap, { type MobileSvgMapHit, type MobileSvgMapPointerEvent } from "./mobile/MobileSvgDrawMap";
import countryNames from "@/utils/country_names.json";
import seaNames from "@/utils/sea_names.json";
import { starInfoList } from "@/utils/starInfo";

type MobilePageProps = {
  go: (id: PageId) => void;
};

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
  progress,
}: {
  title: string;
  children: ReactNode;
  onExit: () => void;
  progress: string;
}) {
  const { lang, t } = useQuest1I18n();

  return (
    <main className="quest-mobile-screen" dir={lang === "he" ? "rtl" : "ltr"}>
      <header className="quest-mobile-topbar">
        <button type="button" className="quest-mobile-back" onClick={onExit}>
          {t.engine.homeButton}
        </button>
        <div className="quest-mobile-progress">{progress}</div>
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
        <img src={src} alt={alt} />
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
          dangerouslySetInnerHTML={{ __html: paragraph }}
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
  const cleanText = text.replace(/<button\b[^>]*>.*?<\/button>/gis, "");

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
}: {
  questions: QuestQuestion[];
  finishTitle: string;
  finishButtonText: string;
  onFinish: () => void;
}) {
  const { lang, t } = useQuest1I18n();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const question = questions[questionIndex];
  const isLast = questionIndex >= questions.length - 1;

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
  return entry?.[lang] || entry?.ru || id;
}

function getSeaLabel(id: string, lang: "ru" | "en" | "he") {
  const entry = (seaNames as Record<string, Partial<Record<"ru" | "en" | "he", string>>>)[id];
  return entry?.[lang] || entry?.ru || id;
}

function isSeaHit(hit: MobileSvgMapHit | null) {
  return Boolean(hit?.id && hit.tagName === "path" && !hit.classNames.includes("land"));
}

function getStarHumanName(id: string) {
  const normalized = id === "Dubhe-Star" ? "Dubhe" : id;
  return starInfoList.find((star) => star.id === normalized || star.id === id)?.name || id;
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

function Day1Mobile({ go }: MobilePageProps) {
  const { t, lang } = useQuest1I18n();
  const fireRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const paragraphs = useMemo(() => flattenBlocks(t.day1.blocks), [t.day1.blocks]);
  const [started, setStarted] = useState(false);
  const [revealCount, setRevealCount] = useState(1);
  const [muted, setMuted] = useState(false);

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
              targetLabel="Svalbard"
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

    const seas = Array.from(touchedSeaIdsRef.current)
      .map((id) => getSeaLabel(id, lang))
      .filter(Boolean)
      .join(", ");

    setFeedback(
      seas
        ? t.day3Sail.mapSpeech.routeThroughSeas.replace("{seas}", seas)
        : t.day3Sail.mapSpeech.routeComplete,
    );
  };

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
              targetLabel="Svalbard"
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
      return;
    }

    const text = takeoffHints[id];
    if (text) {
      setHint(text);
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
              <CockpitHint text={hint} onClose={() => setHint(null)} />
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
          title="Spitsbergen Flight"
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
  const starRouteDialogs = useMemo(() => getStarRouteDialogs(lang), [lang]);
  const introDialogs = useMemo(() => starRouteDialogs.filter((dialog) => dialog.condition === "intro"), [starRouteDialogs]);
  const [dialogueQueue, setDialogueQueue] = useState<StarDialogueStep[]>(introDialogs);
  const [routeStep, setRouteStep] = useState<"idle" | "waiting_merak" | "waiting_dubhe" | "waiting_polaris" | "completed">("idle");
  const [routePoints, setRoutePoints] = useState<{ x: number; y: number }[]>([]);
  const [feedback, setFeedback] = useState(t.day4StarsNav.defaultSpeech);
  const [showVideo, setShowVideo] = useState(false);

  const setWrongDialog = (phase: "merak" | "dubhe", hit: MobileSvgMapHit | null) => {
    const humanName = hit?.id ? getStarHumanName(hit.id) : "no_id";
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
    const id = event.hit?.id || "";
    const info = starInfoList.find((star) => star.id === id || (id === "Dubhe-Star" && star.id === "Dubhe"));
    if (info) {
      setFeedback(`${getMobileLoganName(lang)}: «${info.name}. ${info.description}»`);
    }

    if (routeStep === "idle") {
      return;
    }

    if (routeStep === "waiting_merak") {
      if (id === "Merak-Star") {
        setRoutePoints([event.point]);
        setRouteStep("waiting_dubhe");
        setDialogueQueue(starRouteDialogs.filter((dialog) => dialog.condition === "click_merak"));
        return;
      }
      setWrongDialog("merak", event.hit);
      return;
    }

    if (routeStep === "waiting_dubhe") {
      if (id === "Dubhe-Star" || id === "Dubhe") {
        setRoutePoints((points) => [...points.slice(0, 1), event.point]);
        setRouteStep("waiting_polaris");
        setDialogueQueue(starRouteDialogs.filter((dialog) => dialog.condition === "click_dubhe"));
        return;
      }
      setWrongDialog("dubhe", event.hit);
      return;
    }

    if (routeStep === "waiting_polaris") {
      if (id === "Polar-Star") {
        setRoutePoints((points) => [...points.slice(0, 2), event.point]);
        setRouteStep("completed");
        setDialogueQueue(
          starRouteDialogs.filter(
            (dialog) => dialog.condition === "click_polaris" || dialog.id === "finish_1" || dialog.id === "finish_2",
          ),
        );
        return;
      }
      setDialogueQueue(starRouteDialogs.filter((dialog) => dialog.condition === "wrong_line"));
    }
  };

  const handleDialogNext = () => {
    const current = dialogueQueue[0];
    if (current?.id === "intro_4") {
      setRouteStep("waiting_merak");
      setDialogueQueue([]);
      return;
    }

    if (current?.id === "finish_1") {
      setShowVideo(true);
      setDialogueQueue((queue) => queue.slice(1));
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

      <div className="quest-mobile-map-workspace">
        <div className="quest-mobile-map-heading">
          {routeStep === "waiting_merak"
            ? lang === "ru"
              ? "Найди Мерак и нажми на него."
              : lang === "he"
                ? "מצאו את מראק ולחצו עליו."
                : "Find Merak and tap it."
            : routeStep === "waiting_dubhe"
              ? lang === "ru"
                ? "Теперь найди Дубхе."
                : lang === "he"
                  ? "עכשיו מצאו את דובהה."
                  : "Now find Dubhe."
              : routeStep === "waiting_polaris"
                ? lang === "ru"
                  ? "Нажми на Полярную звезду, чтобы закончить линию."
                  : lang === "he"
                    ? "לחצו על כוכב הצפון כדי להשלים את הקו."
                    : "Tap Polaris to finish the line."
                : lang === "ru"
                  ? "Прочитай диалог и начни поиск звезд."
                  : lang === "he"
                    ? "קראו את הדיאלוג והתחילו לחפש כוכבים."
                    : "Read the dialogue and start finding stars."}
        </div>
        <MobileSvgDrawMap
          mapPath="north-stars/north-stars.svg"
          routePoints={routePoints}
          routeColor="#facc15"
          routeStrokeWidth={4}
          enablePanZoom
          onPointerDown={handleStarPress}
          ignoredHitIds={MOBILE_MAP_BAD_IDS}
          loadingLabel={lang === "ru" ? "Загружаем звездную карту..." : lang === "he" ? "טוענים מפת כוכבים..." : "Loading star map..."}
          emptyLabel={lang === "ru" ? "Звездная карта не загрузилась" : lang === "he" ? "מפת הכוכבים לא נטענה" : "Star map did not load"}
        />
        <QuestMobileFeedback speaker={getMobileLoganName(lang)} text={feedback} />
      </div>

      <QuestMobileStarsDialog queue={dialogueQueue} onNext={handleDialogNext} />

      {showVideo ? (
        <>
          <div className="quest-mobile-youtube quest-mobile-youtube-polar">
            <iframe
              src="https://www.youtube.com/embed/CWf0_sdJOJI?enablejsapi=1"
              title={t.day4StarsNav.videoTitle}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
          </div>
          <QuestMobileTextReveal
            paragraphs={t.day4StarsNav.arrivalBlock}
            revealCount={t.day4StarsNav.arrivalBlock.length}
            onRevealNext={() => {}}
          />
          <button type="button" className="quest-mobile-primary" onClick={() => go("day5_spitsbergen")}>
            {t.day4StarsNav.nextButton}
          </button>
        </>
      ) : null}
    </>
  );
}

function PlaceholderMobile({
  title,
  paragraphs,
  nextLabel,
  nextPage,
  go,
}: {
  title: string;
  paragraphs: string[];
  nextLabel: string;
  nextPage: PageId;
  go: (id: PageId) => void;
}) {
  const [revealCount, setRevealCount] = useState(1);
  const isFinished = revealCount >= paragraphs.length;

  return (
    <>
      <div className="quest-mobile-placeholder-visual" aria-hidden />
      <QuestMobileTextReveal
        paragraphs={paragraphs}
        revealCount={revealCount}
        onRevealNext={() => setRevealCount((count) => Math.min(paragraphs.length, count + 1))}
      />
      {isFinished ? (
        <button type="button" className="quest-mobile-primary" onClick={() => go(nextPage)}>
          {nextLabel || title}
        </button>
      ) : null}
    </>
  );
}

export default function Quest1MobileEngine() {
  const router = useRouter();
  const { lang, t } = useQuest1I18n();
  const [pageId, setPageId] = useState<PageId>("day1");
  const [devMode, setDevMode] = useState(false);
  const pageIndex = MOBILE_PAGE_ORDER.indexOf(pageId);
  const progress = `${Math.max(1, pageIndex + 1)} / ${MOBILE_PAGE_ORDER.length}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDevMode(window.location.search.includes("dev=1"));
    }
  }, []);

  const exit = () => {
    void router.push(
      { pathname: "/raccoons", query: buildLocalizedQuery(lang, { screen: "quests" }) },
      undefined,
      { locale: lang },
    );
  };

  const renderPage = () => {
    if (pageId === "day1") return <Day1Mobile go={setPageId} />;
    if (pageId === "day2") return <Day2Mobile go={setPageId} />;
    if (pageId === "day3flight") return <Day3FlightMobile go={setPageId} />;
    if (pageId === "day3sail") return <Day3SailMobile go={setPageId} />;
    if (pageId === "day4_takeoff") return <Day4TakeoffMobile go={setPageId} />;
    if (pageId === "day4_sail") return <Day4StarsNavMobile go={setPageId} />;

    if (pageId === "day6_expedition") {
      return (
        <PlaceholderMobile
          title={t.day6.title}
          paragraphs={flattenBlocks(t.day6.blocks)}
          nextLabel={t.day6.nextButton}
          nextPage="day7_treasure_of_times"
          go={setPageId}
        />
      );
    }

    if (pageId === "day7_treasure_of_times") {
      return (
        <PlaceholderMobile
          title={t.day7.title}
          paragraphs={flattenBlocks(t.day7.blocks)}
          nextLabel={t.day7.backButton}
          nextPage="day1"
          go={() => exit()}
        />
      );
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
            setPageId(next);
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
    <QuestMobileShell title={title} onExit={exit} progress={progress}>
      {renderPage()}
      {devMode ? (
        <div className="quest-mobile-dev-nav" aria-label="Quest dev navigation">
          <button
            type="button"
            onClick={() => {
              const previous = MOBILE_PAGE_ORDER[Math.max(0, pageIndex - 1)];
              setPageId(previous);
            }}
            disabled={pageIndex <= 0}
          >
            {t.engine.prevButton}
          </button>
          <select
            value={pageId}
            onChange={(event) => setPageId(event.target.value as PageId)}
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
              setPageId(next);
            }}
            disabled={pageIndex >= MOBILE_PAGE_ORDER.length - 1}
          >
            {t.engine.nextButton}
          </button>
        </div>
      ) : null}
    </QuestMobileShell>
  );
}
