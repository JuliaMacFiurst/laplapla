import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { dictionaries } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import { supabase } from "@/lib/supabase";

function buildDefaultAdminTargetUrl(lang: string) {
  const explicitSiteUrl =
    process.env["NEXT_PUBLIC_SITE_URL"] ||
    process.env["NEXT_PUBLIC_LAPLAPLA_SITE_URL"];
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : explicitSiteUrl || "http://localhost:3000";
  const targetUrl = new URL("/raccoons", origin);
  targetUrl.searchParams.set("lang", lang);
  return targetUrl.toString();
}

function buildAdminLoginCallbackUrl(nextTarget: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const callbackUrl = new URL("/admin-login", window.location.origin);
  callbackUrl.searchParams.set("next", nextTarget);
  return callbackUrl.toString();
}

function getStringParam(value: string | string[] | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getAuthRedirectErrorMessage() {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(
    window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash,
  );

  return (
    searchParams.get("error_description") ||
    searchParams.get("error") ||
    hashParams.get("error_description") ||
    hashParams.get("error")
  );
}

function hasAuthRedirectParams() {
  if (typeof window === "undefined") {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(
    window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash,
  );

  return (
    searchParams.has("code") ||
    searchParams.has("error") ||
    searchParams.has("error_description") ||
    hashParams.has("access_token") ||
    hashParams.has("refresh_token") ||
    hashParams.has("error") ||
    hashParams.has("error_description")
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const defaultNextTarget = useMemo(() => buildDefaultAdminTargetUrl(lang), [lang]);
  const seo = dictionaries[lang].seo.adminLogin;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/admin-login";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectIssuedRef = useRef(false);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    let active = true;
    const nextTarget = getStringParam(router.query.next) || defaultNextTarget;
    const callbackInProgress = hasAuthRedirectParams();

    const redirectToTarget = () => {
      if (redirectIssuedRef.current) {
        return;
      }

      redirectIssuedRef.current = true;
      if (typeof window !== "undefined") {
        window.location.replace(nextTarget);
        return;
      }

      void router.replace(nextTarget);
    };

    const initializeSession = async () => {
      if (callbackInProgress) {
        setLoading(true);
      }

      const callbackErrorMessage = getAuthRedirectErrorMessage();
      if (callbackErrorMessage) {
        setError(callbackErrorMessage);
        setLoading(false);
        return;
      }

      const { error: initializeError } = await supabase.auth.initialize();
      if (!active) {
        return;
      }

      if (initializeError) {
        setError(initializeError.message);
        setLoading(false);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) {
        return;
      }

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        redirectToTarget();
        return;
      }

      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) {
        return;
      }

      if (
        (event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED") &&
        session
      ) {
        redirectToTarget();
        return;
      }

      if (event === "SIGNED_OUT") {
        setLoading(false);
      }
    });

    void initializeSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [defaultNextTarget, router, router.isReady, router.query.next]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildAdminLoginCallbackUrl(
          getStringParam(router.query.next) || defaultNextTarget,
        ),
      },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title={seo.title} description={seo.description} path={seoPath} />
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ display: "grid", gap: "12px", justifyItems: "center" }}>
          <button
            type="button"
            onClick={() => void handleGoogleLogin()}
            disabled={loading}
            style={{ padding: "10px 16px", cursor: loading ? "default" : "pointer" }}
          >
            {loading ? "Redirecting..." : "Login with Google for LapLapLa"}
          </button>
          {error ? <p style={{ margin: 0 }}>{error}</p> : null}
        </div>
      </main>
    </>
  );
}
