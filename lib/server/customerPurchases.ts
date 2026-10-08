import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { CustomerAccessGrant, CustomerPaymentStatus, CustomerPurchase, CustomerReceiptStatus } from "@/lib/customer/purchases";
import type { ProductEntitlement } from "@/lib/customer/types";

type EntitlementRow = Pick<ProductEntitlement, "id" | "product_id" | "source" | "status" | "granted_at">;
type ItemRow = { product_id: string; product_title_snapshot: string | null; entitlement_id: string | null; product_entitlements: { status: ProductEntitlement["status"] } | Array<{ status: ProductEntitlement["status"] }> | null };
type OrderRow = { id: string; status: "creating" | "pending_approval" | "capture_pending" | "paid" | "cancelled" | "failed"; total_minor: number; currency: string; paid_at: string | null; created_at: string; provider_environment: "sandbox" | "live" | null; order_items: ItemRow | ItemRow[] | null };
type ReceiptRow = { id: string; order_id: string; receipt_number: number; receipt_series: { series_code: string } | Array<{ series_code: string }> | null };
type ArtifactRow = { receipt_id: string; status: "pending" | "processing" | "ready" | "failed" };

const first = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] ?? null : value;

function paymentStatus(status: OrderRow["status"]): CustomerPaymentStatus {
  if (status === "paid") return "paid";
  if (status === "cancelled") return "cancelled";
  if (status === "failed") return "failed";
  return "processing";
}

function receiptStatus(input: { order: OrderRow; receipt: ReceiptRow | null; artifact: ArtifactRow | null }): CustomerReceiptStatus {
  if (input.receipt && input.artifact?.status === "ready") return "available";
  if (input.receipt || (input.order.status === "paid" && input.order.provider_environment === "live")) return "preparing";
  return "not_available";
}

export async function getCustomerPurchases(userId: string, entitlements: readonly EntitlementRow[]) {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("id,status,total_minor,currency,paid_at,created_at,provider_environment,order_items(product_id,product_title_snapshot,entitlement_id,product_entitlements(status))")
    .eq("user_id", userId)
    .neq("status", "creating")
    .order("created_at", { ascending: false });
  if (orderError) throw orderError;

  const orders = (orderData ?? []) as unknown as OrderRow[];
  const orderIds = orders.map((order) => order.id);
  const receiptResult = orderIds.length
    ? await supabase.from("receipts").select("id,order_id,receipt_number,receipt_series(series_code)").in("order_id", orderIds).eq("document_type", "receipt")
    : { data: [], error: null };
  if (receiptResult.error) throw receiptResult.error;
  const receipts = (receiptResult.data ?? []) as unknown as ReceiptRow[];
  const receiptIds = receipts.map((receipt) => receipt.id);
  const artifactResult = receiptIds.length
    ? await supabase.from("receipt_artifacts").select("receipt_id,status").in("receipt_id", receiptIds).eq("artifact_type", "receipt_pdf").eq("document_copy", "original")
    : { data: [], error: null };
  if (artifactResult.error) throw artifactResult.error;
  const artifacts = (artifactResult.data ?? []) as ArtifactRow[];

  const linkedEntitlements = new Set<string>();
  const purchases: CustomerPurchase[] = orders.flatMap((order) => {
    const item = first(order.order_items);
    if (!item) return [];
    if (item.entitlement_id) linkedEntitlements.add(item.entitlement_id);
    const entitlement = first(item.product_entitlements);
    const receipt = receipts.find((candidate) => candidate.order_id === order.id) ?? null;
    const artifact = receipt ? artifacts.find((candidate) => candidate.receipt_id === receipt.id) ?? null : null;
    const series = receipt ? first(receipt.receipt_series) : null;
    return [{
      orderId: order.id,
      productId: item.product_id,
      productTitle: item.product_title_snapshot ?? item.product_id,
      amountMinor: order.total_minor,
      currency: order.currency,
      purchasedAt: order.paid_at ?? order.created_at,
      paymentStatus: paymentStatus(order.status),
      accessStatus: entitlement?.status ?? "unavailable",
      receipt: {
        status: receiptStatus({ order, receipt, artifact }),
        displayNumber: receipt && series ? `${series.series_code}-${String(receipt.receipt_number).padStart(6, "0")}` : null,
      },
    }];
  });

  const accessGrants: CustomerAccessGrant[] = entitlements
    .filter((entitlement) => !linkedEntitlements.has(entitlement.id))
    .map((entitlement) => ({ entitlementId: entitlement.id, productId: entitlement.product_id, source: entitlement.source, status: entitlement.status, grantedAt: entitlement.granted_at }));

  return { purchases, accessGrants };
}

export async function downloadOwnReceiptOriginal(userId: string, orderId: string) {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data: order, error: orderError } = await supabase.from("orders").select("id").eq("id", orderId).eq("user_id", userId).limit(1).maybeSingle();
  if (orderError) throw orderError;
  if (!order) return { status: "not_found" as const };
  const { data: receiptData, error: receiptError } = await supabase.from("receipts").select("id,receipt_number,receipt_series(series_code)").eq("order_id", orderId).eq("document_type", "receipt").limit(1).maybeSingle();
  if (receiptError) throw receiptError;
  if (!receiptData) return { status: "not_found" as const };
  const receipt = receiptData as unknown as Pick<ReceiptRow, "id" | "receipt_number" | "receipt_series">;
  const { data: artifact, error: artifactError } = await supabase.from("receipt_artifacts").select("status,storage_bucket,storage_key,content_type").eq("receipt_id", receipt.id).eq("artifact_type", "receipt_pdf").eq("document_copy", "original").limit(1).maybeSingle();
  if (artifactError) throw artifactError;
  if (!artifact) return { status: "not_found" as const };
  if (artifact.status !== "ready" || artifact.content_type !== "application/pdf") return { status: "not_ready" as const };
  const { data: object, error: storageError } = await supabase.storage.from(artifact.storage_bucket).download(artifact.storage_key);
  if (storageError || !object) return { status: "not_ready" as const };
  const series = first(receipt.receipt_series);
  if (!series) return { status: "not_found" as const };
  return { status: "ready" as const, bytes: Buffer.from(await object.arrayBuffer()), fileName: `receipt-${series.series_code}-${String(receipt.receipt_number).padStart(6, "0")}.pdf` };
}
