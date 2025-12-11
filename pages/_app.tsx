// pages/_app.tsx
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
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from "next/script";

export default function MyApp({ Component, pageProps }: AppProps) {
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

      <Component {...pageProps} />
      <div id="modal-root"></div>
      <div id="popup-root"></div>
    </>
  );
}