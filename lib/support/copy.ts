import type { Lang } from "@/i18n";
import type { SupportCategory } from "@/lib/support/types";

type Copy = {
  title: string; intro: string; email: string; order: string; noOrder: string; message: string;
  submit: string; sending: string; success: string; reference: string; failed: string;
  cancellationNote: string; category: string; categories: Record<SupportCategory, string>;
  accountLink: string; footerLink: string; checkoutLink: string; orderLoading: string;
};

export const supportCopy: Record<Lang, Copy> = {
  ru: {
    title: "Поддержка покупателей", intro: "Расскажите, что случилось. Мы рассмотрим ваше обращение и ответим по email.",
    email: "Ваш email", order: "Номер заказа (если есть)", noOrder: "Без заказа", message: "Опишите ситуацию",
    submit: "Отправить обращение", sending: "Отправляем…", success: "Обращение получено. Мы ответим по email.",
    reference: "Номер обращения", failed: "Не удалось отправить обращение. Попробуйте ещё раз.",
    cancellationNote: "Отправка формы сама по себе не отменяет заказ и не ограничивает другие законные способы обращения об отмене покупки.",
    category: "Тема обращения", categories: { payment: "Оплата или доступ", refund: "Возврат или отмена", technical: "Техническая проблема", question: "Вопрос о продукте", other: "Другое" },
    accountLink: "Обратиться в поддержку", footerLink: "Поддержка покупателей", checkoutLink: "Нужна помощь с оплатой?", orderLoading: "Загружаем ваши заказы…",
  },
  en: {
    title: "Customer support", intro: "Tell us what happened. We’ll review your request and reply by email.",
    email: "Your email", order: "Order number (if available)", noOrder: "No order", message: "Describe the issue",
    submit: "Send request", sending: "Sending…", success: "We received your request. We’ll reply by email.",
    reference: "Request number", failed: "We couldn’t send your request. Please try again.",
    cancellationNote: "Submitting this form does not itself cancel an order or limit other lawful ways to request cancellation.",
    category: "Request topic", categories: { payment: "Payment or access", refund: "Refund or cancellation", technical: "Technical problem", question: "Product question", other: "Other" },
    accountLink: "Contact support", footerLink: "Customer support", checkoutLink: "Need help with payment?", orderLoading: "Loading your orders…",
  },
  he: {
    title: "תמיכה ללקוחות", intro: "ספרו לנו מה קרה. נבדוק את הפנייה ונשיב בדוא״ל.",
    email: "כתובת הדוא״ל שלך", order: "מספר הזמנה (אם יש)", noOrder: "ללא הזמנה", message: "תיאור הבעיה",
    submit: "שליחת פנייה", sending: "שולחים…", success: "הפנייה התקבלה. נשיב בדוא״ל.",
    reference: "מספר פנייה", failed: "לא הצלחנו לשלוח את הפנייה. כדאי לנסות שוב.",
    cancellationNote: "שליחת הטופס אינה מבטלת את ההזמנה כשלעצמה ואינה מגבילה דרכים חוקיות אחרות להודיע על ביטול עסקה.",
    category: "נושא הפנייה", categories: { payment: "בעיה בתשלום או בגישה", refund: "בקשת החזר או ביטול", technical: "בעיה טכנית", question: "שאלה על מוצר", other: "אחר" },
    accountLink: "פנייה לתמיכה", footerLink: "תמיכה ללקוחות", checkoutLink: "צריכים עזרה בתשלום?", orderLoading: "טוענים את ההזמנות שלך…",
  },
};
