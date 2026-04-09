import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { dictionaries } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import { supabase } from "@/lib/supabase";

const LAPLAPLA_TARGET_URL =
  process.env["NEXT_PUBLIC_SITE_URL"] ||
  process.env["NEXT_PUBLIC_LAPLAPLA_SITE_URL"] ||
  "http://localhost:3000/raccoons?lang=ru";

function buildAdminLoginCallbackUrl() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const callbackUrl = new URL("/admin-login", window.location.origin);
  callbackUrl.searchParams.set("next", LAPLAPLA_TARGET_URL);
  return callbackUrl.toString();
}

function getStringParam(value: string | string[] | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const seo = dictionaries[lang].seo.adminLogin;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/admin-login";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!router.isReady || handledRef.current) {
      return;
    }

    handledRef.current = true;
    let active = true;

    const nextTarget = getStringParam(router.query.next) || LAPLAPLA_TARGET_URL;

    const redirectToTarget = () => {
      if (typeof window !== "undefined") {
        window.location.replace(nextTarget);
        return;
      }

      void router.replace(nextTarget);
    };

    const initializeSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) {
        return;
      }

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      if (data.session) {
        redirectToTarget();
      }
    };

    void initializeSession();

    return () => {
      active = false;
    };
  }, [router, router.isReady, router.query.next]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildAdminLoginCallbackUrl(),
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
