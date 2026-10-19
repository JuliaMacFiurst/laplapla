export type CommerceAnalyticsEnvironment = "live" | "sandbox";

export type CommerceRevenueMetric = {
  currency: string;
  gross_minor: number;
  refunded_minor: number;
  net_minor: number;
};

export type CommerceSourceMetric = {
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  currency: string;
  paid_orders: number;
  gross_minor: number;
};

export type CommerceAnalyticsReportV1 = {
  version: 1;
  period: {
    from: string;
    to: string;
    timezone: "UTC";
    interval: "[from,to)";
  };
  environment: CommerceAnalyticsEnvironment;
  traffic_scope: "all_production";
  audience: {
    visitors: number;
    sessions: number;
    shop_visitors: number;
    product_viewers: number;
    product_views: number;
    interested_visitors: number;
    interest_events: number;
  };
  commerce: {
    checkout_starts: number;
    paid_orders: number;
    refunded_orders: number;
    status_counts: Record<string, number>;
    revenue: CommerceRevenueMetric[];
  };
  attribution: {
    order_cohort_timestamp: "orders.created_at";
    paid_source_timestamp: "orders.paid_at";
    checkout_orders: number;
    attributed_orders: number;
    unattributed_orders: number;
    coverage_percent: number | null;
    causality_note: string;
  };
  sources: {
    first_touch: CommerceSourceMetric[];
    session_touch: CommerceSourceMetric[];
  };
  products: Array<{
    product_id: string;
    product_views: number;
    product_viewers: number;
    interest_events: number;
    interested_visitors: number;
    checkout_starts: number;
    paid: Array<{ currency: string; paid_orders: number; gross_minor: number }>;
  }>;
  funnel: {
    mode: "independent_counts";
    conversion_percentages_available: false;
    note: string;
    entry_points: {
      product_hero: number;
      product_final: number;
      home_promo: number;
    };
  };
  data_quality: {
    status: "data ok" | "data incomplete";
    raw_traffic_retention_days: 15;
    traffic_may_be_truncated: boolean;
    traffic_environment_segmented: false;
    events_without_visitor_id: number;
    events_without_session_id: number;
    visitor_identity_conflict_events: number;
    legacy_visitor_fallback_events: number;
    paid_orders_without_items: number;
    paid_orders_with_item_total_mismatch: number;
    paid_orders_with_item_currency_mismatch: number;
    unknown_environment_orders: number;
    unknown_environment_paid_orders: number;
    unknown_environment_paid_minor: Array<{ currency: string; paid_minor: number }>;
    refund_order_environment_mismatch_count: number;
    legacy_null_attribution_orders: number;
    invalid_attribution_orders: number;
    attribution_is_causal: false;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Runtime boundary for future server-side consumers. The report RPC is not
 * exposed to browsers; callers must use a server-side service-role client.
 */
export function parseCommerceAnalyticsReportV1(value: unknown): CommerceAnalyticsReportV1 {
  if (!isRecord(value) || value.version !== 1) throw new Error("Unsupported commerce analytics report");
  if (value.environment !== "live" && value.environment !== "sandbox") throw new Error("Invalid commerce analytics environment");
  if (value.traffic_scope !== "all_production") throw new Error("Invalid commerce analytics traffic scope");
  if (!isRecord(value.period) || value.period.timezone !== "UTC" || value.period.interval !== "[from,to)") {
    throw new Error("Invalid commerce analytics period");
  }
  if (!isRecord(value.audience) || !isRecord(value.commerce) || !isRecord(value.attribution)) {
    throw new Error("Incomplete commerce analytics report");
  }
  if (!isRecord(value.sources) || !Array.isArray(value.products) || !isRecord(value.funnel) || !isRecord(value.data_quality)) {
    throw new Error("Incomplete commerce analytics report");
  }
  if (value.funnel.mode !== "independent_counts" || value.funnel.conversion_percentages_available !== false) {
    throw new Error("Unsafe commerce funnel semantics");
  }
  return value as CommerceAnalyticsReportV1;
}
