import Link from "next/link";
import { useRouter } from "next/router";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";

const copy = {
  ru: { title: "Запрос на удаление аккаунта", body: "Отправьте запрос с адреса электронной почты вашего аккаунта. Мы проверим личность и сообщим о порядке удаления аккаунта и данных. Учётные и бухгалтерские записи могут храниться в сроки, установленные законом.", action: "Отправить запрос", back: "Вернуться в аккаунт", subject: "Удаление аккаунта LapLapLa" },
  en: { title: "Request account deletion", body: "Send a request from the email address of your account. We will verify your identity and explain how the account and data will be deleted. Accounting records may be retained where required by law.", action: "Send request", back: "Back to account", subject: "LapLapLa account deletion" },
  he: { title: "בקשה למחיקת חשבון", body: "שלחו בקשה מכתובת הדוא״ל של החשבון. נאמת את זהותכם ונסביר כיצד יימחקו החשבון והנתונים. רשומות חשבונאיות עשויות להישמר כנדרש בחוק.", action: "שליחת בקשה", back: "חזרה לחשבון", subject: "בקשה למחיקת חשבון LapLapLa" },
};

export default function AccountDeletionRequestPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const text = copy[lang];
  return <main className="customer-account" dir={lang === "he" ? "rtl" : "ltr"}>
    <section className="customer-account__panel">
      <h1>{text.title}</h1><p>{text.body}</p>
      <p><a className="customer-account__primary" href={`mailto:juliamakhlinfiurst@gmail.com?subject=${encodeURIComponent(text.subject)}`}>{text.action}</a></p>
      <Link href={buildLocalizedPublicPath("/account", lang)}>{text.back}</Link>
    </section>
  </main>;
}
