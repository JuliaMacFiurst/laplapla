export const ENTITLEMENT_SOURCES = [
  "laplapla_web",
  "etsy",
  "google_play",
  "gift",
  "promo",
] as const;

export type EntitlementSource = (typeof ENTITLEMENT_SOURCES)[number];

export const ENTITLEMENT_STATUSES = [
  "active",
  "inactive",
  "revoked",
  "refunded",
  "expired",
] as const;

export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

export type CustomerProfile = {
  user_id: string;
  created_at: string;
  updated_at: string;
};
export type ProductEntitlement = {
  id: string;
  user_id: string;
  product_id: string;
  source: EntitlementSource;
  status: EntitlementStatus;
  granted_at: string;
  created_at: string;
  updated_at: string;
};
