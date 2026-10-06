import { getLocalizedTitle, getProductById } from "@/lib/shop/catalog";
import type {
  AdminCommerceListFilters,
  AdminCommerceListResponse,
  AdminCommerceOrderDetail,
  AdminCommerceOrderSummary,
  AdminCommerceReviewState,
} from "@/lib/admin/commerce";
import { createServerSupabaseClient } from "@/lib/server/supabase";

export const ADMIN_COMMERCE_MAX_SCAN = 250;
export const ADMIN_COMMERCE_MAX_PAGE_SIZE = 50;
const AUTH_DIRECTORY_PAGE_SIZE = 200;
const AUTH_DIRECTORY_MAX_PAGES = 5;
const STALE_CAPTURE_MS = 30 * 60 * 1000;

type EntitlementRow = {
  id: string;
  status: "active" | "inactive" | "revoked" | "refunded" | "expired";
  source: string;
  granted_at: string;
};

type ItemRow = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price_minor: number;
  currency: string;
  price_source: "catalog" | "preorder";
  offer_code: string | null;
  entitlement_id: string | null;
  product_entitlements: EntitlementRow | EntitlementRow[] | null;
};

type OrderRow = {
  id: string;
  user_id: string;
  provider: "paypal";
  status: AdminCommerceOrderSummary["status"];
  currency: string;
  total_minor: number;
  provider_order_id: string | null;
  provider_capture_id: string | null;
  paid_at: string | null;
  failure_code: string | null;
  created_at: string;
  updated_at: string;
  order_items: ItemRow | ItemRow[] | null;
};

type ProviderEventRow = {
  id: string;
  event_type: string;
  status: "processing" | "processed" | "failed" | "ignored";
  provider_order_id: string | null;
  provider_capture_id: string | null;
  failure_code: string | null;
  received_at: string;
  processed_at: string | null;
};

type PersonalizationRow = { payload: unknown; updated_at: string };

const ORDER_SELECT = [
  "id,user_id,provider,status,currency,total_minor,provider_order_id,provider_capture_id",
  "paid_at,failure_code,created_at,updated_at",
  "order_items(id,product_id,quantity,unit_price_minor,currency,price_source,offer_code,entitlement_id,product_entitlements(id,status,source,granted_at))",
].join(",");

function firstItem(row: OrderRow) {
  return Array.isArray(row.order_items) ? row.order_items[0] ?? null : row.order_items;
}

function firstEntitlement(item: ItemRow | null) {
  if (!item) return null;
  return Array.isArray(item.product_entitlements)
    ? item.product_entitlements[0] ?? null
    : item.product_entitlements;
}

export function deriveAdminCommerceReviewState(input: {
  status: AdminCommerceOrderSummary["status"];
  failureCode: string | null;
  createdAt: string;
  entitlement: EntitlementRow | null;
  now?: number;
}) {
  const reasons: string[] = [];
  if (input.status === "failed" || input.failureCode) reasons.push("payment_failure");
  if (input.status === "paid" && !input.entitlement) reasons.push("paid_without_entitlement");
  if (input.status === "paid" && input.entitlement && input.entitlement.status !== "active") {
    reasons.push(`access_${input.entitlement.status}`);
  }
  if (
    input.status === "capture_pending" &&
    (input.now ?? Date.now()) - new Date(input.createdAt).getTime() > STALE_CAPTURE_MS
  ) {
    reasons.push("stale_capture_pending");
  }

  const pendingStatuses = new Set(["creating", "pending_approval", "capture_pending"]);
  const reviewState: AdminCommerceReviewState = reasons.length > 0
    ? "needs_review"
    : pendingStatuses.has(input.status)
      ? "pending"
      : "ok";
  return { reviewState, reviewReasons: reasons };
}

async function loadAuthDirectory() {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const emails = new Map<string, string>();
  let mayBeTruncated = false;

  for (let page = 1; page <= AUTH_DIRECTORY_MAX_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_DIRECTORY_PAGE_SIZE,
    });
    if (error) throw error;
    for (const user of data.users) {
      if (user.email) emails.set(user.id, user.email);
    }
    if (data.users.length < AUTH_DIRECTORY_PAGE_SIZE) return { emails, mayBeTruncated };
  }

  mayBeTruncated = true;
  return { emails, mayBeTruncated };
}

export function mapAdminCommerceOrder(row: OrderRow, email: string | null): AdminCommerceOrderSummary | null {
  const item = firstItem(row);
  if (!item) return null;
  const entitlement = firstEntitlement(item);
  const product = getProductById(item.product_id);
  const review = deriveAdminCommerceReviewState({
    status: row.status,
    failureCode: row.failure_code,
    createdAt: row.created_at,
    entitlement,
  });

  return {
    id: row.id,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    status: row.status,
    provider: row.provider,
    providerOrderId: row.provider_order_id,
    providerCaptureId: row.provider_capture_id,
    totalMinor: row.total_minor,
    currency: row.currency,
    failureCode: row.failure_code,
    environment: "unknown",
    customer: { id: row.user_id, email, name: null, nameState: "not_collected" },
    item: {
      productId: item.product_id,
      productName: product ? getLocalizedTitle(product, "en") : item.product_id,
      productNameSource: product ? "current_catalog" : "product_id_fallback",
      quantity: item.quantity,
      unitPriceMinor: item.unit_price_minor,
      priceSource: item.price_source,
      offerCode: item.offer_code,
    },
    entitlement: entitlement ? {
      id: entitlement.id,
      status: entitlement.status,
      source: entitlement.source,
      grantedAt: entitlement.granted_at,
    } : null,
    ...review,
  };
}

