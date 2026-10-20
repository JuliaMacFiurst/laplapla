import type { Lang } from "@/i18n";

export const SUPPORT_CATEGORIES = ["payment", "refund", "technical", "question", "other"] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];
export type SupportSubmission = {
  submissionId: string;
  locale: Lang;
  category: SupportCategory;
  email?: string;
  orderReference?: string;
  message: string;
  website?: string;
};

export function isSupportCategory(value: unknown): value is SupportCategory {
  return typeof value === "string" && SUPPORT_CATEGORIES.includes(value as SupportCategory);
}

export function supportSubject(category: SupportCategory, orderReference: string | null) {
  switch (category) {
    case "refund": return `🚨🚨🚨 LAPLAPLA | REFUND REQUEST${orderReference ? ` | ORDER ${orderReference}` : ""}`;
    case "payment": return "🚨🚨 LAPLAPLA | PAYMENT / ACCESS PROBLEM";
    case "technical": return "🚨 LAPLAPLA | TECHNICAL FAILURE";
    case "question": return "📩 LAPLAPLA | CUSTOMER QUESTION";
    case "other": return "📩 LAPLAPLA | CUSTOMER MESSAGE";
  }
}
