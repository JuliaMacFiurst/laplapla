import type { Lang } from "@/i18n";

// Bump a version when the corresponding published text changes materially.
export const CHECKOUT_CONSENT_VERSIONS = {
  termsOfSale: "2026-10-13-v1",
  refundPolicy: "2026-10-13-v1",
  printableLicense: "2026-10-13-v1",
  electronicReceipt: "2026-10-13-v1",
} as const;

export const checkoutConsentCopy: Record<Lang, {
  legalBefore: string;
  legalBetweenSaleRefund: string;
  legalBetweenRefundLicense: string;
  legalAfter: string;
  sale: string;
  refund: string;
  license: string;
  electronicReceipt: string;
}> = {
  ru: {
    legalBefore: "Я ознакомился(-ась) и согласен(-на) с ",
    legalBetweenSaleRefund: ", ",
    legalBetweenRefundLicense: " и ",
    legalAfter: ".",
    sale: "Условиями продажи",
    refund: "Политикой возвратов",
    license: "Лицензией использования цифровых материалов",
    electronicReceipt: "Я согласен(-на) получить оригинал квитанции (קבלה) в электронном виде на указанный мной адрес электронной почты.",
  },
  en: {
    legalBefore: "I have read and agree to the ",
    legalBetweenSaleRefund: ", ",
    legalBetweenRefundLicense: ", and ",
    legalAfter: ".",
    sale: "Terms of Sale",
    refund: "Refund Policy",
    license: "Printable Product License",
    electronicReceipt: "I agree to receive the original receipt (קבלה) electronically at the email address I provide.",
  },
  he: {
    legalBefore: "קראתי ואני מסכים/ה ל",
    legalBetweenSaleRefund: ", ל",
    legalBetweenRefundLicense: " ול",
    legalAfter: ".",
    sale: "תנאי המכירה",
    refund: "מדיניות ההחזרים",
    license: "רישיון השימוש בחומרים להדפסה",
    electronicReceipt: "אני מסכים/ה לקבל את הקבלה המקורית באופן אלקטרוני לכתובת הדוא״ל שמסרתי.",
  },
};
