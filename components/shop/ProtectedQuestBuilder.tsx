import { useEffect, useState } from "react";
import Link from "next/link";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { customerCopy } from "@/lib/customer/copy";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { getProductById } from "@/lib/shop/catalog";
import type { Lang } from "@/i18n";
import { QuestBuilder } from "./QuestBuilder";

type ProductAccessState = "checking" | "granted" | "denied" | "error";

export function ProtectedQuestBuilder({ productId, interfaceLang }: {
  productId: string;
  interfaceLang: Lang;
}) {
  const auth = useCustomerSession();
  const [access, setAccess] = useState<ProductAccessState>("checking");
  const copy = customerCopy[interfaceLang];
  const productSlug = getProductById(productId)?.slug ?? productId;

  useEffect(() => {
    if (auth.status !== "authenticated") {
      setAccess("checking");
      return;
    }

    const controller = new AbortController();
    setAccess("checking");
    void fetch(`/api/customer/product-access?productId=${encodeURIComponent(productId)}`, {
      headers: { Authorization: `Bearer ${auth.session.access_token}` },
      signal: controller.signal,
    })
      .then((response) => {
        if (response.status === 403) return "denied" as const;
        if (!response.ok) return "error" as const;
        return "granted" as const;
      })
      .then((nextAccess) => {
        if (!controller.signal.aborted) setAccess(nextAccess);
      })
      .catch(() => {
        if (!controller.signal.aborted) setAccess("error");
      });

    return () => controller.abort();
  }, [auth, productId]);

  if (auth.status === "authenticated" && access === "granted") {
    return <QuestBuilder key={`${productId}-${interfaceLang}`} interfaceLang={interfaceLang} />;
  }

  const productPath = buildLocalizedPublicPath(`/shop/${productSlug}`, interfaceLang);
  const createPath = buildLocalizedPublicPath(`/shop/${productSlug}/create`, interfaceLang);
  const signInPath = `${buildLocalizedPublicPath("/account/sign-in", interfaceLang)}?next=${encodeURIComponent(createPath)}`;
  const isAnonymous = auth.status === "anonymous";
  const isDenied = auth.status === "authenticated" && access === "denied";
  const isError = auth.status === "error" || access === "error";

  return (
    <main className="customer-access" dir={interfaceLang === "he" ? "rtl" : "ltr"}>
      <section className="customer-access__card">
        {isAnonymous ? (
          <>
            <h1>{copy.signInTitle}</h1>
            <p>{copy.signInIntro}</p>
            <Link className="customer-account__primary" href={signInPath}>{copy.google}</Link>
          </>
        ) : null}
        {isDenied ? (
          <>
            <h1>{copy.entitlementRequiredTitle}</h1>
            <p>{copy.entitlementRequiredBody}</p>
            <Link href={productPath}>{copy.backToProduct}</Link>
          </>
        ) : null}
        {isError ? (
          <>
            <h1>{copy.entitlementRequiredTitle}</h1>
            <p role="alert">{copy.entitlementRequiredBody}</p>
            <Link href={productPath}>{copy.backToProduct}</Link>
          </>
        ) : null}
        {!isAnonymous && !isDenied && !isError ? <p aria-live="polite">{copy.loading}</p> : null}
      </section>
    </main>
  );
}
