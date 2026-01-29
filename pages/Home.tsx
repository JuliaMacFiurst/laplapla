import { useMemo } from "react";
import { useRouter } from "next/router";

import { dictionaries, type Lang } from "../i18n";
import { VideoSection } from "../components/video/VideoSection";

export default function Home() {
  const router = useRouter();

  // Priority:
  // 1) ?lang=he|en|ru
  // 2) localStorage "laplapla_lang"
  // 3) browser language
  const lang = (Array.isArray(router.query.lang)
    ? router.query.lang[0]
    : router.query.lang) as Lang || "ru";

  const t = useMemo(() => dictionaries[lang].home, [lang]);

  // Optional: set RTL for Hebrew without touching global layout yet
  const dir = lang === "he" ? "rtl" : "ltr";

  return (
    <div className="home-wrapper" dir={dir}>
      <header className="site-header">
        {/*
        <img
          src="/laplapla-logo.webp"
          alt={t.title}
          className="site-logo"
        />
        */}
        <div className="header-text">
          <h1 className="page-title">{t.title}</h1>
          <h2 className="page-subtitle">{t.subtitle}</h2>
        </div>
      </header>

      <div className="grid">
        <div className="card" onClick={() => router.push("/cat")}> 
          <img src="/images/cat.webp" alt={t.sections.cats} />
          <div className="label">{t.sections.cats}</div>
        </div>

        <div className="card" onClick={() => router.push("/dog")}> 
          <img src="/images/dog.webp" alt={t.sections.dogs} />
          <div className="label">{t.sections.dogs}</div>
        </div>

        <div className="card" onClick={() => router.push("/capybara")}> 
          <img src="/images/capybara.webp" alt={t.sections.capybaras} />
          <div className="label">{t.sections.capybaras}</div>
        </div>

        <div className="card" onClick={() => router.push("/parrots")}> 
          <img src="/images/parrot.webp" alt={t.sections.parrots} />
          <div className="label">{t.sections.parrots}</div>
        </div>

        <div className="card" onClick={() => router.push("/raccoons")}> 
          <img src="/images/raccoon.webp" alt={t.sections.raccoons} />
          <div className="label">{t.sections.raccoons}</div>
        </div>

        <div className="card mystery-card">
          <div className="mystery-container">
            <img src="/images/paw.webp" alt="paw" className="paw" />
            <img src="/images/mystery.webp" alt="curtain" className="curtain" />
          </div>
          <div className="label">{t.sections.comingSoon}</div>
        </div>
      </div>

      <VideoSection lang={lang} />
    </div>
  );
}