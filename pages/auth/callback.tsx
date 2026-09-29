import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { consumeCustomerAuthDestination } from "@/lib/customer/authRouting";
import { customerCopy } from "@/lib/customer/copy";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import { supabase } from "@/lib/supabase";

export default function CustomerAuthCallbackPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const copy = customerCopy[lang];
  const [error, setError] = useState<string | null>(null);
  const redirectIssuedRef = useRef(false);

  useEffect(() => {
    if (!router.isReady) return;
    let active = true;
    const nextTarget = consumeCustomerAuthDestination(
      window.localStorage,
      router.query.next,
      lang,
    );

    void supabase.auth.initialize().then(async ({ error: initializeError }) => {
      if (!active) return;
      if (initializeError) {
        setError(initializeError.message);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError || !data.session) {
        setError(sessionError?.message ?? "Authentication session was not created");
        return;
      }

      if (redirectIssuedRef.current) return;
      redirectIssuedRef.current = true;
      await router.replace(nextTarget);
    });

    return () => { active = false; };
  }, [lang, router, router.isReady, router.query.next]);

  return (
    <>
      <SEO
        title={`${copy.callback} | LapLapLa`}
        description={copy.callback}
        path={buildLocalizedPublicPath("/auth/callback", lang)}
        noindex
      />
      <main className="customer-auth" dir={lang === "he" ? "rtl" : "ltr"}>
        <section className="customer-auth__card">
          <h1>{copy.callback}</h1>
          {error ? <p role="alert">{error}</p> : <p aria-live="polite">{copy.loading}</p>}
        </section>
      </main>
    </>
  );
}
