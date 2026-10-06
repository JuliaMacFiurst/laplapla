import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import AdminCommerceShell from "@/components/admin/AdminCommerceShell";
import { CommerceStatus, ReviewStatus } from "@/components/admin/CommerceStatus";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import type { AdminCommerceListResponse } from "@/lib/admin/commerce";
import { formatPrice } from "@/lib/shop/commerce";

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default function AdminCommercePage() {
  const router = useRouter();
  const auth = useCustomerSession();
  const [data, setData] = useState<AdminCommerceListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of ["page", "status", "access", "priceSource", "reviewState", "search"] as const) {
      const value = one(router.query[key]);
      if (value) params.set(key, value);
    }
    return params.toString();
  }, [router.query]);

  useEffect(() => setSearch(one(router.query.search)), [router.query.search]);
  useEffect(() => {
    if (auth.status !== "authenticated" || !router.isReady) return;
    const controller = new AbortController();
    setData(null);
    setError(null);
    void fetch(`/api/admin/commerce/orders${queryString ? `?${queryString}` : ""}`, {
      headers: { Authorization: `Bearer ${auth.session.access_token}` },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(response.status === 403 ? "This account is not authorized for Commerce Admin." : `Unable to load orders (${response.status}).`);
      return response.json() as Promise<AdminCommerceListResponse>;
    }).then(setData).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load orders.");
    });
    return () => controller.abort();
  }, [auth, queryString, router.isReady]);

  const setFilter = (key: string, value: string) => {
    const query = { ...router.query };
    if (value) query[key] = value;
    else delete query[key];
    if (key !== "page") delete query.page;
    void router.push({ pathname: router.pathname, query });
  };
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setFilter("search", search.trim());
  };

  if (auth.status === "anonymous") {
    return <AdminCommerceShell><section className="admin-commerce__notice"><p>Admin sign-in is required.</p><Link href="/admin-login?next=%2Fadmin%2Fcommerce">Sign in with Google</Link></section></AdminCommerceShell>;
  }

  return (
    <>
      <SEO title="Commerce Admin | LapLapLa" description="Private commerce operations" path="/admin/commerce" noindex />
      <AdminCommerceShell>
        {auth.status === "loading" || (auth.status === "authenticated" && !data && !error) ? <p className="admin-commerce__notice">Loading orders…</p> : null}
        {auth.status === "error" ? <p role="alert" className="admin-commerce__notice is-error">{auth.error}</p> : null}
        {error ? <p role="alert" className="admin-commerce__notice is-error">{error}</p> : null}
        {data ? (
          <>
            <section className="admin-commerce__counters" aria-label="Order counters">
              <article><strong>{data.counters.paid}</strong><span>Paid orders</span></article>
              <article><strong>{data.counters.pending}</strong><span>Pending</span></article>
              <article><strong>{data.counters.needsReview}</strong><span>Needs review</span></article>
              <article><strong>{data.counters.paymentProblems}</strong><span>Payment problems</span></article>
            </section>
            <p className="admin-commerce__provenance" role="note">
              Revenue hidden until Sandbox/Live provenance is reliable. Existing orders do not record PayPal environment.
            </p>
            <section className="admin-commerce__filters" aria-label="Order filters">
              <form onSubmit={submitSearch}>
                <label htmlFor="commerce-search">Search</label>
                <div><input id="commerce-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email or order reference" /><button type="submit">Search</button></div>
              </form>
              <label>Status<select value={one(router.query.status)} onChange={(event) => setFilter("status", event.target.value)}><option value="">All</option><option value="paid">Paid</option><option value="creating">Creating</option><option value="pending_approval">Pending approval</option><option value="capture_pending">Capture pending</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select></label>
              <label>Access<select value={one(router.query.access)} onChange={(event) => setFilter("access", event.target.value)}><option value="">All</option><option value="active">Active</option><option value="revoked">Revoked</option><option value="refunded">Refunded</option><option value="expired">Expired</option><option value="none">No entitlement</option></select></label>
              <label>Price<select value={one(router.query.priceSource)} onChange={(event) => setFilter("priceSource", event.target.value)}><option value="">All</option><option value="catalog">Catalog</option><option value="preorder">Preorder</option></select></label>
              <label>Review<select value={one(router.query.reviewState)} onChange={(event) => setFilter("reviewState", event.target.value)}><option value="">All</option><option value="ok">OK</option><option value="pending">Pending</option><option value="needs_review">Needs review</option></select></label>
            </section>
            {data.resultsMayBeTruncated || data.authDirectoryMayBeTruncated ? <p className="admin-commerce__notice">This bounded launch view may omit older orders or customer emails. Scan limit: {data.boundedScanLimit} orders.</p> : null}
            {data.orders.length === 0 ? <p className="admin-commerce__empty">No matching orders.</p> : (
              <div className="admin-commerce__table-wrap"><table className="admin-commerce__table"><thead><tr><th>Date</th><th>Customer</th><th>Product</th><th>Amount</th><th>Payment</th><th>Provider</th><th>Price</th><th>Access</th><th>Review</th></tr></thead><tbody>{data.orders.map((order) => <tr key={order.id}><td><Link href={`/admin/commerce/orders/${order.id}`}>{new Intl.DateTimeFormat("en-IL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</Link></td><td><strong>{order.customer.email ?? "Email unavailable"}</strong><span>Name not collected</span></td><td>{order.item.productName}</td><td>{formatPrice(order.totalMinor, order.currency, "en")}</td><td><CommerceStatus value={order.status} /></td><td>PayPal<span>Environment unknown</span></td><td>{order.item.priceSource}</td><td>{order.entitlement ? <CommerceStatus value={order.entitlement.status} /> : "No access"}</td><td><ReviewStatus value={order.reviewState} /></td></tr>)}</tbody></table></div>
            )}
            <nav className="admin-commerce__pagination" aria-label="Orders pages"><button disabled={data.page <= 1} onClick={() => setFilter("page", String(data.page - 1))}>Previous</button><span>Page {data.page} of {data.totalPages}</span><button disabled={data.page >= data.totalPages} onClick={() => setFilter("page", String(data.page + 1))}>Next</button></nav>
          </>
        ) : null}
      </AdminCommerceShell>
    </>
  );
}
