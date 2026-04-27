import { useEffect, useState } from "react";
import type { Lang } from "@/i18n";

type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: "portrait") => Promise<void>;
  unlock?: () => void;
};

type Props = {
  lang: Lang;
  enabled: boolean;
};

const COPY = {
  ru: {
    title: "Студия работает только вертикально",
    body: "Поверни телефон обратно в портретный режим. Так не потеряются новые слайды, запись голоса и текущий прогресс.",
  },
  en: {
    title: "This studio works only in portrait mode",
    body: "Turn your phone upright again. This keeps new slides, voice recordings, and current progress from being reset.",
  },
  he: {
    title: "האולפן עובד רק במצב אנכי",
    body: "החזירו את הטלפון למצב אנכי כדי לא לאבד שקופיות חדשות, הקלטות קול והתקדמות נוכחית.",
  },
} as const;

export default function MobilePortraitLock({ lang, enabled }: Props) {
  const [isLandscape, setIsLandscape] = useState(false);
  const copy = COPY[lang] ?? COPY.ru;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setIsLandscape(false);
      return;
    }

    const sync = () => {
      const coarsePointer = window.matchMedia("(pointer: coarse) and (hover: none)").matches;
      setIsLandscape(coarsePointer && window.innerWidth > window.innerHeight);
    };

    sync();

    const orientation = window.screen.orientation as ScreenOrientationWithLock | undefined;
    const lockOrientation = orientation?.lock;
    if (typeof lockOrientation === "function") {
      void lockOrientation.call(orientation, "portrait").catch(() => {
        // iOS Safari and some in-app browsers ignore orientation lock.
      });
    }

    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      if (orientation && typeof orientation.unlock === "function") {
        orientation.unlock();
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.body.classList.toggle("mobile-portrait-lock-body", enabled && isLandscape);
    return () => {
      document.body.classList.remove("mobile-portrait-lock-body");
    };
  }, [enabled, isLandscape]);

  if (!enabled || !isLandscape) {
    return null;
  }

  return (
    <>
      <div className="mobile-portrait-lock" role="alert" aria-live="assertive">
        <div className="mobile-portrait-lock__card">
          <div className="mobile-portrait-lock__phone" aria-hidden="true">
            <span />
          </div>
          <h2>{copy.title}</h2>
          <p>{copy.body}</p>
        </div>
      </div>

      <style jsx>{`
        .mobile-portrait-lock {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background:
            radial-gradient(circle at top, rgba(255, 215, 146, 0.2), transparent 40%),
            rgba(27, 19, 12, 0.92);
          backdrop-filter: blur(8px);
        }

        .mobile-portrait-lock__card {
          width: min(100%, 420px);
          padding: 24px 22px;
          border-radius: 28px;
          background: rgba(255, 249, 242, 0.98);
          color: #2f2419;
          text-align: center;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.28);
        }

        .mobile-portrait-lock__phone {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          margin-bottom: 14px;
          border-radius: 20px;
          background: linear-gradient(180deg, #ffd08d 0%, #ff9f57 100%);
        }

        .mobile-portrait-lock__phone span {
          display: block;
          width: 24px;
          height: 40px;
          border: 3px solid rgba(47, 36, 25, 0.9);
          border-radius: 10px;
          position: relative;
        }

        .mobile-portrait-lock__phone span::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 4px;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(47, 36, 25, 0.9);
          transform: translateX(-50%);
        }

        .mobile-portrait-lock__card :global(h2) {
          margin: 0 0 10px;
          font-size: 1.45rem;
          line-height: 1.1;
        }

        .mobile-portrait-lock__card :global(p) {
          margin: 0;
          font-size: 1rem;
          line-height: 1.5;
          color: rgba(47, 36, 25, 0.82);
        }
      `}</style>

      <style jsx global>{`
        body.mobile-portrait-lock-body {
          overflow: hidden;
          touch-action: none;
        }
      `}</style>
    </>
  );
}
