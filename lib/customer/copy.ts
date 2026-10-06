import type { Lang } from "@/i18n";

type CustomerCopy = {
  signInTitle: string;
  signInIntro: string;
  google: string;
  emailLabel: string;
  emailPlaceholder: string;
  magicLink: string;
  magicLinkSent: string;
  signingIn: string;
  callback: string;
  accountTitle: string;
  signedInAs: string;
  memberSince: string;
  purchasesTitle: string;
  emptyPurchases: string;
  openProduct: string;
  personalize: string;
  signOut: string;
  signedOut: string;
  loading: string;
  retry: string;
  entitlementRequiredTitle: string;
  entitlementRequiredBody: string;
  backToProduct: string;
  active: string;
  unavailable: string;
  billingTitle: string;
  billingNameLabel: string;
  billingHelp: string;
  billingSave: string;
  billingSaving: string;
  billingSaved: string;
  verifiedEmail: string;
};
export const customerCopy: Record<Lang, CustomerCopy> = {
  ru: {
    signInTitle: "Войти в LapLapLa",
    signInIntro: "Войдите, чтобы увидеть свои покупки и открыть персонализацию.",
    google: "Войти через Google",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    magicLink: "Прислать ссылку для входа",
    magicLinkSent: "Ссылка для входа отправлена. Проверьте почту.",
    signingIn: "Подключаемся…",
    callback: "Завершаем вход…",
    accountTitle: "Мой аккаунт",
    signedInAs: "Вы вошли как",
    memberSince: "Аккаунт создан",
    purchasesTitle: "Мои покупки",
    emptyPurchases: "В этом аккаунте пока нет продуктов.",
    openProduct: "Открыть продукт",
    personalize: "Персонализировать",
    signOut: "Выйти",
    signedOut: "Вы вышли из аккаунта.",
    loading: "Загружаем аккаунт…",
    retry: "Попробовать снова",
    entitlementRequiredTitle: "Этот продукт не принадлежит аккаунту",
    entitlementRequiredBody: "Персонализация доступна владельцу активного права на продукт.",
    backToProduct: "Вернуться к продукту",
    active: "Доступен",
    unavailable: "Недоступен",
    billingTitle: "Данные для документов",
    billingNameLabel: "Имя для чека",
    billingHelp: "Это имя будет использоваться для будущих документов о покупке. Изменение не меняет данные прошлых заказов.",
    billingSave: "Сохранить имя",
    billingSaving: "Сохраняем…",
    billingSaved: "Имя сохранено",
    verifiedEmail: "Подтверждённый email",
  },
  en: {
    signInTitle: "Sign in to LapLapLa",
    signInIntro: "Sign in to see your purchases and open personalization.",
    google: "Continue with Google",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    magicLink: "Email me a sign-in link",
    magicLinkSent: "The sign-in link is on its way. Check your email.",
    signingIn: "Connecting…",
    callback: "Finishing sign-in…",
    accountTitle: "My account",
    signedInAs: "Signed in as",
    memberSince: "Account created",
    purchasesTitle: "My purchases",
    emptyPurchases: "There are no products in this account yet.",
    openProduct: "Open product",
    personalize: "Personalize",
    signOut: "Sign out",
    signedOut: "You have signed out.",
    loading: "Loading your account…",
    retry: "Try again",
    entitlementRequiredTitle: "This product does not belong to this account",
    entitlementRequiredBody: "Personalization requires an active entitlement for this product.",
    backToProduct: "Back to product",
    active: "Available",
    unavailable: "Unavailable",
    billingTitle: "Receipt details",
    billingNameLabel: "Name for receipt",
    billingHelp: "This name will be used for future purchase documents. Changing it does not alter previous orders.",
    billingSave: "Save name",
    billingSaving: "Saving…",
    billingSaved: "Name saved",
    verifiedEmail: "Verified email",
  },
  he: {
    signInTitle: "כניסה ל-LapLapLa",
    signInIntro: "היכנסו כדי לראות את הרכישות ולפתוח את ההתאמה האישית.",
    google: "כניסה עם Google",
    emailLabel: "אימייל",
    emailPlaceholder: "you@example.com",
    magicLink: "שלחו לי קישור לכניסה",
    magicLinkSent: "קישור הכניסה נשלח. בדקו את האימייל.",
    signingIn: "מתחברים…",
    callback: "מסיימים את הכניסה…",
    accountTitle: "החשבון שלי",
    signedInAs: "מחוברים בתור",
    memberSince: "החשבון נוצר",
    purchasesTitle: "הרכישות שלי",
    emptyPurchases: "עדיין אין מוצרים בחשבון הזה.",
    openProduct: "פתיחת המוצר",
    personalize: "התאמה אישית",
    signOut: "יציאה",
    signedOut: "יצאתם מהחשבון.",
    loading: "טוענים את החשבון…",
    retry: "לנסות שוב",
    entitlementRequiredTitle: "המוצר הזה אינו שייך לחשבון",
    entitlementRequiredBody: "ההתאמה האישית זמינה לבעלי הרשאה פעילה למוצר.",
    backToProduct: "חזרה למוצר",
    active: "זמין",
    unavailable: "לא זמין",
    billingTitle: "פרטים למסמכי רכישה",
    billingNameLabel: "שם לקבלה",
    billingHelp: "השם ישמש במסמכי רכישה עתידיים. שינוי השם לא משנה הזמנות קודמות.",
    billingSave: "שמירת השם",
    billingSaving: "שומרים…",
    billingSaved: "השם נשמר",
    verifiedEmail: "אימייל מאומת",
  },
};
