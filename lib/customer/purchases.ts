import type { EntitlementSource, EntitlementStatus } from "@/lib/customer/types";

export type CustomerPaymentStatus = "paid" | "processing" | "cancelled" | "failed";
export type CustomerReceiptStatus = "available" | "preparing" | "not_available";

export type CustomerPurchase = {
  orderId: string;
  productId: string;
  productTitle: string;
  amountMinor: number;
  currency: string;
  purchasedAt: string;
  paymentStatus: CustomerPaymentStatus;
  accessStatus: EntitlementStatus | "unavailable";
  receipt: {
    status: CustomerReceiptStatus;
    displayNumber: string | null;
  };
};

export type CustomerAccessGrant = {
  entitlementId: string;
  productId: string;
  source: EntitlementSource;
  status: EntitlementStatus;
  grantedAt: string;
};

export type CustomerAccountResponse = {
  profile: import("@/lib/customer/types").CustomerProfile | null;
  entitlements: import("@/lib/customer/types").ProductEntitlement[];
  purchases: CustomerPurchase[];
  accessGrants: CustomerAccessGrant[];
};
