import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { dictionaries, type Lang } from "../i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";

function normalizeLang(input: unknown): Lang {
  const s = (Array.isArray(input) ? input[0] : input) ?? "";
  const raw = String(s).toLowerCase();

  // Accept: ru, he, en, or locale-like values: ru-RU, he-IL, en-US
  const base = raw.split("-")[0];
  if (base === "ru" || base === "he" || base === "en") return base;
  return "ru";
}

function detectBrowserLang(): Lang {
  if (typeof window === "undefined") return "ru";
  const nav = (navigator.language || "").toLowerCase();
  return normalizeLang(nav);
}

export default function Home() {
  const router = useRouter();

  // Priority:
  // 1) ?lang=he|en|ru
  // 2) localStorage "laplapla_lang"
  // 3) browser language
  const [lang, setLang] = useState<Lang>("ru");
  const [menuHover, setMenuHover] = useState(false);

  useEffect(() => {
    const qLang = normalizeLang(router.query.lang);

    if (typeof window !== "undefined") {
      const stored = normalizeLang(window.localStorage.getItem("laplapla_lang"));
      const browser = detectBrowserLang();

      const nextLang = qLang !== "ru" || String(router.query.lang ?? "")
        ? qLang
        : (stored !== "ru" || window.localStorage.getItem("laplapla_lang")
            ? stored
            : browser);

      setLang(nextLang);
    } else {
      setLang(qLang);
    }
  }, [router.query.lang]);

  const t = useMemo(() => dictionaries[lang].home, [lang]);

  // Optional: set RTL for Hebrew without touching global layout yet
  const dir = lang === "he" ? "rtl" : "ltr";

  return (
    <div className="home-wrapper" dir={dir}>
      <div className="top-bar">
        <div
          className="menu-wrapper"
          onMouseEnter={() => setMenuHover(true)}
          onMouseLeave={() => setMenuHover(false)}
        >
          <div
            className="menu-button"
            onClick={() => router.push("/about")}
          >
            ☰
          </div>

          {menuHover && (
            <div className="menu-preview">
              <div className="menu-item">О проекте</div>
              <div className="menu-item">Для кого</div>
              <div className="menu-item">Доступ</div>
              <div className="menu-item">Язык</div>
            </div>
          )}
        </div>

        <LanguageSwitcher current={lang} />
      </div>

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
    </div>
  );
}