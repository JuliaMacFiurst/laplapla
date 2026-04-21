import { useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import { buildLocalizedQuery } from "@/lib/i18n/routing";
import { useQuest1I18n } from "./i18n";
import type { PageId } from "./QuestEngine";

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
  const pageIndex = MOBILE_PAGE_ORDER.indexOf(pageId);
  const progress = `${Math.max(1, pageIndex + 1)} / ${MOBILE_PAGE_ORDER.length}`;

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
    </QuestMobileShell>
  );
}
