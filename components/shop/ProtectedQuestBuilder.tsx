import { useEffect, useState } from "react";
import Link from "next/link";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { customerCopy } from "@/lib/customer/copy";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { getProductById } from "@/lib/shop/catalog";
import { dictionaries, type Lang } from "@/i18n";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";
import { QuestBuilder, type QuestBuilderMode } from "./QuestBuilder";

type ProductAccessState = "checking" | "granted" | "denied" | "error";

export function ProtectedQuestBuilder({ productId, interfaceLang, initialMode = "default" }: {
  productId: string;
  interfaceLang: Lang;
  initialMode?: QuestBuilderMode;
}) {
  const auth = useCustomerSession();
  const [access, setAccess] = useState<ProductAccessState>("checking");
  const [initialPersonalization, setInitialPersonalization] = useState<QuestPersonalization | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const copy = customerCopy[interfaceLang];
  const productSlug = getProductById(productId)?.slug ?? productId;

  useEffect(() => {
    if (auth.status !== "authenticated") {
      setAccess("checking");
      setInitialPersonalization(null);
      return;
    }

    const controller = new AbortController();
    setAccess("checking");
    void fetch("/api/customer/sound-case-001-personalization", {
      headers: { Authorization: `Bearer ${auth.session.access_token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 403) return "denied" as const;
        if (!response.ok) return "error" as const;
        const data = await response.json() as { personalization: QuestPersonalization | null };
        return { access: "granted" as const, personalization: data.personalization };
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (typeof result === "string") {
          setInitialPersonalization(null);
          setAccess(result);
          return;
        }
        setInitialPersonalization(result.personalization);
        setAccess(result.access);
      })
      .catch(() => {
        if (!controller.signal.aborted) setAccess("error");
      });

    return () => controller.abort();
  }, [auth, productId, loadAttempt]);

  if (auth.status === "authenticated" && access === "granted") {
    const save = async (personalization: QuestPersonalization) => {
      const response = await fetch("/api/customer/sound-case-001-personalization", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${auth.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ personalization }),
      });
      if (!response.ok) throw new Error("Unable to save personalization");
      const data = await response.json() as { personalization: QuestPersonalization };
      return data.personalization;
    };

    return (
      <QuestBuilder
        key={`${productId}-${auth.session.user.id}`}
        interfaceLang={interfaceLang}
        initialPersonalization={initialPersonalization}
        initialMode={initialMode}
        onSave={save}
      />
    );
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
            <h1>{dictionaries[interfaceLang].shop.soundCase.builder.loadErrorTitle}</h1>
            <p role="alert">{dictionaries[interfaceLang].shop.soundCase.builder.loadErrorBody}</p>
            <button className="customer-account__primary" type="button" onClick={() => {
              if (auth.status === "error") window.location.reload();
              else setLoadAttempt((attempt) => attempt + 1);
            }}>
              {dictionaries[interfaceLang].shop.soundCase.builder.retryLoad}
            </button>
          </>
        ) : null}
        {!isAnonymous && !isDenied && !isError ? (
          <p aria-live="polite">{dictionaries[interfaceLang].shop.soundCase.builder.loadingPersonalization}</p>
        ) : null}
      </section>
    </main>
  );
}
