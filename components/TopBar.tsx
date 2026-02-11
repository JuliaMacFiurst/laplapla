import { useRouter } from "next/router";
import { useState, useRef } from "react";
import { ABOUT_SECTIONS, dictionaries } from "../i18n";
import { Lang } from "../i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import HomeButton from "./HomeButton";

type TopBarProps = {
  lang: Lang;
};

export default function TopBar({ lang }: TopBarProps) {
  const router = useRouter();
  const isHome = router.pathname === "/";

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
            onClick={() =>
              router.push({
                pathname: "/about",
                query: { lang },
              })
            }
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
                    router.push({
                      pathname: `/about/${key}`,
                      query: { lang },
                    })
                  }
                >
                  {dictionaries[lang].about[key].title}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <HomeButton />
      )}

      {/* Правая зона — язык */}
      <LanguageSwitcher />
    </div>
  );
}