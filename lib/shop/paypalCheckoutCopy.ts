import type { Lang } from "@/i18n";

export type PayPalCheckoutCopy = {
  title: string;
  intro: string;
  sandboxBadge: string;
  loading: string;
  signInTitle: string;
  signInBody: string;
  signIn: string;
  regularPrice: string;
  preorderPrice: string;
  payWithPayPal: string;
  secureNote: string;
  cancelled: string;
  unavailable: string;
  retry: string;
  ownedTitle: string;
  ownedBody: string;
  openBuilder: string;
  successTitle: string;
  successBody: string;
};

export const paypalCheckoutCopy: Record<Lang, PayPalCheckoutCopy> = {
  ru: {
    title: "Оформление Sound Case #001",
    intro: "Тестовая покупка через PayPal Sandbox. Итоговую цену безопасно определяет LapLapLa.",
    sandboxBadge: "PayPal Sandbox · тестовая оплата",
    loading: "Проверяем аккаунт и цену…",
    signInTitle: "Сначала войдите в LapLapLa",
    signInBody: "Покупка привязывается к вашему аккаунту и после оплаты открывает персонализацию.",
    signIn: "Войти и продолжить",
    regularPrice: "Обычная цена",
    preorderPrice: "Ваша цена предзаказа",
    payWithPayPal: "Оплатить через PayPal Sandbox",
    secureNote: "Платёж проходит в защищённом окне PayPal. LapLapLa не получает данные карты.",
    cancelled: "Оплата отменена. Деньги не списаны.",
    unavailable: "Сейчас не удалось открыть PayPal. Попробуйте ещё раз.",
    retry: "Попробовать снова",
    ownedTitle: "Sound Case #001 уже доступен",
    ownedBody: "Повторная покупка не нужна — продукт уже принадлежит этому аккаунту.",
    openBuilder: "Открыть персонализацию",
    successTitle: "Оплата подтверждена",
    successBody: "Sound Case #001 добавлен в ваш аккаунт. Теперь можно создать своё приключение.",
  },
  en: {
    title: "Sound Case #001 checkout",
    intro: "A test purchase through PayPal Sandbox. LapLapLa securely resolves the final price.",
    sandboxBadge: "PayPal Sandbox · test payment",
    loading: "Checking your account and price…",
    signInTitle: "Sign in to LapLapLa first",
    signInBody: "Your purchase is linked to your account and unlocks personalization after payment.",
    signIn: "Sign in and continue",
    regularPrice: "Regular price",
    preorderPrice: "Your preorder price",
    payWithPayPal: "Pay with PayPal Sandbox",
    secureNote: "Payment happens in PayPal's hosted experience. LapLapLa does not receive card details.",
    cancelled: "Payment was cancelled. You were not charged.",
    unavailable: "PayPal could not be opened right now. Please try again.",
    retry: "Try again",
    ownedTitle: "Sound Case #001 is already available",
    ownedBody: "No second purchase is needed — this product already belongs to your account.",
    openBuilder: "Open personalization",
    successTitle: "Payment confirmed",
    successBody: "Sound Case #001 is now in your account. You can create your adventure.",
  },
  he: {
    title: "תשלום עבור תיק הצלילים מס׳ 001",
    intro: "רכישת ניסיון דרך PayPal Sandbox. המחיר הסופי נקבע בצורה מאובטחת על ידי LapLapLa.",
    sandboxBadge: "PayPal Sandbox · תשלום ניסיוני",
    loading: "בודקים את החשבון ואת המחיר…",
    signInTitle: "קודם נכנסים ל־LapLapLa",
    signInBody: "הרכישה משויכת לחשבון שלכם, ולאחר התשלום נפתחת ההתאמה האישית.",
    signIn: "כניסה והמשך",
    regularPrice: "מחיר רגיל",
    preorderPrice: "מחיר ההרשמה המוקדמת שלכם",
    payWithPayPal: "תשלום דרך PayPal Sandbox",
    secureNote: "התשלום מתבצע בחלון המאובטח של PayPal. פרטי הכרטיס אינם נמסרים ל־LapLapLa.",
    cancelled: "התשלום בוטל ולא בוצע חיוב.",
    unavailable: "לא הצלחנו לפתוח את PayPal כרגע. נסו שוב.",
    retry: "לנסות שוב",
    ownedTitle: "תיק הצלילים מס׳ 001 כבר זמין",
    ownedBody: "אין צורך לרכוש שוב — המוצר כבר שייך לחשבון הזה.",
    openBuilder: "פתיחת ההתאמה האישית",
    successTitle: "התשלום אושר",
    successBody: "תיק הצלילים מס׳ 001 נוסף לחשבון שלכם. עכשיו אפשר ליצור את ההרפתקה.",
  },
};
