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
  const isUnknownSoundScene =
    router.pathname === "/quests/sound-case-001/stage-01/unknown-sound";
  const isDarkSoundCaseScene = isUnknownSoundScene ||
    router.pathname === "/quests/sound-case-001/stage-03/equalizer";
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

  const openUnknownSoundHelp = () => {
    window.dispatchEvent(new Event("laplapla:unknown-sound-help"));
  };

  return (
    <div
      className={`top-bar${isDarkSoundCaseScene ? " top-bar--unknown-sound" : ""}`}
      data-quest-header={isUnknownSoundScene ? "unknown-sound" : isDarkSoundCaseScene ? "sound-case" : undefined}
    >
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
        <div className="top-bar-auth-zone" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button 
            className="top-bar-signin"
            onClick={() => alert("Sign in is coming soon")}
            aria-label={dictionaries[lang].topBar.signIn}
            style={{ 
              background: "none", 
              border: "none", 
              cursor: "pointer", 
              fontWeight: 600, 
              color: "var(--color-text, #333)",
              fontSize: "0.9rem"
            }}
          >
            {isDarkSoundCaseScene ? (
              <span className="top-bar-signin-icon" aria-hidden="true">↪</span>
            ) : null}
            <span className="top-bar-signin-label">
              {dictionaries[lang].topBar.signIn}
            </span>
          </button>
          
          <Link
            href={buildLocalizedPublicPath("/shop", lang)}
            className="top-bar-cart"
            aria-label={dictionaries[lang].shop.navTitle}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: "var(--color-text, #333)",
              background: "var(--color-surface, #fff)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: "1.1rem" }}>🛒</span>
          </Link>
          {isUnknownSoundScene ? (
            <button
              className="top-bar-quest-help"
              type="button"
              onClick={openUnknownSoundHelp}
              aria-label={dictionaries[lang].shop.soundCase.unknownSoundScene.helpAriaLabel}
            >
              <span aria-hidden="true">?</span>
            </button>
          ) : null}
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  );
}
