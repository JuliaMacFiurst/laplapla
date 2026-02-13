

import { useMemo } from "react";
import { useRouter } from "next/router";
import { Lang } from "@/i18n";

function getLangFromRouter(locale?: string): Lang {
  if (locale === "he") return "he";
  if (locale === "en") return "en";
  return "ru";
}

export default function PrivacyPage() {
  const router = useRouter();
  const lang = getLangFromRouter(router.locale);

  const content = useMemo(() => {
    switch (lang) {
      case "en":
        return {
          title: "Privacy Policy",
          sections: [
            {
              h: "1. Introduction",
              p: `LapLapLa respects your privacy. This Privacy Policy explains what information we collect and how we use it.`,
            },
            {
              h: "2. Information We Collect",
              p: `We may collect minimal technical information such as browser type, device information, and usage analytics. We do not intentionally collect personal data from children without parental consent.`,
            },
            {
              h: "3. Children’s Privacy",
              p: `Children under 13 may use LapLapLa only with parental supervision. We do not knowingly collect personal data from children. If you believe a child has provided personal information, please contact us for removal.`,
            },
            {
              h: "4. Third-Party Services",
              p: `LapLapLa integrates third-party services such as GIPHY and Pexels. These services operate under their own privacy policies. We do not control their data practices.`,
            },
            {
              h: "5. Data Security",
              p: `We take reasonable measures to protect your information. However, no online service can guarantee complete security.`,
            },
            {
              h: "6. Changes",
              p: `We may update this Privacy Policy from time to time. Continued use of the platform means you accept the updated policy.`,
            },
          ],
        };

      case "he":
        return {
          title: "מדיניות פרטיות",
          sections: [
            {
              h: "1. מבוא",
              p: `LapLapLa מכבדת את פרטיותכם. מסמך זה מסביר איזה מידע נאסף וכיצד נעשה בו שימוש.`,
            },
            {
              h: "2. איזה מידע נאסף",
              p: `ייתכן שנאסוף מידע טכני בסיסי כגון סוג דפדפן, מידע על מכשיר ונתוני שימוש כלליים. איננו אוספים ביודעין מידע אישי מילדים ללא הסכמת הורים.`,
            },
            {
              h: "3. פרטיות ילדים",
              p: `ילדים מתחת לגיל 13 רשאים להשתמש בפלטפורמה בליווי הורה בלבד. אם אתם סבורים שנמסר מידע אישי של ילד ללא הסכמה, אנא פנו אלינו להסרה.`,
            },
            {
              h: "4. שירותים מצד שלישי",
              p: `הפלטפורמה משלבת שירותים כגון GIPHY ו‑Pexels הפועלים לפי מדיניות הפרטיות שלהם. איננו שולטים במדיניותם.`,
            },
            {
              h: "5. אבטחת מידע",
              p: `אנו נוקטים באמצעים סבירים להגנה על מידע, אך אין שירות מקוון המבטיח אבטחה מלאה.`,
            },
            {
              h: "6. שינויים",
              p: `ייתכן שנעדכן מדיניות זו מעת לעת. המשך שימוש בפלטפורמה מהווה הסכמה לגרסה המעודכנת.`,
            },
          ],
        };

      default:
        return {
          title: "Политика конфиденциальности",
          sections: [
            {
              h: "1. Введение",
              p: `LapLapLa уважает вашу конфиденциальность. В этом документе объясняется, какие данные мы можем собирать и как они используются.`,
            },
            {
              h: "2. Какие данные мы собираем",
              p: `Мы можем собирать минимальную техническую информацию: тип браузера, устройство и общую статистику использования. Мы не собираем персональные данные детей без согласия родителей.`,
            },
            {
              h: "3. Конфиденциальность детей",
              p: `Дети младше 13 лет могут пользоваться платформой только под присмотром родителей. Если вы считаете, что ребенок передал личные данные без согласия, свяжитесь с нами для их удаления.`,
            },
            {
              h: "4. Сторонние сервисы",
              p: `Платформа использует сторонние сервисы, такие как GIPHY и Pexels. Они работают в соответствии со своей собственной политикой конфиденциальности.`,
            },
            {
              h: "5. Безопасность данных",
              p: `Мы принимаем разумные меры для защиты информации, однако ни один онлайн‑сервис не может гарантировать абсолютную безопасность.`,
            },
            {
              h: "6. Изменения",
              p: `Мы можем обновлять эту политику. Продолжая использовать платформу, вы соглашаетесь с обновленной версией.`,
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