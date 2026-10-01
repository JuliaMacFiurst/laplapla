export const PAYPAL_CHECKOUT_PRODUCT_ID = "sound-case-001";

export type PayPalPublicConfigResponse =
  | { ok: true; clientId: string; environment: "sandbox" | "live" }
  | { ok: false; code: "unavailable" };

export type PayPalQuoteResponse =
  | { ok: true; status: "priced"; productId: string; amountMinor: number; currency: string; priceSource: "catalog" | "preorder" }
  | { ok: true; status: "already_owned"; productId: string }
  | { ok: false; code: "authentication_required" | "invalid_request" | "unavailable" };

export type PayPalCreateResponse =
  | { ok: true; status: "pending_approval"; localOrderId: string; paypalOrderId: string; amountMinor: number; currency: string }
  | { ok: true; status: "reconcile_required"; localOrderId: string; paypalOrderId: string; amountMinor: number; currency: string }
  | { ok: true; status: "needs_reconciliation"; productId: string }
  | { ok: true; status: "already_owned"; productId: string }
  | { ok: false; code: "authentication_required" | "invalid_request" | "order_unavailable" | "paypal_unavailable" };

export type PayPalResumeResponse =
  | { ok: true; status: "none" }
  | { ok: true; status: "already_owned"; productId: string }
  | { ok: true; status: "needs_reconciliation"; productId: string }
  | {
      ok: true;
      status: "resumable";
      localOrderId: string;
      paypalOrderId: string | null;
      lifecycle: "creating" | "pending_approval" | "capture_pending";
      amountMinor: number;
      currency: string;
      priceSource: "catalog" | "preorder";
    }
  | { ok: false; code: "authentication_required" | "invalid_request" | "unavailable" };

export type PayPalCaptureResponse =
  | { ok: true; status: "paid"; localOrderId: string; entitlementId: string | null }
  | { ok: false; code: "authentication_required" | "invalid_request" | "order_not_found" | "order_mismatch" | "payment_not_completed" | "payment_verification_failed" | "paypal_unavailable" };
