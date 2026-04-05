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

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isQuestPage = router.pathname.startsWith("/quest") || router.pathname.startsWith("/quests");
  const isCatsPage = router.pathname.startsWith("/cats");
  const isExportPage = router.pathname === "/cats/export";
  const isCapybaraPage = router.pathname.startsWith("/capybara");
  const isProduction = process.env.NODE_ENV === "production";
  const isBrowserCaptureEnabled =
    !isProduction && process.env.NEXT_PUBLIC_ENABLE_BROWSER_CAPTURE === "true";
  const [lang, setLang] = useState<Lang | null>(null);

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
    document.documentElement.dir = detected === "he" ? "rtl" : "ltr";
  }, [router.query.lang, router.locale]);

  // Prevent hydration mismatch
  if (!lang) return null;
  const t = dictionaries[lang];

  return (
    <>
      <Head>
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

      <div className="app-layout">
        {!isExportPage && <TopBar lang={lang} />}
        <Component {...pageProps} lang={lang} />

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
    </>
  );
}
