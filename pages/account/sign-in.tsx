import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import {
  buildCustomerAuthCallbackUrl,
  resolveCustomerDestination,
  storeCustomerAuthDestination,
} from "@/lib/customer/authRouting";
import { customerCopy } from "@/lib/customer/copy";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import { supabase } from "@/lib/supabase";

function getStringParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export default function CustomerSignInPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const copy = customerCopy[lang];
  const nextTarget = useMemo(
    () => resolveCustomerDestination(getStringParam(router.query.next), lang),
    [lang, router.query.next],
  );
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = () => {
    storeCustomerAuthDestination(window.localStorage, nextTarget, lang);
    return buildCustomerAuthCallbackUrl(window.location.origin, lang);
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  };

  const handleMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setSent(false);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });
    if (signInError) {
      setError(signInError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <>
      <SEO
        title={`${copy.signInTitle} | LapLapLa`}
        description={copy.signInIntro}
        path={buildLocalizedPublicPath("/account/sign-in", lang)}
        noindex
      />
      <main className="customer-auth" dir={lang === "he" ? "rtl" : "ltr"}>
        <section className="customer-auth__card">
          <h1>{copy.signInTitle}</h1>
          <p>{copy.signInIntro}</p>
          <button type="button" onClick={() => void handleGoogle()} disabled={loading}>
            {loading ? copy.signingIn : copy.google}
          </button>
          <div className="customer-auth__divider" aria-hidden="true"><span>or</span></div>
          <form onSubmit={(event) => void handleMagicLink(event)}>
            <label htmlFor="customer-email">{copy.emailLabel}</label>
            <input
              id="customer-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              placeholder={copy.emailPlaceholder}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" disabled={loading || !email.trim()}>
              {loading ? copy.signingIn : copy.magicLink}
            </button>
          </form>
          {sent ? <p role="status">{copy.magicLinkSent}</p> : null}
          {error ? <p role="alert">{error}</p> : null}
        </section>
      </main>
    </>
  );
}
