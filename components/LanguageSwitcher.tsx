import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Lang } from "../i18n";

const LANGS: { code: Lang; label: string }[] = [
  { code: "ru", label: "RU" },
  { code: "he", label: "HE" },
  { code: "en", label: "EN" },
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const [current, setCurrent] = useState<Lang>("ru");

  useEffect(() => {
    const queryLang = router.query.lang as Lang | undefined;
    const storedLang =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("laplapla_lang") as Lang | null)
        : null;

    setCurrent(queryLang || storedLang || "ru");
  }, [router.query.lang]);

  const switchLang = (lang: Lang) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("laplapla_lang", lang);
    }

    router.push({
      pathname: router.pathname,
      query: { ...router.query, lang },
    });
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
