// pages/_app.tsx
import TopBar from "../components/TopBar";
import '../styles/Home.css'; // глобальный стиль
import '../styles/CapybaraPage.css';
import '../styles/CatPage.css'; // Ошибка: Не удается найти модуль "../styles/ArtGalleryModal.css" или связанные с ним объявления типов.
import '../styles/DogPage.css';
import '../styles/DogLessons.css';
import '../styles/ArtGalleryModal.css';
import '../styles/ParrotMixer.css';
import '../styles/WorldMap.css'
import '../styles/Quests.css';
import '../styles/Dress-up-game.css'
import '../styles/QuestCarousel.css';
import '../styles/Dog-sled-game.css';
import '../styles/LabGame.css'
import '../styles/About.css';
import '../styles/video-section.css';
import '../styles/Studio.css';
import '../styles/export.css';
import '../styles/Puzzle.css';
import '../styles/Replay.css'
import type { AppProps } from 'next/app';
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from 'next/head';
import Script from "next/script";
import { dictionaries, Lang } from "../i18n";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";
import { fontVariableClasses } from "@/lib/fonts";
import { supabase } from "@/lib/supabase";

const ADMIN_APP_ORIGINS = [
  process.env["NEXT_PUBLIC_ADMIN_APP_ORIGIN"],
  process.env["NEXT_PUBLIC_UPLOAD_LESSON_ORIGIN"],
  process.env.NODE_ENV === "production" ? null : "http://localhost:3001",
].filter((value): value is string => Boolean(value));

type SupabaseSessionMessage = {
  type: "SUPABASE_SESSION";
  access_token: string;
  refresh_token: string;
};

function isAllowedAdminOrigin(origin: string) {
  return ADMIN_APP_ORIGINS.includes(origin);
}

function isSupabaseSessionMessage(value: unknown): value is SupabaseSessionMessage {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "SUPABASE_SESSION" &&
    typeof (value as { access_token?: unknown }).access_token === "string" &&
    typeof (value as { refresh_token?: unknown }).refresh_token === "string",
  );
}

