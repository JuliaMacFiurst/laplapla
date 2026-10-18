import type { Lang } from "@/i18n";

export const purchaseSuccessCopy: Record<Lang, {
  pageTitle: string;
  title: string;
  body: string;
  personalize: string;
  purchases: string;
  loading: string;
  processingTitle: string;
  processingBody: string;
  checkAgain: string;
  unconfirmedTitle: string;
  unconfirmedBody: string;
  checkout: string;
  signInTitle: string;
  signInBody: string;
  signIn: string;
  errorTitle: string;
  errorBody: string;
}> = {
  ru: {
    pageTitle: "Покупка Sound Case #001",
    title: "🎉 Поздравляем с покупкой!",
    body: "Ваш звуковой квест теперь ваш! Осталось добавить немного волшебства: имя главного героя и участников приключения.",
    personalize: "Персонализировать мой квест",
    purchases: "Мои покупки",
    loading: "Проверяем покупку…",
    processingTitle: "Завершаем оформление покупки",
    processingBody: "Оплата подтверждена. Проверяем доступ к квесту. Пожалуйста, проверьте статус чуть позже.",
    checkAgain: "Проверить статус",
    unconfirmedTitle: "Покупка пока не подтверждена",
    unconfirmedBody: "Мы не нашли подтверждённую покупку для этого заказа. Вернитесь к оформлению или проверьте свои покупки.",
    checkout: "Вернуться к оформлению",
    signInTitle: "Войдите, чтобы проверить покупку",
    signInBody: "Статус заказа доступен только покупателю в его аккаунте.",
    signIn: "Войти в аккаунт",
    errorTitle: "Не удалось проверить покупку",
    errorBody: "Попробуйте ещё раз. Повторная оплата для проверки не нужна.",
  },
  en: {
    pageTitle: "Sound Case #001 purchase",
    title: "🎉 Your adventure is ready!",
    body: "Sound Case #001 is yours! Personalize your quest by adding the names of your main character and fellow adventurers.",
    personalize: "Personalize my quest",
    purchases: "My purchases",
    loading: "Checking your purchase…",
    processingTitle: "Finishing your purchase",
    processingBody: "Your payment is confirmed. We are checking access to your quest. Please check again shortly.",
    checkAgain: "Check status",
    unconfirmedTitle: "Purchase not confirmed yet",
    unconfirmedBody: "We could not find a confirmed purchase for this order. Return to checkout or review your purchases.",
    checkout: "Back to checkout",
    signInTitle: "Sign in to check your purchase",
    signInBody: "Only the purchaser can view this order's status.",
    signIn: "Sign in",
    errorTitle: "We could not check your purchase",
    errorBody: "Please try again. You do not need to pay again to check its status.",
  },
  he: {
    pageTitle: "רכישת Sound Case #001",
    title: "🎉 ההרפתקה שלכם מוכנה!",
    body: "ההרפתקה הקולית שלכם מחכה לכם! עכשיו אפשר להוסיף את שם הגיבור הראשי ואת שמות המשתתפים בהרפתקה.",
    personalize: "התאמה אישית של ההרפתקה",
    purchases: "הרכישות שלי",
    loading: "בודקים את הרכישה…",
    processingTitle: "משלימים את הרכישה",
    processingBody: "התשלום אושר. אנו בודקים את הגישה להרפתקה. כדאי לבדוק שוב בעוד רגע.",
    checkAgain: "בדיקת סטטוס",
    unconfirmedTitle: "הרכישה עדיין לא אושרה",
    unconfirmedBody: "לא נמצאה רכישה מאושרת להזמנה הזו. אפשר לחזור לתשלום או לבדוק את הרכישות שלכם.",
    checkout: "חזרה לתשלום",
    signInTitle: "יש להתחבר כדי לבדוק את הרכישה",
    signInBody: "רק הרוכש או הרוכשת יכולים לראות את סטטוס ההזמנה הזו.",
    signIn: "כניסה לחשבון",
    errorTitle: "לא הצלחנו לבדוק את הרכישה",
    errorBody: "אפשר לנסות שוב. אין צורך לשלם שוב כדי לבדוק את הסטטוס.",
  },
};
