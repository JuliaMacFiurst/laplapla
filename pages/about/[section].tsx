import { useRouter } from "next/router";
import { Lang, AboutSectionKey, ABOUT_SECTIONS } from "../../i18n";
import AboutContent from "../../components/AboutContent";

export default function AboutSectionPage() {
  const router = useRouter();

  const lang =
    (router.query.lang as Lang) ||
    (typeof window !== "undefined"
      ? (localStorage.getItem("lang") as Lang)
      : null) ||
    "ru";

  const section = router.query.section as AboutSectionKey | undefined;

  // защита от некорректного URL
  if (!section || !ABOUT_SECTIONS.includes(section)) {
    return null;
  }

  return (
    <main className="about-page" dir={lang === "he" ? "rtl" : "ltr"}>
      <AboutContent lang={lang} mode="section" section={section} />
    </main>
  );
}
