import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Lang } from "../i18n";
import { buildLocalizedAsPath, getCurrentLang } from "@/lib/i18n/routing";

const LANGS: { code: Lang; label: string }[] = [
  { code: "ru", label: "RU" },
  { code: "he", label: "HE" },
  { code: "en", label: "EN" },
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const [current, setCurrent] = useState<Lang>("ru");

  useEffect(() => {
    setCurrent(getCurrentLang(router));
  }, [router]);

  const switchLang = async (lang: Lang) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("laplapla_lang", lang);
      window.localStorage.setItem("lang", lang);
      document.cookie = `laplapla_lang=${lang}; path=/; max-age=31536000`;
    }

    const isCapybaraPage = router.pathname === "/capybara";
    const localizedAsPath = buildLocalizedAsPath(router.asPath, lang);

    await router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, lang },
      },
      isCapybaraPage ? localizedAsPath : undefined,
      { locale: lang },
    );

    if (isCapybaraPage && typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="lang-switcher">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLang(code)}
          className={code === current ? "active" : ""}
          aria-current={code === current ? "true" : undefined}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
