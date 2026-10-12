import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { getCurrentLang, buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { supportCopy } from "@/lib/support/copy";
import { SUPPORT_CATEGORIES, type SupportCategory } from "@/lib/support/types";
import type { CustomerAccountResponse, CustomerPurchase } from "@/lib/customer/purchases";

function createSubmissionId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function CustomerSupportPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const copy = supportCopy[lang];
  const auth = useCustomerSession();
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<SupportCategory>("payment");
  const [orderReference, setOrderReference] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [purchases, setPurchases] = useState<CustomerPurchase[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "received" | "error">("idle");
  const [requestId, setRequestId] = useState("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") { setPurchases([]); return; }
    const controller = new AbortController();
    setOrdersLoading(true);
    void fetch("/api/customer/account", {
      headers: { Authorization: `Bearer ${auth.session.access_token}` }, signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("orders_unavailable");
      return response.json() as Promise<CustomerAccountResponse>;
    }).then((data) => {
      setPurchases(data.purchases);
      const requestedOrder = typeof router.query.order === "string" ? router.query.order : "";
      if (data.purchases.some((purchase) => purchase.orderId === requestedOrder)) setOrderReference(requestedOrder);
    }).catch(() => setPurchases([])).finally(() => setOrdersLoading(false));
    return () => controller.abort();
  }, [auth, router.query.order]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "sending") return;
    const activeSubmissionId = submissionId ?? createSubmissionId();
    setSubmissionId(activeSubmissionId);
    setState("sending");
    try {
      const response = await fetch("/api/support/requests", {
        method: "POST", headers: { "Content-Type": "application/json", ...(auth.status === "authenticated" ? { Authorization: `Bearer ${auth.session.access_token}` } : {}) },
        body: JSON.stringify({ submissionId: activeSubmissionId, locale: lang, category, email: auth.status === "authenticated" ? undefined : email,
          orderReference, message, website }),
      });
      if (!response.ok) throw new Error("request_failed");
      const result = await response.json() as { requestId?: string };
      setRequestId(result.requestId ?? "");
      setState("received");
      setSubmissionId(null);
    } catch { setState("error"); }
  };

  return <>
    <SEO title={`${copy.title} | LapLapLa`} description={copy.intro} path={buildLocalizedPublicPath("/support", lang)} noindex />
    <main className="customer-support" dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="customer-support__card">
        <h1>{copy.title}</h1><p>{copy.intro}</p>
        {state === "received" ? <div role="status" className="customer-support__result"><strong>{copy.success}</strong>{requestId && <p>{copy.reference}: <bdi dir="ltr">{requestId}</bdi></p>}</div> :
          <form onSubmit={(event) => void onSubmit(event)}>
            <label htmlFor="support-category">{copy.category}</label>
            <select id="support-category" value={category} onChange={(event) => setCategory(event.target.value as SupportCategory)}>
              {SUPPORT_CATEGORIES.map((value) => <option key={value} value={value}>{copy.categories[value]}</option>)}
            </select>
            <label htmlFor="support-email">{copy.email}</label>
            {auth.status === "authenticated" ? <input id="support-email" type="email" dir="ltr" value={auth.session.user.email ?? ""} readOnly /> :
              <input id="support-email" type="email" dir="ltr" value={email} maxLength={320} required autoComplete="email" onChange={(event) => setEmail(event.target.value)} />}
            <label htmlFor="support-order">{copy.order}</label>
            {auth.status === "authenticated" ? <select id="support-order" dir={lang === "he" ? "rtl" : "ltr"} value={orderReference} onChange={(event) => setOrderReference(event.target.value)} disabled={ordersLoading}>
              <option value="">{ordersLoading ? copy.orderLoading : copy.noOrder}</option>
              {purchases.map((purchase) => <option key={purchase.orderId} value={purchase.orderId}>{purchase.productTitle} — {purchase.orderId}</option>)}
            </select> : <input id="support-order" dir="ltr" value={orderReference} maxLength={80} pattern="[A-Za-z0-9-]*" onChange={(event) => setOrderReference(event.target.value)} />}
            <label htmlFor="support-message">{copy.message}</label>
            <textarea id="support-message" value={message} minLength={10} maxLength={4000} required rows={7} onChange={(event) => setMessage(event.target.value)} />
            <div className="customer-support__trap" aria-hidden="true"><label htmlFor="support-website">Website</label><input id="support-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
            <p className="customer-support__note">{copy.cancellationNote}</p>
            {state === "error" && <p role="alert" className="customer-support__error">{copy.failed}</p>}
            <button type="submit" disabled={state === "sending" || auth.status === "loading"}>{state === "sending" ? copy.sending : copy.submit}</button>
          </form>}
      </div>
    </main>
  </>;
}
