import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import AdminCommerceShell from "@/components/admin/AdminCommerceShell";
import { CommerceStatus, ReviewStatus } from "@/components/admin/CommerceStatus";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import type { AdminCommerceOrderDetail } from "@/lib/admin/commerce";
import { formatPrice } from "@/lib/shop/commerce";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="admin-commerce__field"><dt>{label}</dt><dd>{children}</dd></div>;
}

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-IL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

export default function AdminCommerceOrderPage() {
  const router = useRouter();
  const auth = useCustomerSession();
  const [order, setOrder] = useState<AdminCommerceOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const orderId = typeof router.query.orderId === "string" ? router.query.orderId : null;

  useEffect(() => {
    if (auth.status !== "authenticated" || !orderId) return;
    const controller = new AbortController();
    setOrder(null);
    setError(null);
    void fetch(`/api/admin/commerce/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${auth.session.access_token}` },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(response.status === 404 ? "Order not found." : response.status === 403 ? "This account is not authorized for Commerce Admin." : `Unable to load order (${response.status}).`);
      return response.json() as Promise<AdminCommerceOrderDetail>;
    }).then(setOrder).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load order.");
    });
    return () => controller.abort();
  }, [auth, orderId]);

  if (auth.status === "anonymous") {
    const next = orderId ? `/admin/commerce/orders/${orderId}` : "/admin/commerce";
    return <AdminCommerceShell><section className="admin-commerce__notice"><p>Admin sign-in is required.</p><Link href={`/admin-login?next=${encodeURIComponent(next)}`}>Sign in with Google</Link></section></AdminCommerceShell>;
  }

  return (
    <>
      <SEO title="Order | Commerce Admin" description="Private commerce order detail" path={orderId ? `/admin/commerce/orders/${orderId}` : "/admin/commerce"} noindex />
      <AdminCommerceShell>
        <Link className="admin-commerce__back" href="/admin/commerce">← All orders</Link>
        {auth.status === "loading" || (auth.status === "authenticated" && !order && !error) ? <p className="admin-commerce__notice">Loading order…</p> : null}
        {auth.status === "error" ? <p role="alert" className="admin-commerce__notice is-error">{auth.error}</p> : null}
        {error ? <p role="alert" className="admin-commerce__notice is-error">{error}</p> : null}
        {order ? <div className="admin-commerce__detail">
          <div className="admin-commerce__detail-title"><div><span>Order</span><h2>{order.item.productName}</h2></div><ReviewStatus value={order.reviewState} /></div>
          {order.reviewReasons.length ? <section className="admin-commerce__warning"><h3>Review required</h3><ul>{order.reviewReasons.map((reason) => <li key={reason}>{reason.replaceAll("_", " ")}</li>)}</ul></section> : null}

          <section><h3>Customer</h3><dl><Field label="Email">{order.customer.email ?? "Email unavailable"}</Field><Field label="Name">Name not collected</Field></dl></section>
          <section><h3>Payment</h3><dl><Field label="Amount">{formatPrice(order.totalMinor, order.currency, "en")}</Field><Field label="Status"><CommerceStatus value={order.status} /></Field><Field label="Provider">PayPal</Field><Field label="Environment">Unknown — not stored on historical orders</Field><Field label="Created">{date(order.createdAt)}</Field><Field label="Paid">{date(order.paidAt)}</Field>{order.failureCode ? <Field label="Failure code">{order.failureCode}</Field> : null}<Field label="Provider order">{order.providerOrderId ?? "—"}</Field><Field label="Provider capture">{order.providerCaptureId ?? "—"}</Field></dl></section>
          <section><h3>Product</h3><dl><Field label="Product">{order.item.productName}</Field><Field label="Quantity">{order.item.quantity}</Field><Field label="Unit price">{formatPrice(order.item.unitPriceMinor, order.currency, "en")}</Field><Field label="Line total">{formatPrice(order.item.lineTotalMinor, order.currency, "en")}</Field><Field label="Price source">{order.item.priceSource}</Field>{order.item.offerCode ? <Field label="Preorder offer">{order.item.offerCode}</Field> : null}</dl>{order.item.productNameSource === "current_catalog" ? <p className="admin-commerce__hint">Display name comes from the current static catalog; the immutable order snapshot is the product ID and price.</p> : null}</section>
          <section><h3>Access</h3>{order.entitlement ? <dl><Field label="Status"><CommerceStatus value={order.entitlement.status} /></Field><Field label="Source">{order.entitlement.source}</Field><Field label="Granted">{date(order.entitlement.grantedAt)}</Field></dl> : <p>No entitlement linked.</p>}</section>
          <section><h3>Preorder evidence</h3><p>{order.item.priceSource === "preorder" ? `This order used the immutable preorder price snapshot${order.item.offerCode ? ` (${order.item.offerCode})` : ""}.` : "This order used the catalog price snapshot."}</p></section>
          <section><h3>Provider / webhook events</h3>{order.events.length ? <ol className="admin-commerce__events">{order.events.map((event) => <li key={event.id}><div><strong>{event.eventType}</strong><CommerceStatus value={event.status} /></div><span>Received {date(event.receivedAt)} · Processed {date(event.processedAt)}</span>{event.failureCode ? <span>Failure: {event.failureCode}</span> : null}</li>)}</ol> : <p>No matching provider events.</p>}</section>
          <section><h3>Personalization</h3><dl><Field label="Saved personalization">{order.personalization.exists ? "Exists" : "Does not exist"}</Field>{order.personalization.exists ? <><Field label="Locale">{order.personalization.locale ?? "Unknown"}</Field><Field label="Updated">{date(order.personalization.updatedAt)}</Field></> : null}</dl><p className="admin-commerce__hint">Names and participant data are intentionally not displayed.</p></section>
          <section><h3>Receipt</h3><p>Not tracked in LapLapLa yet. Official receipts will be issued through Takbull.</p></section>
          <details className="admin-commerce__technical"><summary>Technical details</summary><dl><Field label="Internal order ID"><code>{order.id}</code></Field><Field label="Customer ID"><code>{order.customer.id}</code></Field><Field label="Order item ID"><code>{order.item.id}</code></Field><Field label="Product ID"><code>{order.item.productId}</code></Field>{order.entitlement ? <Field label="Entitlement ID"><code>{order.entitlement.id}</code></Field> : null}</dl></details>
        </div> : null}
      </AdminCommerceShell>
    </>
  );
}