export function matchesAdminCommerceFilters(order: AdminCommerceOrderSummary, filters: AdminCommerceListFilters) {
  if (filters.status && order.status !== filters.status) return false;
  if (filters.access === "none" && order.entitlement) return false;
  if (filters.access && filters.access !== "none" && order.entitlement?.status !== filters.access) return false;
  if (filters.priceSource && order.item.priceSource !== filters.priceSource) return false;
  if (filters.reviewState && order.reviewState !== filters.reviewState) return false;
  if (filters.search) {
    const needle = filters.search.toLocaleLowerCase();
    const haystack = [
      order.customer.email,
      order.id,
      order.providerOrderId,
      order.providerCaptureId,
    ].filter(Boolean).join(" ").toLocaleLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

export function paginateAdminCommerceOrders(
  orders: AdminCommerceOrderSummary[],
  page: number,
  pageSize: number,
) {
  const start = (page - 1) * pageSize;
  return orders.slice(start, start + pageSize);
}

export function normalizeAdminCommerceListFilters(query: Record<string, string | string[] | undefined>): AdminCommerceListFilters {
  const one = (value: string | string[] | undefined) => typeof value === "string" ? value.trim() : "";
  const page = Math.max(1, Number.parseInt(one(query.page), 10) || 1);
  const requestedPageSize = Number.parseInt(one(query.pageSize), 10) || 25;
  return {
    page,
    pageSize: Math.min(ADMIN_COMMERCE_MAX_PAGE_SIZE, Math.max(1, requestedPageSize)),
    status: one(query.status) || null,
    access: one(query.access) || null,
    priceSource: one(query.priceSource) || null,
    reviewState: one(query.reviewState) || null,
    search: one(query.search).slice(0, 180) || null,
  };
}

export async function listAdminCommerceOrders(filters: AdminCommerceListFilters): Promise<AdminCommerceListResponse> {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const [{ data, error }, directory] = await Promise.all([
    supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(ADMIN_COMMERCE_MAX_SCAN + 1),
    loadAuthDirectory(),
  ]);
  if (error) throw error;

  const rawRows = (data ?? []) as unknown as OrderRow[];
  const resultsMayBeTruncated = rawRows.length > ADMIN_COMMERCE_MAX_SCAN;
  const mapped = rawRows.slice(0, ADMIN_COMMERCE_MAX_SCAN)
    .map((row) => mapAdminCommerceOrder(row, directory.emails.get(row.user_id) ?? null))
    .filter((order): order is AdminCommerceOrderSummary => Boolean(order))
    .filter((order) => matchesAdminCommerceFilters(order, filters));
  const orders = paginateAdminCommerceOrders(mapped, filters.page, filters.pageSize);

  return {
    orders,
    page: filters.page,
    pageSize: filters.pageSize,
    total: mapped.length,
    totalPages: Math.max(1, Math.ceil(mapped.length / filters.pageSize)),
    boundedScanLimit: ADMIN_COMMERCE_MAX_SCAN,
    resultsMayBeTruncated,
    authDirectoryMayBeTruncated: directory.mayBeTruncated,
    environmentProvenance: "unavailable",
    counters: {
      paid: mapped.filter((order) => order.status === "paid").length,
      pending: mapped.filter((order) => order.reviewState === "pending").length,
      needsReview: mapped.filter((order) => order.reviewState === "needs_review").length,
      paymentProblems: mapped.filter((order) => order.status === "failed" || Boolean(order.failureCode)).length,
    },
  };
}

export function personalizationLocale(payload: unknown): "ru" | "en" | "he" | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const locale = (payload as { locale?: unknown }).locale;
  return locale === "ru" || locale === "en" || locale === "he" ? locale : null;
}

export function sanitizeProviderEvents(rows: ProviderEventRow[]) {
  return rows.map((event) => ({
    id: event.id,
    eventType: event.event_type,
    status: event.status,
    providerOrderId: event.provider_order_id,
    providerCaptureId: event.provider_capture_id,
    failureCode: event.failure_code,
    receivedAt: event.received_at,
    processedAt: event.processed_at,
  }));
}

export async function getAdminCommerceOrderDetail(orderId: string): Promise<AdminCommerceOrderDetail | null> {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT).eq("id", orderId).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as OrderRow;
  const item = firstItem(row);
  if (!item) return null;

  const [{ data: authData, error: authError }, eventsResult, personalizationResult] = await Promise.all([
    supabase.auth.admin.getUserById(row.user_id),
    supabase.from("payment_provider_events")
      .select("id,event_type,status,provider_order_id,provider_capture_id,failure_code,received_at,processed_at")
      .eq("provider", row.provider)
      .or(`provider_order_id.eq.${row.provider_order_id ?? "__none__"},provider_capture_id.eq.${row.provider_capture_id ?? "__none__"}`)
      .order("received_at", { ascending: true })
      .limit(100),
    item.entitlement_id
      ? supabase.from("quest_personalizations").select("payload,updated_at").eq("entitlement_id", item.entitlement_id).limit(1).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (authError) throw authError;
  if (eventsResult.error) throw eventsResult.error;
  if (personalizationResult.error) throw personalizationResult.error;

  const summary = mapAdminCommerceOrder(row, authData.user?.email ?? null);
  if (!summary) return null;
  const personalization = personalizationResult.data as PersonalizationRow | null;
  return {
    ...summary,
    updatedAt: row.updated_at,
    item: {
      ...summary.item,
      id: item.id,
      lineTotalMinor: item.unit_price_minor * item.quantity,
    },
    events: sanitizeProviderEvents((eventsResult.data ?? []) as ProviderEventRow[]),
    personalization: {
      exists: Boolean(personalization),
      locale: personalizationLocale(personalization?.payload),
      updatedAt: personalization?.updated_at ?? null,
    },
  };
}
