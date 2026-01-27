import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Lang } from "../../i18n";
import AboutContent from "../../components/AboutContent";

export default function AboutPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("ru");

  useEffect(() => {
    const storedLang = localStorage.getItem("lang") as Lang | null;
    const queryLang = router.query.lang as Lang | undefined;

    setLang(queryLang || storedLang || "ru");
  }, [router.query.lang]);

  return (
    <main className="about-page" dir={lang === "he" ? "rtl" : "ltr"}>
      <AboutContent lang={lang} mode="list" />
    </main>
  );
}