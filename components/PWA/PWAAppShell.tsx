import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/i18n";
import AppSplash from "@/components/PWA/AppSplash";
import { APP_BRAND } from "@/lib/pwa/appBrand";
import {
  PWA_BOOT_DIAGNOSTIC_KEY,
  PWA_BOOT_READY_EVENT,
  type PwaBootState,
} from "@/lib/pwa/bootLifecycle";
import { sentryDebugMessage } from "@/sentry.shared";
import {
  logSplashTrace,
  type SplashDebugMode,
  type SplashPresentation,
  type SplashTracePatch,
} from "@/components/PWA/AnimatedAppSplash";

const UPDATE_COPY: Record<Lang, { title: (appName: string) => string; button: string }> = {
  ru: { title: (appName) => `Доступна новая версия ${appName}`, button: "Обновить" },
  en: { title: (appName) => `A new version of ${appName} is available`, button: "Update" },
  he: { title: (appName) => `גרסה חדשה של ${appName} זמינה`, button: "עדכון" },
};

const BOOT_RECOVERY_COPY: Record<Lang, { title: string; message: string; retry: string }> = {
  ru: {
    title: "LapLapLa загружается дольше обычного",
    message: "Соединение доступно, но запуск не завершился. Попробуйте загрузить приложение ещё раз.",
    retry: "Повторить",
  },
  en: {
    title: "LapLapLa is taking longer than usual",
    message: "The connection is available, but startup did not finish. Try loading the app again.",
    retry: "Try again",
  },
  he: {
    title: "הטעינה של LapLapLa נמשכת יותר מהרגיל",
    message: "החיבור זמין, אך ההפעלה לא הושלמה. נסו לטעון את היישום שוב.",
    retry: "ניסיון נוסף",
  },
};

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const MIN_STATIC_SPLASH_MS = 700;
const MIN_ANIMATED_VISIBLE_MS = 900;
const SPLASH_SAFETY_LIMIT_MS = 3200;
const DEBUG_SPLASH_MS = 6000;

const DEBUG_SPLASH_MODES = new Set<SplashDebugMode>([
  "animated", "static", "timeout", "error", "slow",
]);

export function isSplashDebugHost(hostname: string) {
  return (
    process.env.NODE_ENV === "development" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".vercel.app")
  );
}

export function getSplashDebugMode(search: string, hostname: string): SplashDebugMode | undefined {
  if (!isSplashDebugHost(hostname)) return undefined;
  const params = new URLSearchParams(search);
  const requested = params.get("debugSplashMode");
  if (requested && DEBUG_SPLASH_MODES.has(requested as SplashDebugMode)) {
    return requested as SplashDebugMode;
  }
  return params.get("debugSplash") === "1" ? "animated" : undefined;
}

export function getSplashTraceEnabled(search: string, hostname: string) {
  return isSplashDebugHost(hostname) && new URLSearchParams(search).get("debugSplashTrace") === "1";
}

function getDisplayMode() {
  if (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone) return "standalone";
  // Web APIs do not reliably distinguish a Chrome Custom Tab from a browser tab.
  return "browser/custom-tab";
}

function canRegisterServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  return (
    process.env.NODE_ENV === "production" &&
    (window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  );
}

