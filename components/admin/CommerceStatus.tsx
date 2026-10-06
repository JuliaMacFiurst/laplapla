import type { AdminCommerceReviewState } from "@/lib/admin/commerce";

export function CommerceStatus({ value }: { value: string }) {
  const tone = value === "paid" || value === "active" || value === "ok" || value === "processed"
    ? "good"
    : value === "failed" || value === "needs_review" || value === "revoked" || value === "refunded"
      ? "bad"
      : "neutral";
  return <span className={`admin-commerce__status is-${tone}`}>{value.replaceAll("_", " ")}</span>;
}

export function ReviewStatus({ value }: { value: AdminCommerceReviewState }) {
  return <CommerceStatus value={value} />;
}
