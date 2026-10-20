import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import type { PayPalCaptureResponse } from "@/lib/shop/paypalCheckout";

export function paidCheckoutSuccessHref(result: PayPalCaptureResponse, lang: Lang): string | null {
  if (!result.ok || result.status !== "paid") return null;
  const path = buildLocalizedPublicPath("/shop/sound-case-001/success", lang);
  return `${path}?orderId=${encodeURIComponent(result.localOrderId)}`;
}

export type RedirectPaymentSession = {
  hasReturned: () => boolean;
  resume: () => Promise<void>;
};

export async function resumeReturnedPayPalSession(
  session: RedirectPaymentSession,
  onReturn: () => void,
): Promise<boolean> {
  if (!session.hasReturned()) return false;
  onReturn();
  await session.resume();
  return true;
}

export async function handlePayPalApprovalOnce(input: {
  paypalOrderId: unknown;
  expectedPaypalOrderId: string | null;
  handled: { current: boolean };
  capture: () => Promise<void>;
  onMismatch: () => void;
}) {
  if (input.handled.current) return;
  input.handled.current = true;
  if (!input.expectedPaypalOrderId || input.paypalOrderId !== input.expectedPaypalOrderId) {
    input.onMismatch();
    return;
  }
  await input.capture();
}
