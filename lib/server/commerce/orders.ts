import { randomUUID } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { SOUND_CASE_PREORDER_OFFER } from "@/lib/server/commerce/preorderOffers";
import {
  resolveProductPrice,
  type VerifiedCustomer,
} from "@/lib/server/commerce/resolveProductPrice";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type CommerceOrderStatus =
  | "creating"
  | "pending_approval"
  | "capture_pending"
  | "paid"
  | "cancelled"
  | "failed";

export type LocalCommerceOrder = {
  orderId: string;
  orderItemId: string;
  created: boolean;
  status: CommerceOrderStatus;
  totalMinor: number;
  currency: string;
  priceSource: "catalog" | "preorder";
  offerCode: string | null;
  paypalCreateRequestId: string;
  paypalCaptureRequestId: string;
};

export type CreateLocalCommerceOrderResult =
  | { status: "already_owned"; productId: string }
  | { status: "needs_reconciliation"; productId: string }
  | { status: "order"; order: LocalCommerceOrder };

type CreateCommerceOrderRpcRow = {
  checkout_result: "created" | "resumed" | "needs_reconciliation" | "invalid_state";
  order_id: string;
  order_item_id: string;
  created: boolean;
  order_status: CommerceOrderStatus;
  total_minor: number;
  currency: string;
  price_source: "catalog" | "preorder";
  offer_code: string | null;
  paypal_create_request_id: string;
  paypal_capture_request_id: string;
};

function firstRpcRow<T>(data: unknown): T | null {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === "object" ? row as T : null;
}

export async function createLocalCommerceOrder(input: {
  verifiedCustomer: VerifiedCustomer;
  productId: string;
  checkoutIdempotencyKey: string;
}): Promise<CreateLocalCommerceOrderResult> {
  if (!UUID_PATTERN.test(input.checkoutIdempotencyKey)) {
    throw new Error("A valid checkout idempotency key is required");
  }

  const resolvedPrice = await resolveProductPrice({
    verifiedCustomer: input.verifiedCustomer,
    productId: input.productId,
  });

  if (resolvedPrice.status === "already_owned") {
    return resolvedPrice;
  }

  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase.rpc("resolve_paypal_commerce_checkout", {
    target_user_id: input.verifiedCustomer.id,
    target_product_id: resolvedPrice.productId,
    target_total_minor: resolvedPrice.priceMinor,
    target_currency: resolvedPrice.currency,
    target_price_source: resolvedPrice.source,
    target_offer_code: resolvedPrice.source === "preorder"
      ? SOUND_CASE_PREORDER_OFFER.offerCode
      : null,
    target_checkout_idempotency_key: input.checkoutIdempotencyKey,
    target_paypal_create_request_id: randomUUID(),
    target_paypal_capture_request_id: randomUUID(),
  });

  if (error) throw error;
  const row = firstRpcRow<CreateCommerceOrderRpcRow>(data);
  if (!row) throw new Error("Local order creation returned no result");
  if (row.checkout_result === "needs_reconciliation") {
    return { status: "needs_reconciliation", productId: resolvedPrice.productId };
  }
  if (row.checkout_result === "invalid_state") {
    throw new Error("Existing checkout is not resumable");
  }

  return {
    status: "order",
    order: {
      orderId: row.order_id,
      orderItemId: row.order_item_id,
      created: row.created,
      status: row.order_status,
      totalMinor: row.total_minor,
      currency: row.currency,
      priceSource: row.price_source,
      offerCode: row.offer_code,
      paypalCreateRequestId: row.paypal_create_request_id,
      paypalCaptureRequestId: row.paypal_capture_request_id,
    },
  };
}
