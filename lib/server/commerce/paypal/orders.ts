import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { CommerceOrderStatus } from "@/lib/server/commerce/orders";

export type PayPalCheckoutOrder = {
  orderId: string;
  userId: string;
  status: CommerceOrderStatus;
  providerOrderId: string | null;
  providerCaptureId: string | null;
  totalMinor: number;
  currency: string;
  paypalCreateRequestId: string;
  paypalCaptureRequestId: string;
  productId: string;
  entitlementId: string | null;
};

type OrderItemRow = {
  product_id: string;
  entitlement_id: string | null;
};

type OrderRow = {
  id: string;
  user_id: string;
  status: CommerceOrderStatus;
  provider: string;
  provider_order_id: string | null;
  provider_capture_id: string | null;
  total_minor: number;
  currency: string;
  paypal_create_request_id: string;
  paypal_capture_request_id: string;
  order_items: OrderItemRow[] | OrderItemRow | null;
};

function firstRpcRow<T>(data: unknown): T | null {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === "object" ? row as T : null;
}

export async function getPayPalCheckoutOrderForCustomer(orderId: string, userId: string) {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("orders")
    .select("id,user_id,status,provider,provider_order_id,provider_capture_id,total_minor,currency,paypal_create_request_id,paypal_capture_request_id,order_items(product_id,entitlement_id)")
    .eq("id", orderId)
    .eq("user_id", userId)
    .eq("provider", "paypal")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as OrderRow;
  const item = Array.isArray(row.order_items) ? row.order_items[0] : row.order_items;
  if (!item) throw new Error("Local order item is missing");

  return {
    orderId: row.id,
    userId: row.user_id,
    status: row.status,
    providerOrderId: row.provider_order_id,
    providerCaptureId: row.provider_capture_id,
    totalMinor: row.total_minor,
    currency: row.currency,
    paypalCreateRequestId: row.paypal_create_request_id,
    paypalCaptureRequestId: row.paypal_capture_request_id,
    productId: item.product_id,
    entitlementId: item.entitlement_id,
  } satisfies PayPalCheckoutOrder;
}

export type PayPalOrderBindingResult =
  | "bound"
  | "already_bound"
  | "unknown_order"
  | "invalid_provider_order_id"
  | "provider_mismatch"
  | "provider_order_conflict"
  | "invalid_state";

export async function bindPayPalOrderToLocalOrder(input: {
  orderId: string;
  paypalOrderId: string;
}) {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase.rpc("bind_paypal_order_to_commerce_order", {
    target_order_id: input.orderId,
    target_provider_order_id: input.paypalOrderId,
  });
  if (error) throw error;
  const row = firstRpcRow<{
    result: PayPalOrderBindingResult;
    bound_order_id: string;
    order_status: CommerceOrderStatus | null;
    provider_order_id: string | null;
  }>(data);
  if (!row) throw new Error("PayPal order binding returned no result");
  return {
    result: row.result,
    orderId: row.bound_order_id,
    status: row.order_status,
    paypalOrderId: row.provider_order_id,
  };
}

export type PayPalCaptureStartResult =
  | "capture_ready"
  | "already_paid"
  | "unknown_order"
  | "provider_mismatch"
  | "provider_order_mismatch"
  | "invalid_state";

export async function beginPayPalOrderCapture(input: {
  orderId: string;
  userId: string;
  paypalOrderId: string;
}) {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase.rpc("begin_paypal_commerce_order_capture", {
    target_order_id: input.orderId,
    target_user_id: input.userId,
    target_provider_order_id: input.paypalOrderId,
  });
  if (error) throw error;
  const row = firstRpcRow<{
    result: PayPalCaptureStartResult;
    capture_order_id: string;
    order_status: CommerceOrderStatus | null;
  }>(data);
  if (!row) throw new Error("PayPal capture start returned no result");
  return { result: row.result, orderId: row.capture_order_id, status: row.order_status };
}
