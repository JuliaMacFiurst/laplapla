import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
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

function readHashParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  return new URLSearchParams(hash);
}

export default function AdminLoginPage() {
  const router = useRouter();
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
    const queryAccessToken = getStringParam(router.query.access_token);
    const queryRefreshToken = getStringParam(router.query.refresh_token);
    const hashParams = readHashParams();
    const hashAccessToken = getStringParam(hashParams.get("access_token") ?? undefined);
    const hashRefreshToken = getStringParam(hashParams.get("refresh_token") ?? undefined);
    const accessToken = queryAccessToken || hashAccessToken;
    const refreshToken = queryRefreshToken || hashRefreshToken;

    const redirectToTarget = () => {
      if (typeof window !== "undefined") {
        window.location.replace(nextTarget);
        return;
      }

      void router.replace(nextTarget);
    };

    const initializeSession = async () => {
      if (accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!active) {
          return;
        }

        if (setSessionError) {
          setError(setSessionError.message);
          return;
        }

        if (typeof window !== "undefined" && window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }

        redirectToTarget();
        return;
      }

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
  }, [router, router.isReady, router.query.access_token, router.query.next, router.query.refresh_token]);

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
      <Head>
        <title>Admin Login</title>
      </Head>
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
