import { useRouter } from "next/router";
import { useState, useRef } from "react";
import { ABOUT_SECTIONS, dictionaries } from "../i18n";
import { Lang } from "../i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import HomeButton from "./HomeButton";
import { buildLocalizedPublicPath, buildLocalizedQuery } from "@/lib/i18n/routing";
import { useIsMobile } from "@/hooks/useIsMobile";
import Link from "next/link";

type TopBarProps = {
  lang: Lang;
};

export default function TopBar({ lang }: TopBarProps) {
  const router = useRouter();
  const isHome = router.pathname === "/";
  const isQuestPage = router.pathname.startsWith("/quest") || router.pathname.startsWith("/quests");
  const isMobile = useIsMobile();

  const [menuHover, setMenuHover] = useState(false);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  const openMenu = () => {
    if (isMobile) {
      return;
    }

    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setMenuHover(true);
  };

  const scheduleCloseMenu = () => {
    if (isMobile) {
      setMenuHover(false);
      return;
    }

    closeTimeout.current = setTimeout(() => {
      setMenuHover(false);
    }, 200);
  };

  const navigateToAbout = () => {
    setMenuHover(false);
    router.push(
      {
        pathname: "/about",
        query: buildLocalizedQuery(lang),
      },
      undefined,
      { locale: lang },
    );
  };

  return (
    <div className="top-bar">
      {/* Левая/основная зона */}
      {isHome ? (
        <div className="top-bar-home-menu-cluster">
          <Link
            className="top-bar-install-link"
            href={buildLocalizedPublicPath("/install", lang)}
            aria-label={dictionaries[lang].home.installBanner}
          >
            <span className="top-bar-install-emoji" aria-hidden="true">📲</span>
            <span className="top-bar-install-text">{dictionaries[lang].home.installBanner}</span>
          </Link>

          <div
            className="menu-wrapper"
            onMouseEnter={openMenu}
            onMouseLeave={scheduleCloseMenu}
          >
            <div
              className="menu-button"
              onClick={navigateToAbout}
            >
              ☰
            </div>

            {!isMobile && menuHover && (
              <div
                className="menu-preview"
                onMouseEnter={openMenu}
                onMouseLeave={scheduleCloseMenu}
              >
                {ABOUT_SECTIONS.map((key) => (
                  <div
                    key={key}
                    className="menu-item"
                    onClick={() =>
                      router.push(
                        {
                          pathname: `/about/${key}`,
                          query: buildLocalizedQuery(lang),
                        },
                        undefined,
                        { locale: lang },
                      )
                    }
                  >
                    {dictionaries[lang].about[key].title}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : !isQuestPage ? (
        <HomeButton />
      ) : (
        <div aria-hidden />
      )}

      {/* Правая зона — магазин и язык */}
      <div className="top-bar-actions">
        <Link
          href={buildLocalizedPublicPath("/shop", lang)}
          className="top-bar-shop-link"
          style={{
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
            color: "var(--color-text, #333)",
            fontWeight: 600,
            marginRight: lang === "he" ? 0 : "1rem",
            marginLeft: lang === "he" ? "1rem" : 0,
            padding: "0.25rem 0.75rem",
            backgroundColor: "var(--color-accent-light, rgba(255,122,89,0.1))",
            borderRadius: "9999px",
            transition: "transform 0.2s ease, opacity 0.2s ease"
          }}
          aria-label={dictionaries[lang].shop.navTitle}
        >
          <span aria-hidden="true" style={{ marginRight: lang === "he" ? 0 : "0.35rem", marginLeft: lang === "he" ? "0.35rem" : 0 }}>🛍️</span>
          <span className="top-bar-shop-text">{dictionaries[lang].shop.navTitle}</span>
        </Link>
        <LanguageSwitcher />
      </div>
    </div>
  );
}
