import { useMemo } from "react";
import { useRouter } from "next/router";
import { Lang } from "@/i18n";

function getLangFromRouter(locale?: string, queryLang?: string | string[]): Lang {
  const value = Array.isArray(queryLang) ? queryLang[0] : queryLang;

  if (value === "he" || locale === "he") return "he";
  if (value === "en" || locale === "en") return "en";
  return "ru";
}

export default function LicensesPage() {
  const router = useRouter();
  const lang = getLangFromRouter(router.locale, router.query.lang);

  const content = useMemo(() => {
    switch (lang) {
      case "en":
        return {
          title: "Third-Party Licenses",
          intro:
            "LapLapLa integrates media and services provided by third-party platforms. Their use is subject to the respective licenses below.",
          sections: [
            {
              h: "GIPHY",
              p: `GIF content is provided via the GIPHY API. Use of GIFs is subject to GIPHY’s Terms of Service and Community Guidelines. LapLapLa does not claim ownership of GIPHY media and is not affiliated with GIPHY.`,
              link: "https://support.giphy.com/hc/en-us/articles/360020027752-GIPHY-Terms-of-Service",
            },
            {
              h: "Pexels",
              p: `Video content is provided via the Pexels API. Media is free to use under the Pexels License. LapLapLa does not claim ownership of Pexels media and is not affiliated with Pexels.`,
              link: "https://www.pexels.com/license/",
            },
            {
              h: "Google Gemini",
              p: `AI-generated text and content are produced using Google Gemini APIs. Use of these services is subject to Google’s Terms of Service and Generative AI policies. LapLapLa does not claim ownership over Google’s services and is not affiliated with Google.`,
              link: "https://ai.google.dev/terms",
            },
          ],
        };

      case "he":
        return {
          title: "רישיונות צד שלישי",
          intro:
            "LapLapLa משלבת מדיה ושירותים מצדדים שלישיים. השימוש בהם כפוף לרישיונות הרשמיים שלהם.",
          sections: [
            {
              h: "GIPHY",
              p: `קובצי GIF מסופקים דרך API של GIPHY. השימוש כפוף לתנאי השימוש והנחיות הקהילה של GIPHY. LapLapLa אינה בעלת הזכויות ואינה קשורה ל‑GIPHY.`,
              link: "https://support.giphy.com/hc/en-us/articles/360020027752-GIPHY-Terms-of-Service",
            },
            {
              h: "Pexels",
              p: `תוכן וידאו מסופק דרך API של Pexels. המדיה חופשית לשימוש בהתאם לרישיון Pexels. LapLapLa אינה בעלת הזכויות ואינה קשורה ל‑Pexels.`,
              link: "https://www.pexels.com/license/",
            },
            {
              h: "Google Gemini",
              p: `תוכן טקסטואלי שנוצר באמצעות בינה מלאכותית מופק דרך Google Gemini API. השימוש כפוף לתנאי השימוש של Google ולמדיניות הבינה המלאכותית שלה. LapLapLa אינה קשורה ל‑Google ואינה בעלת הזכויות על השירות.`,
              link: "https://ai.google.dev/terms",
            },
          ],
        };

      default:
        return {
          title: "Лицензии третьих лиц",
          intro:
            "LapLapLa использует медиа и сервисы сторонних платформ. Их использование регулируется соответствующими лицензиями.",
          sections: [
            {
              h: "GIPHY",
              p: `GIF-файлы предоставляются через API GIPHY. Использование регулируется условиями обслуживания и правилами сообщества GIPHY. LapLapLa не владеет правами на этот контент и не аффилирована с GIPHY.`,
              link: "https://support.giphy.com/hc/en-us/articles/360020027752-GIPHY-Terms-of-Service",
            },
            {
              h: "Pexels",
              p: `Видео предоставляются через API Pexels. Медиа можно использовать в соответствии с лицензией Pexels. LapLapLa не владеет правами на этот контент и не аффилирована с Pexels.`,
              link: "https://www.pexels.com/license/",
            },
            {
              h: "Google Gemini",
              p: `AI-контент создаётся с использованием Google Gemini API. Использование регулируется условиями обслуживания Google и политикой Generative AI. LapLapLa не владеет сервисом Google и не аффилирована с Google.`,
              link: "https://ai.google.dev/terms",
            },
          ],
        };
    }
  }, [lang]);

  return (
    <div
      className="legal-page"
      style={{ maxWidth: 900, margin: "0 auto", padding: "60px 20px" }}
    >
      <h1 style={{ marginBottom: 20 }}>{content.title}</h1>
      <p style={{ marginBottom: 40, lineHeight: 1.7 }}>{content.intro}</p>

      {content.sections.map((section, idx) => (
        <div key={idx} style={{ marginBottom: 40 }}>
          <h2 style={{ marginBottom: 12 }}>{section.h}</h2>
          <p style={{ lineHeight: 1.7, marginBottom: 8 }}>{section.p}</p>
          <a
            href={section.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 14 }}
          >
            View official license
          </a>
        </div>
      ))}
    </div>
  );
}