import { useRouter } from "next/router";
import { Lang } from "../i18n";

const LANGS: { code: Lang; label: string }[] = [
  { code: "ru", label: "RU" },
  { code: "he", label: "HE" },
  { code: "en", label: "EN" },
];

export default function LanguageSwitcher({ current }: { current: Lang }) {
  const router = useRouter();

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
