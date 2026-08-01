

import { useMemo } from "react";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { dictionaries } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";

export default function PrivacyPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const seo = dictionaries[lang].seo.legal.privacy;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/privacy";

  const content = useMemo(() => {
    switch (lang) {
      case "en":
        return {
          title: "Privacy Policy",
          lastUpdated: "Last updated: August 1, 2026.",
          sections: [
            {
              h: "1. Introduction",
              paragraphs: [
                `LapLapLa respects your privacy. This Privacy Policy explains what information the service processes, why it is needed, where it may be sent, and which materials remain only on your device.`,
              ],
            },
            {
              h: "2. Product Analytics",
              paragraphs: [
                `LapLapLa collects pseudonymous usage statistics. Events may include page views; session start and end; opening, progressing through, and completing content; active time; progress and completion of lessons, books, and stories; language changes; use of maps, studios, and other tools; creation and export of local projects; opening external links; and technical errors.`,
                `For analytics, LapLapLa creates a persistent random visitor UUID in localStorage and a random session UUID in sessionStorage. These identifiers do not contain your name or email address, but they allow events from the same browser or the same session to be associated with one another.`,
                `Raw analytics events are stored in Supabase and are normally deleted after approximately 15 days. After that period, anonymized aggregate reports that do not contain identifiers of individual visitors or sessions may be retained.`,
              ],
            },
            {
              h: "3. Age Requirement",
              paragraphs: [
                `The main LapLapLa service is intended for users aged 16 and over. It is not intended for users under the age of 16.`,
              ],
            },
            {
              h: "4. Search Within the App",
              paragraphs: [
                `Search queries may be sent to LapLapLa servers. When you search for images, GIFs, videos, or other media, a query may also be sent to GIPHY, Pexels, Pixabay, Reddit, or Imgflip in order to return relevant results.`,
                `Some media search queries may be stored briefly in a Supabase cache to improve performance and avoid repeating the same external request.`,
              ],
            },
            {
              h: "5. Error Reports and Diagnostics",
              paragraphs: [
                `LapLapLa uses Sentry for error reports and performance diagnostics. A report may include a stack trace, route or URL, browser type, runtime environment, and technical request context. Sentry performance tracing may also measure a small sample of requests and application operations.`,
                `Sentry is configured with sendDefaultPii disabled. Cookies, authorization tokens, request bodies, email addresses, and other recognized sensitive fields are removed or filtered before an event is sent, to the extent covered by the current filtering configuration.`,
                `Vercel, which hosts LapLapLa, may also create standard technical hosting and server logs, such as request routes, timestamps, status codes, network information, and runtime diagnostics.`,
              ],
            },
            {
              h: "6. Security and Request Limiting",
              paragraphs: [
                `An IP address may be processed to limit request frequency, prevent abuse, and protect the service. If distributed rate limiting through Upstash is enabled, a SHA-256 hash of the IP address and request counters may be sent to Upstash for the duration of the relevant rate-limit window.`,
                `LapLapLa does not use the IP address to determine your location and does not request precise or approximate device geolocation. The application does not use advertising identifiers or advertising SDKs.`,
              ],
            },
            {
              h: "7. Administrative Authentication",
              paragraphs: [
                `Regular users do not need an account. Restricted administrative access may use Google OAuth and Supabase Auth. During an administrative sign-in, the administrator's email address, user identifier, OAuth session, and required authentication tokens may be processed solely to verify and secure administrative access.`,
              ],
            },
            {
              h: "8. Local Projects and User Media",
              paragraphs: [
                `Drawings, locally created studio projects, user-selected files, and voice recordings are processed and stored on the device using browser storage, IndexedDB, data URLs, or temporary blob URLs. LapLapLa does not upload the contents of those materials to its servers. Analytics may record that a project was created, recorded, shared, or exported, but not the drawing, recording, or project file itself.`,
                `If text from a creative tool is used to find suitable media, derived search words may be sent through the media search process described above.`,
              ],
            },
            {
              h: "9. Third-Party Services",
              paragraphs: [
                `LapLapLa uses Supabase for its database, analytics storage, public content storage, and administrative authentication; Sentry for errors and diagnostics; Vercel for hosting and server logs; and, when enabled, Upstash for distributed request limiting.`,
                `GIPHY, Pexels, Pixabay, Reddit, and Imgflip may receive media search queries. YouTube provides embedded videos and may receive standard browser and playback request information under Google's policies. Google OAuth is used only for administrative authentication. Each provider processes data under its own terms and privacy policy.`,
              ],
            },
            {
              h: "10. Data Security",
              paragraphs: [
                `LapLapLa uses HTTPS and takes reasonable technical measures to protect information in transit and restrict access to server-side data. However, no online service can guarantee complete security.`,
              ],
            },
            {
              h: "11. User Rights and Data Deletion",
              paragraphs: [
                `You may contact us at juliamakhlinfiurst@gmail.com to request information about the processing of your data or to request the correction or deletion of applicable data. Because LapLapLa does not create accounts for regular users, locating pseudonymous analytics events may require your visitor UUID or other technical information that makes it possible to identify the relevant records. Some anonymized aggregate information cannot be linked to a specific user and therefore cannot be individually accessed, corrected, or deleted. Requests are handled in accordance with applicable law.`,
              ],
            },
            {
              h: "12. Changes",
              paragraphs: [
                `We may update this Privacy Policy when the service or its data practices change. The current version is published on this page.`,
              ],
            },
          ],
        };

      case "he":
        return {
          title: "מדיניות פרטיות",
          lastUpdated: "עדכון אחרון: 1 באוגוסט 2026.",
          sections: [
            {
              h: "1. מבוא",
              paragraphs: [
                `LapLapLa מכבדת את פרטיותכם. מדיניות זו מסבירה איזה מידע השירות מעבד, מדוע הוא נחוץ, לאן הוא עשוי להישלח ואילו חומרים נשארים במכשיר בלבד.`,
              ],
            },
            {
              h: "2. ניתוח השימוש במוצר",
              paragraphs: [
                `LapLapLa אוספת נתוני שימוש פסאודונימיים. האירועים עשויים לכלול צפיות בדפים; התחלה וסיום של הפעלה; פתיחה, התקדמות והשלמה של תוכן; משך הפעילות; התקדמות והשלמה של שיעורים, ספרים וסיפורים; שינוי שפה; שימוש במפות, באולפנים ובכלים אחרים; יצירה וייצוא של פרויקטים מקומיים; פתיחת קישורים חיצוניים; ושגיאות טכניות.`,
                `לצורכי ניתוח שימוש LapLapLa יוצרת UUID אקראי וקבוע למבקר ב‑localStorage ו‑UUID אקראי להפעלה ב‑sessionStorage. מזהים אלה אינם כוללים שם או כתובת דוא״ל, אך הם מאפשרים לקשר בין אירועים מאותו דפדפן או מאותה הפעלה.`,
                `אירועי ניתוח גולמיים נשמרים ב‑Supabase ונמחקים בדרך כלל לאחר כ‑15 ימים. לאחר מכן עשויים להישמר דוחות מצטברים ואנונימיים שאינם כוללים מזהים של מבקרים או הפעלות בודדות.`,
              ],
            },
            {
              h: "3. דרישת גיל",
              paragraphs: [
                `השירות הראשי של LapLapLa מיועד למשתמשים בני 16 ומעלה ואינו מיועד למשתמשים מתחת לגיל 16.`,
              ],
            },
            {
              h: "4. חיפוש בתוך היישום",
              paragraphs: [
                `שאילתות חיפוש עשויות להישלח לשרתים של LapLapLa. בעת חיפוש תמונות, קובצי GIF, סרטונים או חומרי מדיה אחרים, השאילתה עשויה להישלח גם אל GIPHY, Pexels, Pixabay, Reddit או Imgflip כדי להחזיר תוצאות מתאימות.`,
                `חלק משאילתות החיפוש של מדיה עשויות להישמר לזמן קצר במטמון של Supabase כדי לשפר ביצועים ולמנוע בקשות חיצוניות חוזרות.`,
              ],
            },
            {
              h: "5. דוחות שגיאה ואבחון",
              paragraphs: [
                `LapLapLa משתמשת ב‑Sentry לדוחות שגיאה ולאבחון ביצועים. דוח עשוי לכלול stack trace, נתיב או כתובת URL, סוג דפדפן, סביבת הרצה והקשר טכני של הבקשה. מעקב הביצועים של Sentry עשוי למדוד גם מדגם קטן של בקשות ופעולות ביישום.`,
                `Sentry מוגדר כאשר sendDefaultPii מושבת. קובצי cookie, אסימוני הרשאה, גופי בקשות, כתובות דוא״ל ושדות רגישים מזוהים אחרים מוסרים או מסוננים לפני שליחת אירוע, ככל שהדבר מכוסה על ידי תצורת הסינון הנוכחית.`,
                `Vercel, המארחת את LapLapLa, עשויה ליצור גם יומני אירוח ושרת טכניים רגילים, כגון נתיבי בקשות, חותמות זמן, קודי מצב, מידע רשת ונתוני אבחון של סביבת ההרצה.`,
              ],
            },
            {
              h: "6. אבטחה והגבלת בקשות",
              paragraphs: [
                `כתובת IP עשויה לעבור עיבוד לצורך הגבלת קצב הבקשות, מניעת שימוש לרעה והגנה על השירות. אם מופעלת הגבלת בקשות מבוזרת באמצעות Upstash, ייתכן שיועברו אל Upstash גיבוב SHA‑256 של כתובת ה‑IP ומוני בקשות למשך חלון הגבלת הקצב הרלוונטי.`,
                `LapLapLa אינה משתמשת בכתובת ה‑IP כדי לקבוע את מיקומכם ואינה מבקשת מיקום מדויק או משוער של המכשיר. היישום אינו משתמש במזהי פרסום או בערכות SDK לפרסום.`,
              ],
            },
            {
              h: "7. אימות מנהלי",
              paragraphs: [
                `משתמשים רגילים אינם זקוקים לחשבון. גישה מנהלית מוגבלת עשויה להשתמש ב‑Google OAuth וב‑Supabase Auth. במהלך כניסה מנהלית עשויים לעבור עיבוד כתובת הדוא״ל של מנהל המערכת, מזהה המשתמש, הפעלת OAuth ואסימוני האימות הנדרשים, ורק לצורך אימות ואבטחת הגישה המנהלית.`,
              ],
            },
            {
              h: "8. פרויקטים מקומיים ומדיה של המשתמש",
              paragraphs: [
                `ציורים, פרויקטים שנוצרו באופן מקומי באולפן, קבצים שהמשתמש בחר והקלטות קול מעובדים ונשמרים במכשיר באמצעות אחסון הדפדפן, IndexedDB, כתובות data או כתובות blob זמניות. LapLapLa אינה מעלה את תוכן החומרים האלה לשרתיה. נתוני הניתוח עשויים לתעד שפרויקט נוצר, הוקלט, שותף או יוצא, אך לא את הציור, ההקלטה או קובץ הפרויקט עצמו.`,
                `אם טקסט מכלי יצירתי משמש למציאת מדיה מתאימה, מילות חיפוש שנגזרו ממנו עשויות להישלח בתהליך חיפוש המדיה שתואר לעיל.`,
              ],
            },
            {
              h: "9. שירותי צד שלישי",
              paragraphs: [
                `LapLapLa משתמשת ב‑Supabase עבור מסד הנתונים, אחסון נתוני ניתוח, אחסון תוכן ציבורי ואימות מנהלי; ב‑Sentry עבור שגיאות ואבחון; ב‑Vercel עבור אירוח ויומני שרת; וכאשר השירות מופעל, ב‑Upstash להגבלת בקשות מבוזרת.`,
                `GIPHY, Pexels, Pixabay, Reddit ו‑Imgflip עשויים לקבל שאילתות חיפוש מדיה. YouTube מספקת סרטונים מוטמעים ועשויה לקבל מידע רגיל על בקשות דפדפן והפעלת סרטונים בהתאם למדיניות Google. Google OAuth משמש רק לאימות מנהלי. כל ספק מעבד מידע בהתאם לתנאים ולמדיניות הפרטיות שלו.`,
              ],
            },
            {
              h: "10. אבטחת מידע",
              paragraphs: [
                `LapLapLa משתמשת ב‑HTTPS ונוקטת אמצעים טכניים סבירים להגנת מידע בזמן העברתו ולהגבלת הגישה לנתונים בצד השרת. עם זאת, שום שירות מקוון אינו יכול להבטיח אבטחה מוחלטת.`,
              ],
            },
            {
              h: "11. זכויות המשתמש ומחיקת נתונים",
              paragraphs: [
                `ניתן לפנות אלינו בכתובת juliamakhlinfiurst@gmail.com כדי לבקש מידע על עיבוד הנתונים, או לבקש תיקון או מחיקה של נתונים רלוונטיים. מאחר ש‑LapLapLa אינה יוצרת חשבונות למשתמשים רגילים, איתור אירועי ניתוח פסאודונימיים עשוי לדרוש את UUID המבקר או מידע טכני אחר שמאפשר לזהות את הרשומות הרלוונטיות. חלק מהמידע המצטבר והאנונימי אינו ניתן לקישור למשתמש מסוים, ולכן לא ניתן לספק לגביו גישה, תיקון או מחיקה פרטניים. הבקשות יטופלו בהתאם לדין החל.`,
              ],
            },
            {
              h: "12. שינויים",
              paragraphs: [
                `אנו עשויים לעדכן מדיניות זו כאשר השירות או אופן הטיפול בנתונים משתנים. הגרסה העדכנית מפורסמת בדף זה.`,
              ],
            },
          ],
        };

      default:
        return {
          title: "Политика конфиденциальности",
          lastUpdated: "Последнее обновление: 1 августа 2026 года.",
          sections: [
            {
              h: "1. Введение",
              paragraphs: [
                `LapLapLa уважает вашу конфиденциальность. В этом документе объясняется, какие сведения обрабатывает сервис, зачем они нужны, куда могут передаваться и какие материалы остаются только на вашем устройстве.`,
              ],
            },
            {
              h: "2. Продуктовая аналитика",
              paragraphs: [
                `LapLapLa собирает псевдонимную статистику использования. События могут включать просмотры страниц; начало и окончание сессии; открытие, прохождение и завершение контента; длительность активности; прогресс и завершение уроков, книг и историй; смену языка; использование карт, студий и других инструментов; создание и экспорт локальных проектов; открытие внешних ссылок; технические ошибки.`,
                `Для аналитики LapLapLa создаёт постоянный случайный UUID посетителя в localStorage и случайный UUID сессии в sessionStorage. Эти идентификаторы не содержат имени или электронной почты, но позволяют связывать события одного браузера или одной сессии.`,
                `Сырые аналитические события хранятся в Supabase и обычно удаляются приблизительно через 15 дней. После этого могут сохраняться обезличенные агрегированные отчёты без идентификаторов отдельных посетителей или сессий.`,
              ],
            },
            {
              h: "3. Возрастные требования",
              paragraphs: [
                `Основной сервис LapLapLa предназначен для пользователей 16 лет и старше и не предназначен для пользователей младше 16 лет.`,
              ],
            },
            {
              h: "4. Поиск внутри приложения",
              paragraphs: [
                `Поисковые запросы могут отправляться на серверы LapLapLa. При поиске изображений, GIF, видео и других медиаматериалов запрос также может передаваться GIPHY, Pexels, Pixabay, Reddit или Imgflip, чтобы получить подходящие результаты.`,
                `Некоторые запросы для поиска медиа могут кратковременно сохраняться в кэше Supabase, чтобы ускорить работу и не повторять одинаковые внешние запросы.`,
              ],
            },
            {
              h: "5. Отчёты об ошибках и диагностика",
              paragraphs: [
                `LapLapLa использует Sentry для отчётов об ошибках и диагностики производительности. Отчёт может включать stack trace, маршрут или URL, тип браузера, среду выполнения и технический контекст запроса. Мониторинг производительности Sentry также может измерять небольшую выборку запросов и операций приложения.`,
                `В конфигурации Sentry параметр sendDefaultPii отключён. Cookies, токены авторизации, тела запросов, электронные адреса и другие распознанные чувствительные поля удаляются или фильтруются перед отправкой события в той мере, в которой это предусмотрено действующей конфигурацией фильтрации.`,
                `Vercel, на котором размещена LapLapLa, также может создавать стандартные технические журналы хостинга и сервера: маршруты запросов, время, коды ответа, сетевую информацию и данные диагностики среды выполнения.`,
              ],
            },
            {
              h: "6. Безопасность и ограничение запросов",
              paragraphs: [
                `IP‑адрес может обрабатываться для ограничения частоты запросов, предотвращения злоупотреблений и обеспечения безопасности сервиса. Если включено распределённое ограничение запросов через Upstash, в Upstash могут передаваться SHA‑256‑хеш IP‑адреса и счётчики запросов на время соответствующего окна ограничения.`,
                `LapLapLa не использует IP‑адрес для определения вашего местоположения и не запрашивает точную или приблизительную геолокацию устройства. Приложение не использует рекламные идентификаторы или рекламные SDK.`,
              ],
            },
            {
              h: "7. Административная авторизация",
              paragraphs: [
                `Обычным пользователям аккаунт не требуется. Для ограниченного административного доступа могут использоваться Google OAuth и Supabase Auth. Во время административного входа могут обрабатываться электронный адрес администратора, идентификатор пользователя, OAuth‑сессия и необходимые токены аутентификации — исключительно для проверки и защиты административного доступа.`,
              ],
            },
            {
              h: "8. Локальные проекты и пользовательские материалы",
              paragraphs: [
                `Рисунки, локально созданные проекты студий, выбранные пользователем файлы и голосовые записи обрабатываются и хранятся на устройстве с помощью хранилища браузера, IndexedDB, data URL или временных blob URL. LapLapLa не загружает содержимое этих материалов на свои серверы. Аналитика может зафиксировать сам факт создания, записи, отправки или экспорта проекта, но не рисунок, запись или файл проекта.`,
                `Если текст из творческого инструмента используется для подбора подходящего медиа, производные поисковые слова могут передаваться через описанный выше процесс поиска медиа.`,
              ],
            },
            {
              h: "9. Сторонние сервисы",
              paragraphs: [
                `LapLapLa использует Supabase для базы данных, хранения аналитики, публичного контента и административной авторизации; Sentry — для ошибок и диагностики; Vercel — для хостинга и серверных журналов; Upstash, если он включён, — для распределённого ограничения частоты запросов.`,
                `GIPHY, Pexels, Pixabay, Reddit и Imgflip могут получать запросы для поиска медиа. YouTube предоставляет встроенные видео и может получать стандартные сведения о запросах браузера и воспроизведении в соответствии с политиками Google. Google OAuth используется только для административной авторизации. Каждый поставщик обрабатывает данные в соответствии со своими условиями и политикой конфиденциальности.`,
              ],
            },
            {
              h: "10. Безопасность данных",
              paragraphs: [
                `LapLapLa использует HTTPS и принимает разумные технические меры для защиты информации при передаче и ограничения доступа к серверным данным. Однако ни один онлайн‑сервис не может гарантировать абсолютную безопасность.`,
              ],
            },
            {
              h: "11. Права пользователя и удаление данных",
              paragraphs: [
                `Вы можете обратиться к нам по адресу juliamakhlinfiurst@gmail.com, чтобы запросить информацию об обработке данных, исправление или удаление применимых данных. Поскольку LapLapLa не создаёт аккаунты обычных пользователей, для поиска псевдонимных аналитических событий может потребоваться UUID посетителя или другая техническая информация, позволяющая определить соответствующие записи. Некоторые обезличенные агрегированные сведения невозможно связать с конкретным пользователем, поэтому предоставить индивидуальный доступ к ним, исправить или удалить их невозможно. Запросы рассматриваются в соответствии с применимым законодательством.`,
              ],
            },
            {
              h: "12. Изменения",
              paragraphs: [
                `Мы можем обновлять эту политику при изменении сервиса или способов обработки данных. Актуальная версия публикуется на этой странице.`,
              ],
            },
          ],
        };
    }
  }, [lang]);

  return (
    <>
      <SEO title={seo.title} description={seo.description} path={seoPath} />
      <div className="legal-page" style={{ maxWidth: 900, margin: "0 auto", padding: "60px 20px" }}>
        <h1 style={{ marginBottom: 12 }}>{content.title}</h1>
        <p style={{ marginBottom: 32, opacity: 0.72 }}>{content.lastUpdated}</p>

        {content.sections.map((section, idx) => (
          <div key={idx} style={{ marginBottom: 32 }}>
            <h2 style={{ marginBottom: 12 }}>{section.h}</h2>
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p
                key={paragraphIndex}
                style={{ lineHeight: 1.7, marginBottom: paragraphIndex < section.paragraphs.length - 1 ? 12 : 0 }}
              >
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
