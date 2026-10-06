export type AdminCommerceReviewState = "ok" | "pending" | "needs_review";
export type AdminCommerceEnvironment = "unknown";

export type AdminCommerceCustomer = {
  id: string;
  email: string | null;
  name: null;
  nameState: "not_collected";
};

export type AdminCommerceOrderSummary = {
  id: string;
  createdAt: string;
  paidAt: string | null;
  status: "creating" | "pending_approval" | "capture_pending" | "paid" | "cancelled" | "failed";
  provider: "paypal";
  providerOrderId: string | null;
  providerCaptureId: string | null;
  totalMinor: number;
  currency: string;
  failureCode: string | null;
  environment: AdminCommerceEnvironment;
  customer: AdminCommerceCustomer;
  item: {
    productId: string;
    productName: string;
    productNameSource: "current_catalog" | "product_id_fallback";
    quantity: number;
    unitPriceMinor: number;
    priceSource: "catalog" | "preorder";
    offerCode: string | null;
  };
  entitlement: {
    id: string;
    status: "active" | "inactive" | "revoked" | "refunded" | "expired";
    source: string;
    grantedAt: string;
  } | null;
  reviewState: AdminCommerceReviewState;
  reviewReasons: string[];
};

export type AdminCommerceListResponse = {
  orders: AdminCommerceOrderSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  boundedScanLimit: number;
  resultsMayBeTruncated: boolean;
  authDirectoryMayBeTruncated: boolean;
  environmentProvenance: "unavailable";
  counters: {
    paid: number;
    pending: number;
    needsReview: number;
    paymentProblems: number;
  };
};

export type AdminCommerceOrderDetail = AdminCommerceOrderSummary & {
  updatedAt: string;
  item: AdminCommerceOrderSummary["item"] & {
    id: string;
    lineTotalMinor: number;
  };
  events: Array<{
    id: string;
    eventType: string;
    status: "processing" | "processed" | "failed" | "ignored";
    providerOrderId: string | null;
    providerCaptureId: string | null;
    failureCode: string | null;
    receivedAt: string;
    processedAt: string | null;
  }>;
  personalization: {
    exists: boolean;
    locale: "ru" | "en" | "he" | null;
    updatedAt: string | null;
  };
};

export type AdminCommerceListFilters = {
  page: number;
  pageSize: number;
  status: string | null;
  access: string | null;
  priceSource: string | null;
  reviewState: string | null;
  search: string | null;
};
