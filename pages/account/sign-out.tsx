import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { customerCopy } from "@/lib/customer/copy";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import { supabase } from "@/lib/supabase";

export default function CustomerSignOutPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const copy = customerCopy[lang];
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.signOut().then(({ error: signOutError }) => {
      if (!active) return;
      if (signOutError) {
        setError(signOutError.message);
        return;
      }
      void router.replace(buildLocalizedPublicPath("/account/sign-in", lang));
    });
    return () => { active = false; };
  }, [lang, router]);

  return (
    <>
      <SEO
        title={`${copy.signOut} | LapLapLa`}
        description={copy.signedOut}
        path={buildLocalizedPublicPath("/account/sign-out", lang)}
        noindex
      />
      <main className="customer-auth" dir={lang === "he" ? "rtl" : "ltr"}>
        <section className="customer-auth__card">
          <h1>{copy.signOut}</h1>
          <p role={error ? "alert" : "status"}>{error ?? copy.signedOut}</p>
        </section>
      </main>
    </>
  );
}