function readSessionFromHash(hash: string) {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(normalizedHash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const isAdminHandoff = params.get("admin_handoff") === "1";

  if (!isAdminHandoff || !accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isQuestPage = router.pathname.startsWith("/quest") || router.pathname.startsWith("/quests");
  const isCatsPage = router.pathname.startsWith("/cats");
  const isExportPage = router.pathname === "/cats/export";
  const isCapybaraPage = router.pathname.startsWith("/capybara");
  const isProduction = process.env.NODE_ENV === "production";
  const showHiddenAdminLogout =
    !isProduction || router.query.debug === "true";
  const isBrowserCaptureEnabled =
    !isProduction && process.env.NEXT_PUBLIC_ENABLE_BROWSER_CAPTURE === "true";
  const [lang, setLang] = useState<Lang | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    let handoffTimeoutId: number | null = null;

    const finishAuthReady = () => {
      if (active) {
        setAuthReady(true);
      }
    };

    const initializeSessionTransfer = async () => {
      if (typeof window === "undefined") {
        finishAuthReady();
        return;
      }

      const sessionFromHash = readSessionFromHash(window.location.hash);
      if (sessionFromHash) {
        const { error } = await supabase.auth.setSession(sessionFromHash);

        if (!active) {
          return;
        }

        if (error) {
          console.warn("[admin-handoff] failed to set session from hash");
        } else {
          const cleanUrl = `${window.location.pathname}${window.location.search}`;
          window.history.replaceState(null, "", cleanUrl);
        }

        finishAuthReady();
        return;
      }

      const shouldAwaitAdminMessage =
        Boolean(window.opener) &&
        typeof document.referrer === "string" &&
        (() => {
          try {
            return isAllowedAdminOrigin(new URL(document.referrer).origin);
          } catch {
            return false;
          }
        })();

      const handleMessage = async (event: MessageEvent) => {
        if (!isAllowedAdminOrigin(event.origin) || !isSupabaseSessionMessage(event.data)) {
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: event.data.access_token,
          refresh_token: event.data.refresh_token,
        });

        if (!active) {
          return;
        }

        if (error) {
          console.warn("[admin-handoff] failed to set session");
        }

        if (handoffTimeoutId != null) {
          window.clearTimeout(handoffTimeoutId);
          handoffTimeoutId = null;
        }

        finishAuthReady();
      };

      window.addEventListener("message", handleMessage);

      if (!shouldAwaitAdminMessage) {
        finishAuthReady();
      } else {
        handoffTimeoutId = window.setTimeout(() => {
          finishAuthReady();
        }, 1500);
      }

      return () => {
        window.removeEventListener("message", handleMessage);
      };
    };

    let cleanup: (() => void) | undefined;
    void initializeSessionTransfer().then((nextCleanup) => {
      cleanup = nextCleanup;
    });

    return () => {
      active = false;
      if (handoffTimeoutId != null && typeof window !== "undefined") {
        window.clearTimeout(handoffTimeoutId);
      }
      cleanup?.();
    };
  }, []);

  // Determine language once on client
  useEffect(() => {
    const detected = getCurrentLang(router);
    setLang(detected);

    // Persist to cookie
    document.cookie = `laplapla_lang=${detected}; path=/; max-age=31536000`;
    window.localStorage.setItem("laplapla_lang", detected);
    // Backward compatibility with older pages that still read `lang`
    window.localStorage.setItem("lang", detected);

    // Set dir globally
    document.documentElement.lang = detected;
    document.documentElement.dir = detected === "he" ? "rtl" : "ltr";
  }, [router.query.lang, router.locale]);

  // Prevent hydration mismatch
  if (!lang || !authReady) return null;
  const t = dictionaries[lang];

  const handleHiddenAdminLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className={fontVariableClasses}>
      <Head>
        <meta key="viewport" name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon_io/favicon-32x32.webp" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon_io/favicon-16x16.webp" />
        <link rel="apple-touch-icon" href="/favicon_io/apple-touch-icon.webp" />
        <link rel="manifest" href="/favicon_io/site.webmanifest" />
        <link rel="icon" sizes="192x192" href="/favicon_io/android-chrome-192x192.webp" />
        <link rel="icon" sizes="512x512" href="/favicon_io/android-chrome-512x512.webp" />
      </Head>

      {isBrowserCaptureEnabled && (
        <>
          <Script id="ai-config" strategy="beforeInteractive">
            {`
              window.__BROWSER_CAPTURE_ENDPOINT__ = "http://127.0.0.1:5050/log/browser";
              window.__PROJECT_NAME__ = "capybara-tales";
            `}
          </Script>

          <Script
            strategy="afterInteractive"
            src="/js/browser-capture.js"
          />
        </>
      )}

      <div className={`app-layout${isCapybaraPage ? " app-layout-capybara" : ""}`}>
        {!isExportPage && <TopBar lang={lang} />}
        <Component {...pageProps} lang={lang} />

        {showHiddenAdminLogout ? (
          <button
            type="button"
            aria-label="Admin logout"
            onClick={() => void handleHiddenAdminLogout()}
            style={{
              position: "fixed",
              right: "8px",
              bottom: "8px",
              width: "18px",
              height: "18px",
              padding: 0,
              border: 0,
              borderRadius: "999px",
              background: "rgba(0, 0, 0, 0.08)",
              color: "transparent",
              opacity: 0.18,
              cursor: "pointer",
              zIndex: 9999,
            }}
          >
            .
          </button>
        ) : null}

        {!isQuestPage && !isExportPage && (
          <div className="footer-stack">
            <footer className="unified-footer">
              <div className="footer-left">
                <div className="footer-links">
                  <a
                    onClick={() =>
                      router.push(
                        { pathname: "/terms", query: buildLocalizedQuery(lang) },
                        undefined,
                        { locale: lang },
                      )
                    }
                  >
                    {t.footer.terms}
                  </a>
                  <a
                    onClick={() =>
                      router.push(
                        { pathname: "/privacy", query: buildLocalizedQuery(lang) },
                        undefined,
                        { locale: lang },
                      )
                    }
                  >
                    {t.footer.privacy}
                  </a>
                  <a
                    onClick={() =>
                      router.push(
                        { pathname: "/licenses", query: buildLocalizedQuery(lang) },
                        undefined,
                        { locale: lang },
                      )
                    }
                  >
                    {t.footer.licenses}
                  </a>
                </div>
                <div className="footer-copy">
                  © {new Date().getFullYear()} LapLapLa
                </div>
              </div>

             {(isCatsPage || isCapybaraPage) && (
                <div className="footer-right">
                  <div>
                    Gif's provided by{" "}
                    <a
                      href="https://www.giphy.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      GIPHY
                    </a>
                  </div>
                  <img
                    src="/giphy-logo.webp"
                    alt="GIPHY Logo"
                    className="giphy-logo"
                  />
                  <div>
                    Videos provided by{" "}
                    <a
                      href="https://www.pexels.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Pexels
                    </a>
                  </div>
                </div>
              )}
            </footer>
          </div>
        )}
      </div>
      <div id="modal-root"></div>
      <div id="popup-root"></div>
    </div>
  );
}
