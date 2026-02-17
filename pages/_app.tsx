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
import type { AppProps } from 'next/app';
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from 'next/head';
import Script from "next/script";
import { dictionaries } from "../i18n";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isQuestPage = router.pathname.startsWith("/quest");
  const isCatsPage = router.pathname.startsWith("/cats");
  const isExportPage = router.pathname === "/cats/export";
  const isCapybaraPage = router.pathname.startsWith("/capybara");
  const [lang, setLang] = useState<"ru" | "en" | "he" | null>(null);

  // Determine language once on client
  useEffect(() => {
    const queryLang = Array.isArray(router.query.lang)
      ? router.query.lang[0]
      : router.query.lang;

    const cookieMatch = document.cookie.match(/(?:^|; )laplapla_lang=([^;]+)/);
    const cookieLang = cookieMatch ? cookieMatch[1] : null;

    const detected =
      queryLang === "ru" || queryLang === "en" || queryLang === "he"
        ? queryLang
        : cookieLang === "ru" || cookieLang === "en" || cookieLang === "he"
        ? cookieLang
        : "ru";

    setLang(detected as "ru" | "en" | "he");

    // Persist to cookie
    document.cookie = `laplapla_lang=${detected}; path=/; max-age=31536000`;

    // Set dir globally
    document.documentElement.dir = detected === "he" ? "rtl" : "ltr";
  }, [router.query.lang]);

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

      <div className="app-layout">
        {!isExportPage && <TopBar lang={lang} />}
        <Component {...pageProps} lang={lang} />

        {!isQuestPage && !isExportPage && (
          <div className="footer-stack">
            <footer className="unified-footer">
              <div className="footer-left">
                <div className="footer-links">
                  <a onClick={() => router.push("/terms")}>{t.footer.terms}</a>
                  <a onClick={() => router.push("/privacy")}>{t.footer.privacy}</a>
                  <a onClick={() => router.push("/licenses")}>{t.footer.licenses}</a>
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