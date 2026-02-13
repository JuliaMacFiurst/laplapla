

import { useMemo } from "react";
import { useRouter } from "next/router";
import { Lang } from "@/i18n";

function getLangFromRouter(locale?: string): Lang {
  if (locale === "he") return "he";
  if (locale === "en") return "en";
  return "ru";
}

export default function TermsPage() {
  const router = useRouter();
  const lang = getLangFromRouter(router.locale);

  const content = useMemo(() => {
    switch (lang) {
      case "en":
        return {
          title: "Terms of Service",
          sections: [
            {
              h: "1. Acceptance of Terms",
              p: `By using LapLapLa, you agree to these Terms of Service. If you are under 18, you must use this service with parental supervision. Children under 13 may use the platform only with parental consent.`,
            },
            {
              h: "2. User Content",
              p: `Users are responsible for any content they upload or create. By uploading content, you confirm that you own the rights or have permission to use it. LapLapLa is not responsible for user-generated materials.`,
            },
            {
              h: "3. Third-Party Media",
              p: `LapLapLa integrates media from third-party services such as GIPHY and Pexels. Use of such media is subject to their respective Terms of Service. LapLapLa is not affiliated with or endorsed by these platforms.`,
            },
            {
              h: "4. Prohibited Use",
              p: `Users may not upload illegal, harmful, infringing, or offensive content. Redistribution of third-party media as standalone files is not permitted.`,
            },
            {
              h: "5. AI-Generated Content",
              p: `LapLapLa uses artificial intelligence technologies, including Google Gemini, to generate texts, answers, and educational content. AI-generated content may contain inaccuracies or incomplete information. Such content is provided for creative and educational purposes only, and LapLapLa does not guarantee its accuracy, reliability, or suitability for any specific purpose.`,
            },
            {
              h: "6. Limitation of Liability",
              p: `LapLapLa is provided “as is.” We are not liable for misuse of the service, AI-generated content, or third-party content.`,
            },
          ],
        };

      case "he":
        return {
          title: "תנאי שימוש",
          sections: [
            {
              h: "1. קבלת התנאים",
              p: `בשימוש ב‑LapLapLa אתם מסכימים לתנאים אלו. משתמשים מתחת לגיל 18 חייבים להשתמש בשירות בליווי הורה. ילדים מתחת לגיל 13 רשאים להשתמש בפלטפורמה רק באישור הורים.`,
            },
            {
              h: "2. תוכן משתמש",
              p: `המשתמש אחראי לכל תוכן שהוא מעלה או יוצר. בהעלאת תוכן אתם מאשרים שיש לכם זכויות שימוש בו. LapLapLa אינה אחראית לתוכן שנוצר על ידי משתמשים.`,
            },
            {
              h: "3. תוכן מצדדים שלישיים",
              p: `LapLapLa משלבת מדיה משירותים חיצוניים כגון GIPHY ו‑Pexels. השימוש במדיה כפוף לתנאי השימוש של אותם שירותים. LapLapLa אינה קשורה או מאושרת על ידם.`,
            },
            {
              h: "4. שימוש אסור",
              p: `אין להעלות תוכן לא חוקי, פוגעני או מפר זכויות. אין להפיץ קבצי מדיה מצד שלישי כקבצים נפרדים.`,
            },
            {
              h: "5. תוכן שנוצר באמצעות בינה מלאכותית",
              p: `LapLapLa עושה שימוש בטכנולוגיות בינה מלאכותית, כולל Google Gemini, לצורך יצירת טקסטים, תשובות ותכנים לימודיים. תוכן שנוצר על ידי בינה מלאכותית עשוי לכלול אי־דיוקים או מידע חלקי. התוכן מסופק למטרות יצירתיות וחינוכיות בלבד, ואין התחייבות לדיוקו או להתאמתו למטרה מסוימת.`,
            },
            {
              h: "6. הגבלת אחריות",
              p: `השירות ניתן "כמות שהוא". איננו אחראים לשימוש לרעה בשירות, בתוכן שנוצר על ידי בינה מלאכותית או בתוכן מצדדים שלישיים.`,
            },
          ],
        };

      default:
        return {
          title: "Условия использования",
          sections: [
            {
              h: "1. Принятие условий",
              p: `Используя LapLapLa, вы соглашаетесь с настоящими условиями. Пользователи младше 18 лет должны использовать сервис под присмотром родителей. Дети младше 13 лет могут пользоваться платформой только с согласия родителей.`,
            },
            {
              h: "2. Пользовательский контент",
              p: `Пользователь несёт ответственность за загружаемый и создаваемый контент. Загружая материалы, вы подтверждаете наличие прав на их использование. LapLapLa не несёт ответственности за пользовательский контент.`,
            },
            {
              h: "3. Контент третьих лиц",
              p: `LapLapLa использует медиа из сторонних сервисов, таких как GIPHY и Pexels. Использование такого контента регулируется их собственными условиями. LapLapLa не аффилирована с этими сервисами.`,
            },
            {
              h: "4. Запрещённое использование",
              p: `Запрещается загружать незаконный, вредоносный или нарушающий права контент. Нельзя распространять сторонние медиа как отдельные файлы.`,
            },
            {
              h: "5. Контент, созданный искусственным интеллектом",
              p: `LapLapLa использует технологии искусственного интеллекта, включая Google Gemini, для генерации текстов, ответов и образовательного контента. Сгенерированный ИИ контент может содержать неточности или неполную информацию. Такой контент предоставляется исключительно в творческих и образовательных целях, и LapLapLa не гарантирует его точность или пригодность для конкретных задач.`,
            },
            {
              h: "6. Ограничение ответственности",
              p: `Сервис предоставляется «как есть». Мы не несем ответственности за неправильное использование платформы, контента, созданного ИИ, или стороннего контента.`,
            },
          ],
        };
    }
  }, [lang]);

  return (
    <div className="legal-page" style={{ maxWidth: 900, margin: "0 auto", padding: "60px 20px" }}>
      <h1 style={{ marginBottom: 32 }}>{content.title}</h1>

      {content.sections.map((section, idx) => (
        <div key={idx} style={{ marginBottom: 32 }}>
          <h2 style={{ marginBottom: 12 }}>{section.h}</h2>
          <p style={{ lineHeight: 1.7 }}>{section.p}</p>
        </div>
      ))}
    </div>
  );
}