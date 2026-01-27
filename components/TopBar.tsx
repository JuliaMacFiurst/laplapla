

import { useRouter } from "next/router";
import { useState, useRef } from "react";
import { ABOUT_SECTIONS, dictionaries } from "../i18n";
import { Lang } from "../i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import BackButton from "./BackButton";

export default function TopBar() {
  const router = useRouter();
  const isHome = router.pathname === "/";

  const lang =
    (Array.isArray(router.query.lang)
      ? router.query.lang[0]
      : router.query.lang) as Lang || "ru";

  const [menuHover, setMenuHover] = useState(false);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  const openMenu = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setMenuHover(true);
  };

  const scheduleCloseMenu = () => {
    closeTimeout.current = setTimeout(() => {
      setMenuHover(false);
    }, 200);
  };

  return (
    <div className="top-bar">
      {/* Левая/основная зона */}
      {isHome ? (
        <div
          className="menu-wrapper"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleCloseMenu}
        >
          <div
            className="menu-button"
            onClick={() => router.push(`/about?lang=${lang}`)}
          >
            ☰
          </div>

          {menuHover && (
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
                    router.push(`/about/${key}?lang=${lang}`)
                  }
                >
                  {dictionaries[lang].about[key].title}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <BackButton />
      )}

      {/* Правая зона — язык */}
      <LanguageSwitcher />
    </div>
  );
}