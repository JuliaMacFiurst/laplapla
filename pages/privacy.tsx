import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { dictionaries, type Lang } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";

type PrivacySection = { h: string; paragraphs: string[] };
type PrivacyContent = { title: string; lastUpdated: string; sections: PrivacySection[] };

export const PRIVACY_CONTENT: Record<Lang, PrivacyContent> = {
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: October 1, 2026.",
    sections: [
      { h: "1. Introduction", paragraphs: [
        "This Privacy Policy explains what information LapLapLa processes, why it is needed, where it may be sent, and what choices are available to you. Most public content can be viewed without an account.",
      ] },
      { h: "2. Customer Accounts and Authentication", paragraphs: [
        "You may use a LapLapLa customer account for features that require saved access, such as viewing digital products available to your account, managing product access, and returning to saved personalization. An account is not required for ordinary browsing of the public website.",
        "Customer sign-in is provided through Supabase Auth. Depending on the option you choose, authentication may use Google OAuth or a one-time magic link sent to your email address. LapLapLa processes the account email, Supabase user identifier, authentication session, and required security tokens to sign you in and keep the account secure.",
        "Restricted administrator access has a separate authorization flow. Being signed in as a customer does not by itself provide administrator access.",
      ] },
      { h: "3. Product Access and Personalization", paragraphs: [
        "LapLapLa stores information about which digital products a customer account may access. This allows the service to show available products and protect customer-only creation and personalization tools.",
        "When you use a personalization feature, LapLapLa may store the information you choose to enter, such as a display name or participant names, so you can return and edit the product later. You decide what to enter; LapLapLa does not require real names of children or other sensitive information for personalization.",
      ] },
      { h: "4. Preorder and Early-Access Registration", paragraphs: [
        "You may provide an email address to register for the Sound Case #001 preorder. The purpose is to record the preorder, preserve eligibility for the special preorder price, and send a message when the product becomes available. The email is stored in a standardized form so it can later be matched reliably with the verified email of a LapLapLa customer account.",
        "Preorder registration uses single opt-in: eligibility is recorded when you submit the form and expressly agree to receive the product-launch and preorder-price message. It does not automatically create a customer account, is not a purchase, and does not involve a payment. The preorder email is not used as consent for an indefinite general advertising newsletter.",
      ] },
      { h: "5. Product Analytics", paragraphs: [
        "LapLapLa collects pseudonymous usage statistics. Events may include page views, sessions, language, device and viewport category, opening and completing content, use of maps and creative tools, project or export actions, external-link actions, preorder form outcomes, and technical errors.",
        "For analytics, LapLapLa creates a random visitor identifier and session identifier in localStorage. A session may be shared by tabs in the same browser profile and rotates after a period without tracked activity. These analytics identifiers are not intended to contain your name or email address. Preorder email addresses, normalized emails, email hashes, customer identifiers, and preorder record identifiers are not sent as analytics properties.",
        "Raw analytics events are stored in Supabase and are normally deleted after approximately 15 days. Aggregate reports that do not contain individual visitor or session identifiers may be retained for longer.",
      ] },
      { h: "6. Browser Storage and Local Materials", paragraphs: [
        "LapLapLa uses browser storage, including localStorage, sessionStorage, and IndexedDB, for language preferences, authentication sessions, analytics identifiers, application state, and locally created projects where applicable.",
        "Drawings, local studio projects, selected files, and voice recordings may remain on the device using browser storage, data URLs, or temporary blob URLs. If a feature explicitly saves personalization to your account, that personalization is stored by LapLapLa as described above. Analytics may record that an action occurred, but not the contents of a drawing, recording, or local project file.",
      ] },
      { h: "7. Search and External Media", paragraphs: [
        "Search queries may be sent to LapLapLa servers. Searches for images, GIFs, videos, or other media may also be sent to GIPHY, Pexels, Pixabay, Reddit, or Imgflip to return relevant results. Some queries may be stored briefly in a Supabase cache to improve performance.",
        "YouTube provides embedded videos and may receive standard browser and playback request information under Google's policies. External services process information under their own terms and privacy policies.",
      ] },
      { h: "8. Technical Data, Security, and Diagnostics", paragraphs: [
        "LapLapLa uses Sentry for error reports and performance diagnostics. Reports may include a stack trace, route or URL, browser type, runtime environment, and technical request context. Recognized sensitive fields such as authorization tokens, request bodies, cookies, and email addresses are filtered under the current monitoring configuration, but no filtering system can provide an absolute guarantee.",
        "Vercel may create standard hosting and server logs, including request routes, timestamps, status codes, network information, and runtime diagnostics. An IP address may be processed to limit request frequency, prevent abuse, and protect the service. When distributed rate limiting is enabled, a hash of the IP address and request counters may be processed by Upstash for the relevant rate-limit window.",
        "LapLapLa uses HTTPS and reasonable access controls, but no online service can guarantee complete security.",
      ] },
      { h: "9. Service Providers", paragraphs: [
        "LapLapLa uses Supabase for authentication, customer and product-access data, saved personalization, preorder registrations, analytics, public content storage, and other database functions; Sentry for diagnostics; Vercel for hosting and server logs; and, when enabled, Upstash for distributed request limiting. Google provides identity authentication when you choose Google sign-in.",
        "LapLapLa does not currently process payments through PayPal or another payment provider. Payment processing will be described in this policy if and when it becomes available.",
      ] },
      { h: "10. Age Requirement", paragraphs: [
        "The main LapLapLa service is intended for users aged 16 and over and is not intended for users under 16.",
      ] },
      { h: "11. Retention", paragraphs: [
        "Personal data is kept for as long as reasonably necessary for the purpose for which it was collected, to provide and secure the service, meet applicable obligations, and handle legal requests. Account, product-access, and personalization data may be retained while the account or related access remains active. A preorder registration may be retained until the related eligibility is used, expires, is withdrawn, or no longer needs to be administered.",
      ] },
      { h: "12. Your Rights and Requests", paragraphs: [
        "You may contact juliamakhlinfiurst@gmail.com to request access to, correction of, or deletion of applicable personal data, or to withdraw the preorder communication consent. LapLapLa does not currently provide automated self-service account deletion. We may need to verify your identity and ask for enough information to locate the relevant account, preorder, personalization, or technical records.",
        "Some aggregate information cannot be linked back to an individual and therefore cannot be individually accessed, corrected, or deleted. Requests are handled in accordance with applicable law.",
      ] },
      { h: "13. Changes", paragraphs: [
        "This policy may be updated when the service or its data practices change. The current version is published on this page.",
      ] },
    ],
  },
  he: {
    title: "מדיניות פרטיות",
    lastUpdated: "עדכון אחרון: 1 באוקטובר 2026.",
    sections: [
      { h: "1. מבוא", paragraphs: [
        "מדיניות זו מסבירה איזה מידע LapLapLa מעבדת, מדוע הוא נחוץ, לאן הוא עשוי להישלח ואילו אפשרויות עומדות לרשותכם. ברוב התכנים הציבוריים אפשר לצפות ללא חשבון.",
      ] },
      { h: "2. חשבונות לקוחות ואימות", paragraphs: [
        "אפשר להשתמש בחשבון לקוח של LapLapLa עבור תכונות שדורשות גישה שמורה, למשל צפייה במוצרים דיגיטליים הזמינים בחשבון, ניהול הגישה למוצרים וחזרה להתאמה אישית שנשמרה. אין צורך בחשבון כדי לגלוש כרגיל בחלקים הציבוריים של האתר.",
        "הכניסה לחשבון לקוח מתבצעת באמצעות Supabase Auth. בהתאם לאפשרות שתבחרו, האימות יכול להתבצע באמצעות Google OAuth או באמצעות קישור חד־פעמי שנשלח לכתובת האימייל. לצורך הכניסה ואבטחת החשבון LapLapLa מעבדת את כתובת האימייל, מזהה המשתמש ב‑Supabase, הפעלת האימות ואסימוני האבטחה הנדרשים.",
        "לגישה המוגבלת של מנהלי המערכת יש תהליך הרשאה נפרד. כניסה לחשבון לקוח אינה מעניקה כשלעצמה הרשאת מנהל.",
      ] },
      { h: "3. גישה למוצרים והתאמה אישית", paragraphs: [
        "LapLapLa שומרת מידע על המוצרים הדיגיטליים שאליהם יש לחשבון לקוח גישה. כך אפשר להציג את המוצרים הזמינים ולהגן על כלי יצירה והתאמה אישית המיועדים ללקוחות.",
        "בעת שימוש בהתאמה אישית, LapLapLa עשויה לשמור מידע שבחרתם להזין, כגון שם לתצוגה או שמות משתתפים, כדי שתוכלו לחזור למוצר ולערוך אותו בהמשך. אתם מחליטים מה להזין; אין חובה למסור שמות אמיתיים של ילדים או מידע רגיש אחר לצורך ההתאמה האישית.",
      ] },
      { h: "4. הרשמה מוקדמת וגישה מוקדמת", paragraphs: [
        "אפשר למסור כתובת אימייל כדי להירשם להזמנה המוקדמת של תיק הצלילים מס׳ 001. המטרה היא לתעד את ההרשמה, לשמור את הזכאות למחיר המיוחד ולשלוח הודעה כשהמוצר יהיה זמין. כתובת האימייל נשמרת בצורה אחידה כדי שניתן יהיה להתאים אותה בהמשך באופן אמין לאימייל המאומת של חשבון לקוח ב‑LapLapLa.",
        "ההרשמה המוקדמת מבוססת על הסכמה חד־שלבית: הזכאות נרשמת בעת שליחת הטופס ולאחר הסכמה מפורשת לקבלת הודעה על השקת המוצר ועל מחיר ההזמנה המוקדמת. ההרשמה אינה יוצרת חשבון לקוח באופן אוטומטי, אינה רכישה ואינה כוללת תשלום. כתובת האימייל של ההרשמה המוקדמת אינה משמשת כהסכמה לדיוור פרסומי כללי ללא הגבלת זמן.",
      ] },
      { h: "5. ניתוח השימוש במוצר", paragraphs: [
        "LapLapLa אוספת נתוני שימוש פסאודונימיים. האירועים עשויים לכלול צפיות בדפים, הפעלות, שפה, סוג מכשיר וגודל מסך, פתיחה והשלמה של תוכן, שימוש במפות ובכלי יצירה, פעולות בפרויקטים או בייצוא, פתיחת קישורים חיצוניים, תוצאות של טופס ההרשמה המוקדמת ושגיאות טכניות.",
        "לצורכי ניתוח שימוש LapLapLa יוצרת ב‑localStorage מזהה אקראי למבקר ומזהה אקראי להפעלה. הפעלה יכולה להיות משותפת לכרטיסיות באותו פרופיל דפדפן ומתחלפת לאחר פרק זמן ללא פעילות מתועדת. המזהים האלה אינם מיועדים להכיל שם או כתובת אימייל. כתובת האימייל של ההרשמה המוקדמת, האימייל בצורתו האחידה, גיבוב של האימייל, מזהי לקוחות ומזהי רשומות הרשמה אינם נשלחים כמאפייני ניתוח שימוש.",
        "אירועי ניתוח גולמיים נשמרים ב‑Supabase ונמחקים בדרך כלל לאחר כ‑15 ימים. דוחות מצטברים שאינם כוללים מזהים של מבקרים או הפעלות בודדות עשויים להישמר זמן רב יותר.",
      ] },
      { h: "6. אחסון בדפדפן וחומרים מקומיים", paragraphs: [
        "LapLapLa משתמשת באחסון הדפדפן, לרבות localStorage, sessionStorage ו‑IndexedDB, עבור העדפות שפה, הפעלות אימות, מזהי ניתוח שימוש, מצב היישום ופרויקטים שנוצרים מקומית, לפי העניין.",
        "ציורים, פרויקטים מקומיים באולפן, קבצים שנבחרו והקלטות קול יכולים להישאר במכשיר באמצעות אחסון הדפדפן, כתובות data או כתובות blob זמניות. אם תכונה מסוימת שומרת במפורש התאמה אישית בחשבון, ההתאמה נשמרת אצל LapLapLa כמתואר לעיל. נתוני הניתוח עשויים לתעד שפעולה התבצעה, אך לא את תוכן הציור, ההקלטה או קובץ הפרויקט המקומי.",
      ] },
      { h: "7. חיפוש ומדיה חיצונית", paragraphs: [
        "שאילתות חיפוש עשויות להישלח לשרתי LapLapLa. חיפוש תמונות, קובצי GIF, סרטונים או מדיה אחרת עשוי להישלח גם אל GIPHY, Pexels, Pixabay, Reddit או Imgflip כדי לקבל תוצאות מתאימות. חלק מהשאילתות עשויות להישמר לזמן קצר במטמון של Supabase לצורך שיפור הביצועים.",
        "YouTube מספקת סרטונים מוטמעים ועשויה לקבל מידע רגיל על בקשות דפדפן והפעלת סרטונים בהתאם למדיניות Google. שירותים חיצוניים מעבדים מידע לפי התנאים ומדיניות הפרטיות שלהם.",
      ] },
      { h: "8. מידע טכני, אבטחה ואבחון", paragraphs: [
        "LapLapLa משתמשת ב‑Sentry לדוחות שגיאה ולאבחון ביצועים. דוח עשוי לכלול stack trace, נתיב או כתובת URL, סוג דפדפן, סביבת הרצה והקשר טכני של הבקשה. שדות רגישים מזוהים, כגון אסימוני הרשאה, גופי בקשות, קובצי cookie וכתובות אימייל, מסוננים בהתאם לתצורת הניטור הנוכחית, אך שום מערכת סינון אינה יכולה להבטיח הגנה מוחלטת.",
        "Vercel עשויה ליצור יומני אירוח ושרת רגילים, לרבות נתיבי בקשות, חותמות זמן, קודי מצב, מידע רשת ונתוני אבחון. כתובת IP עשויה לעבור עיבוד לצורך הגבלת קצב הבקשות, מניעת שימוש לרעה והגנה על השירות. כאשר מופעלת הגבלת בקשות מבוזרת, Upstash עשויה לעבד גיבוב של כתובת ה‑IP ומוני בקשות למשך חלון ההגבלה הרלוונטי.",
        "LapLapLa משתמשת ב‑HTTPS ובבקרות גישה סבירות, אך שום שירות מקוון אינו יכול להבטיח אבטחה מוחלטת.",
      ] },
      { h: "9. ספקי שירות", paragraphs: [
        "LapLapLa משתמשת ב‑Supabase לצורכי אימות, נתוני לקוחות וגישה למוצרים, התאמה אישית שנשמרה, הרשמות מוקדמות, ניתוח שימוש, אחסון תוכן ציבורי ופונקציות מסד נתונים נוספות; ב‑Sentry לצורכי אבחון; ב‑Vercel לצורכי אירוח ויומני שרת; וכאשר השירות מופעל, ב‑Upstash להגבלת בקשות מבוזרת. Google מספקת אימות זהות כאשר בוחרים בכניסה באמצעות Google.",
        "LapLapLa אינה מעבדת כיום תשלומים באמצעות PayPal או ספק תשלומים אחר. עיבוד תשלומים יתואר במדיניות זו אם וכאשר יהיה זמין.",
      ] },
      { h: "10. דרישת גיל", paragraphs: [
        "השירות הראשי של LapLapLa מיועד למשתמשים בני 16 ומעלה ואינו מיועד למשתמשים מתחת לגיל 16.",
      ] },
      { h: "11. תקופת שמירה", paragraphs: [
        "מידע אישי נשמר כל עוד הוא נחוץ באופן סביר למטרה שלשמה נאסף, להפעלת השירות ולאבטחתו, למילוי התחייבויות רלוונטיות ולטיפול בדרישות משפטיות. נתוני חשבון, גישה למוצרים והתאמה אישית עשויים להישמר כל עוד החשבון או הגישה הקשורה פעילים. הרשמה מוקדמת עשויה להישמר עד למימוש הזכאות, לפקיעתה, לביטולה או עד שלא יהיה עוד צורך לנהל אותה.",
      ] },
      { h: "12. הזכויות שלכם ובקשות בנוגע למידע", paragraphs: [
        "אפשר לפנות אל juliamakhlinfiurst@gmail.com כדי לבקש גישה למידע אישי רלוונטי, לתקן אותו או למחוק אותו, או כדי לבטל את ההסכמה לקבלת הודעת ההרשמה המוקדמת. LapLapLa אינה מציעה כיום מחיקה אוטומטית של חשבון בשירות עצמי. ייתכן שנצטרך לאמת את זהותכם ולבקש מידע מספיק כדי לאתר את החשבון, ההרשמה המוקדמת, ההתאמה האישית או הרשומות הטכניות הרלוונטיות.",
        "חלק מהמידע המצטבר אינו ניתן לקישור מחדש לאדם מסוים, ולכן לא ניתן לספק לגביו גישה, תיקון או מחיקה פרטניים. הבקשות יטופלו בהתאם לדין החל.",
      ] },
      { h: "13. שינויים", paragraphs: [
        "מדיניות זו עשויה להתעדכן כאשר השירות או אופן הטיפול במידע משתנים. הגרסה העדכנית מתפרסמת בדף זה.",
      ] },
    ],
  },
  ru: {
    title: "Политика конфиденциальности",
    lastUpdated: "Последнее обновление: 1 октября 2026 года.",
    sections: [
      { h: "1. Введение", paragraphs: [
        "Эта Политика конфиденциальности объясняет, какие сведения обрабатывает LapLapLa, зачем они нужны, куда могут передаваться и какие возможности есть у пользователя. Большинство публичных материалов можно просматривать без аккаунта.",
      ] },
      { h: "2. Пользовательские аккаунты и аутентификация", paragraphs: [
        "Пользователь может использовать аккаунт LapLapLa для функций, которым нужен сохранённый доступ: например, чтобы видеть доступные аккаунту цифровые продукты, управлять доступом к ним и возвращаться к сохранённой персонализации. Аккаунт не требуется для обычного просмотра публичной части сайта.",
        "Вход в пользовательский аккаунт работает через Supabase Auth. В зависимости от выбранного способа аутентификация может выполняться через Google OAuth или одноразовую ссылку, отправленную на электронную почту. Для входа и защиты аккаунта LapLapLa обрабатывает email, идентификатор пользователя Supabase, сессию аутентификации и необходимые защитные токены.",
        "Для ограниченного административного доступа существует отдельный процесс авторизации. Сам по себе вход в пользовательский аккаунт не даёт административных прав.",
      ] },
      { h: "3. Доступ к продуктам и персонализация", paragraphs: [
        "LapLapLa хранит сведения о том, к каким цифровым продуктам имеет доступ пользовательский аккаунт. Это позволяет показывать доступные продукты и защищать предназначенные для покупателей инструменты создания и персонализации.",
        "При использовании персонализации LapLapLa может сохранять сведения, которые пользователь решил ввести, например отображаемое имя или имена участников, чтобы к продукту можно было вернуться и отредактировать его позже. Пользователь сам выбирает, что указывать; LapLapLa не требует настоящие имена детей или другие чувствительные сведения для персонализации.",
      ] },
      { h: "4. Предзаказ и ранний доступ", paragraphs: [
        "Пользователь может оставить email, чтобы зарегистрироваться на предзаказ Дела о звуке № 001. Это нужно, чтобы зафиксировать регистрацию, сохранить право на специальную цену предзаказа и отправить сообщение, когда продукт станет доступен. Email хранится в стандартизированном виде, чтобы позднее его можно было надёжно сопоставить с подтверждённым email пользовательского аккаунта LapLapLa.",
        "Для предзаказа используется одноэтапное согласие: право фиксируется при отправке формы после явного согласия получить сообщение о запуске продукта и цене предзаказа. Регистрация не создаёт аккаунт автоматически, не является покупкой и не предполагает оплату. Email предзаказа не считается согласием на бессрочную общую рекламную рассылку.",
      ] },
      { h: "5. Продуктовая аналитика", paragraphs: [
        "LapLapLa собирает псевдонимную статистику использования. События могут включать просмотры страниц, сессии, язык, категорию устройства и размер экрана, открытие и завершение контента, использование карт и творческих инструментов, действия с проектами или экспортом, переходы по внешним ссылкам, результаты формы предзаказа и технические ошибки.",
        "Для аналитики LapLapLa создаёт в localStorage случайный идентификатор посетителя и идентификатор сессии. Сессия может быть общей для вкладок одного профиля браузера и меняется после периода без отслеживаемой активности. Эти идентификаторы не предназначены для хранения имени или email. Email предзаказа, его стандартизированная версия или хеш, идентификаторы пользователя и записи предзаказа не передаются как свойства аналитики.",
        "Сырые аналитические события хранятся в Supabase и обычно удаляются приблизительно через 15 дней. Агрегированные отчёты без идентификаторов отдельных посетителей или сессий могут храниться дольше.",
      ] },
      { h: "6. Хранилища браузера и локальные материалы", paragraphs: [
        "LapLapLa использует хранилища браузера, включая localStorage, sessionStorage и IndexedDB, для языковых настроек, сессий аутентификации, идентификаторов аналитики, состояния приложения и локально созданных проектов, когда это применимо.",
        "Рисунки, локальные проекты студий, выбранные файлы и голосовые записи могут оставаться на устройстве в хранилище браузера, data URL или временных blob URL. Если функция явно сохраняет персонализацию в аккаунте, она хранится у LapLapLa, как описано выше. Аналитика может фиксировать факт действия, но не содержимое рисунка, записи или локального файла проекта.",
      ] },
      { h: "7. Поиск и внешние медиа", paragraphs: [
        "Поисковые запросы могут отправляться на серверы LapLapLa. При поиске изображений, GIF, видео или других медиа запрос также может передаваться GIPHY, Pexels, Pixabay, Reddit или Imgflip для получения подходящих результатов. Некоторые запросы могут кратковременно храниться в кеше Supabase для повышения производительности.",
        "YouTube предоставляет встроенные видео и может получать стандартные сведения о запросах браузера и воспроизведении в соответствии с политиками Google. Внешние сервисы обрабатывают информацию по собственным условиям и политикам конфиденциальности.",
      ] },
      { h: "8. Технические данные, безопасность и диагностика", paragraphs: [
        "LapLapLa использует Sentry для отчётов об ошибках и диагностики производительности. Отчёт может включать stack trace, маршрут или URL, тип браузера, среду выполнения и технический контекст запроса. Распознанные чувствительные поля, например токены авторизации, тела запросов, cookies и email, фильтруются согласно текущей конфигурации мониторинга, однако ни одна система фильтрации не может дать абсолютной гарантии.",
        "Vercel может создавать стандартные журналы хостинга и сервера: маршруты запросов, время, коды ответа, сетевую информацию и данные диагностики. IP‑адрес может обрабатываться для ограничения частоты запросов, предотвращения злоупотреблений и защиты сервиса. Когда включено распределённое ограничение запросов, Upstash может обрабатывать хеш IP‑адреса и счётчики запросов на время соответствующего окна ограничения.",
        "LapLapLa использует HTTPS и разумные меры контроля доступа, но ни один онлайн‑сервис не может гарантировать абсолютную безопасность.",
      ] },
      { h: "9. Поставщики услуг", paragraphs: [
        "LapLapLa использует Supabase для аутентификации, данных пользователей и доступа к продуктам, сохранённой персонализации, регистраций предзаказа, аналитики, хранения публичного контента и других функций базы данных; Sentry — для диагностики; Vercel — для хостинга и серверных журналов; Upstash, когда он включён, — для распределённого ограничения запросов. Google предоставляет проверку личности при выборе входа через Google.",
        "Сейчас LapLapLa не обрабатывает платежи через PayPal или другого платёжного провайдера. Если обработка платежей станет доступна, она будет описана в этой политике.",
      ] },
      { h: "10. Возрастные требования", paragraphs: [
        "Основной сервис LapLapLa предназначен для пользователей 16 лет и старше и не предназначен для пользователей младше 16 лет.",
      ] },
      { h: "11. Срок хранения", paragraphs: [
        "Персональные данные хранятся столько, сколько разумно необходимо для цели их сбора, работы и защиты сервиса, выполнения применимых обязательств и обработки законных запросов. Данные аккаунта, доступа к продуктам и персонализации могут храниться, пока аккаунт или связанный доступ остаются активными. Регистрация предзаказа может храниться до использования, истечения или отзыва соответствующего права либо пока необходимость управлять этим правом не отпадёт.",
      ] },
      { h: "12. Права пользователя и запросы", paragraphs: [
        "Можно обратиться по адресу juliamakhlinfiurst@gmail.com, чтобы запросить доступ к применимым персональным данным, их исправление или удаление либо отозвать согласие на сообщение о предзаказе. Сейчас LapLapLa не предоставляет автоматическое самостоятельное удаление аккаунта. Для выполнения запроса может потребоваться подтвердить личность и предоставить достаточно сведений, чтобы найти соответствующий аккаунт, предзаказ, персонализацию или технические записи.",
        "Некоторые агрегированные сведения невозможно связать с конкретным человеком, поэтому предоставить индивидуальный доступ к ним, исправить или удалить их невозможно. Запросы рассматриваются в соответствии с применимым законодательством.",
      ] },
      { h: "13. Изменения", paragraphs: [
        "Политика может обновляться при изменении сервиса или способов обработки данных. Актуальная версия публикуется на этой странице.",
      ] },
    ],
  },
};

export default function PrivacyPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const seo = dictionaries[lang].seo.legal.privacy;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/privacy";
  const content = PRIVACY_CONTENT[lang];

  return (
    <>
      <SEO title={seo.title} description={seo.description} path={seoPath} />
      <main
        className="legal-page"
        dir={lang === "he" ? "rtl" : "ltr"}
        style={{ maxWidth: 900, margin: "0 auto", padding: "60px 20px" }}
      >
        <h1 style={{ marginBottom: 12 }}>{content.title}</h1>
        <p style={{ marginBottom: 32, opacity: 0.72 }}>{content.lastUpdated}</p>

        {content.sections.map((section) => (
          <section key={section.h} style={{ marginBottom: 32 }}>
            <h2 style={{ marginBottom: 12 }}>{section.h}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} style={{ lineHeight: 1.7, marginBottom: 12 }}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </main>
    </>
  );
}