export default function PWAAppShell({ lang }: { lang: Lang }) {
  const [bootState, setBootState] = useState<PwaBootState>("booting");
  const [debugSplashEnabled, setDebugSplashEnabled] = useState(false);
  const [debugSplashMode, setDebugSplashMode] = useState<SplashDebugMode>();
  const [showTraceBadge, setShowTraceBadge] = useState(false);
  const [trace, setTrace] = useState({
    mode: "pending", visible: true, svg: "loading", ready: false, reason: "initial",
  });
  const [splashAnimationKey, setSplashAnimationKey] = useState(0);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const reloadStarted = useRef(false);
  const splashReadyTimer = useRef(0);
  const safetyTimer = useRef(0);
  const appReady = useRef(false);
  const splashStartedAt = useRef(0);
  const pendingPresentation = useRef<SplashPresentation | null>(null);

  useEffect(() => {
    const startedAt = performance.now();
    splashStartedAt.current = startedAt;
    const selectedDebugMode = getSplashDebugMode(window.location.search, window.location.hostname);
    const shouldDebugSplash = Boolean(selectedDebugMode);
    setDebugSplashEnabled(shouldDebugSplash);
    setDebugSplashMode(selectedDebugMode);
    setShowTraceBadge(getSplashTraceEnabled(window.location.search, window.location.hostname));
    logSplashTrace("shell mounted");
    logSplashTrace("initial visible: true");
    logSplashTrace(`display mode: ${getDisplayMode()}`);
    document.documentElement.dataset.pwaBootState = "ready";
    window.dispatchEvent(new Event(PWA_BOOT_READY_EVENT));
    appReady.current = true;
    setTrace((current) => ({ ...current, ready: true }));
    logSplashTrace("app-ready received");
    if (pendingPresentation.current) {
      const pending = pendingPresentation.current;
      pendingPresentation.current = null;
      handlePresentationReady(pending);
    }
    try {
      const diagnostic = window.sessionStorage.getItem(PWA_BOOT_DIAGNOSTIC_KEY);
      if (diagnostic) {
        const parsed = JSON.parse(diagnostic) as {
          reason?: unknown;
          duration_ms?: unknown;
          online?: unknown;
          health_check?: unknown;
        };
        const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 80) : "unknown";
        const duration = typeof parsed.duration_ms === "number"
          ? Math.max(0, Math.min(120_000, Math.round(parsed.duration_ms)))
          : 0;
        const online = typeof parsed.online === "boolean" ? String(parsed.online) : "unknown";
        const health = typeof parsed.health_check === "string"
          ? parsed.health_check.slice(0, 40)
          : "unknown";
        sentryDebugMessage(
          `pwa_boot_recovered reason=${reason} duration_ms=${duration} online=${online} health=${health}`,
        );
        window.sessionStorage.removeItem(PWA_BOOT_DIAGNOSTIC_KEY);
      }
    } catch {
      try {
        window.sessionStorage.removeItem(PWA_BOOT_DIAGNOSTIC_KEY);
      } catch {}
    }
    safetyTimer.current = window.setTimeout(
      () => setBootState("ready"),
      shouldDebugSplash ? DEBUG_SPLASH_MS : SPLASH_SAFETY_LIMIT_MS,
    );

    return () => {
      window.clearTimeout(splashReadyTimer.current);
      window.clearTimeout(safetyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (bootState === "ready") {
      setTrace((current) => ({ ...current, visible: false }));
      logSplashTrace("splash hidden");
    }
  }, [bootState]);

  useEffect(() => {
    if (!canRegisterServiceWorker()) {
      return;
    }

    let active = true;
    let registration: ServiceWorkerRegistration | null = null;
    let intervalId = 0;

    const inspectRegistration = (nextRegistration: ServiceWorkerRegistration) => {
      registration = nextRegistration;
      if (nextRegistration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(nextRegistration.waiting);
      }

      nextRegistration.addEventListener("updatefound", () => {
        const installing = nextRegistration.installing;
        if (!installing) {
          return;
        }
        installing.addEventListener("statechange", () => {
          if (
            active &&
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(installing);
          }
        });
      });
    };

    const checkForUpdate = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void registration?.update().catch(() => undefined);
      }
    };

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((nextRegistration) => {
        if (!active) {
          return;
        }
        inspectRegistration(nextRegistration);
        void nextRegistration.update().catch(() => undefined);
        intervalId = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
      })
      .catch(() => {
        sentryDebugMessage("pwa_service_worker_registration_failed");
      });

    const handleControllerChange = () => {
      if (reloadStarted.current) {
        return;
      }
      reloadStarted.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", checkForUpdate);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("online", checkForUpdate);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);

  const applyUpdate = () => {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
  };

  const replaySplashAnimation = () => {
    window.clearTimeout(splashReadyTimer.current);
    setBootState("booting");
    splashStartedAt.current = performance.now();
    setTrace((current) => ({ ...current, visible: true, svg: "loading", reason: "replay" }));
    setSplashAnimationKey((current) => current + 1);
    splashReadyTimer.current = window.setTimeout(() => setBootState("ready"), DEBUG_SPLASH_MS);
  };

  const handlePresentationReady = (presentation: SplashPresentation) => {
    if (!appReady.current) {
      pendingPresentation.current = presentation;
      return;
    }
    if (presentation.reason === "timeout") {
      // Diagnostic only: do not unmount the object and thereby abort a cold but
      // still viable SVG request. The global safety timer remains authoritative.
      return;
    }
    window.clearTimeout(splashReadyTimer.current);
    const activeDebugMode = getSplashDebugMode(window.location.search, window.location.hostname);
    if (activeDebugMode) {
      const remainingDebugMs = Math.max(
        0,
        DEBUG_SPLASH_MS - (performance.now() - splashStartedAt.current),
      );
      splashReadyTimer.current = window.setTimeout(() => {
        window.clearTimeout(safetyTimer.current);
        setBootState("ready");
      }, remainingDebugMs);
      return;
    }
    const minimumMs = presentation.mode === "animated"
      ? MIN_ANIMATED_VISIBLE_MS
      : MIN_STATIC_SPLASH_MS;
    const visibleSince = presentation.mode === "animated"
      ? performance.now()
      : splashStartedAt.current;
    const remaining = Math.max(0, minimumMs - (performance.now() - visibleSince));
    splashReadyTimer.current = window.setTimeout(() => {
      window.clearTimeout(safetyTimer.current);
      setBootState("ready");
    }, remaining);
  };

  const updateSplashTrace = useCallback((patch: SplashTracePatch) => {
    setTrace((current) => ({ ...current, ...patch }));
  }, []);

  const copy = UPDATE_COPY[lang];

  return (
    <>
      <AppSplash
        visible={bootState === "booting"}
        recoveryCopy={BOOT_RECOVERY_COPY[lang]}
        debugReplay={debugSplashEnabled ? {
          animationKey: splashAnimationKey,
          onReplay: replaySplashAnimation,
        } : undefined}
        debugMode={debugSplashMode}
        onPresentationReady={handlePresentationReady}
        onTrace={updateSplashTrace}
      />
      {showTraceBadge ? (
        <aside className="app-splash-trace" aria-live="polite">
          <div>mode: {trace.mode}</div>
          <div>visible: {String(trace.visible)}</div>
          <div>svg: {trace.svg}</div>
          <div>ready: {String(trace.ready)}</div>
          <div>reason: {trace.reason}</div>
        </aside>
      ) : null}
      {waitingWorker ? (
        <aside className="pwa-update-toast" role="status" aria-live="polite">
          <span>{copy.title(APP_BRAND.appName)}</span>
          <button type="button" onClick={applyUpdate}>
            {copy.button}
          </button>
        </aside>
      ) : null}
    </>
  );
}
