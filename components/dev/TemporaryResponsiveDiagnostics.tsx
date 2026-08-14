import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";

// TEMP_RESPONSIVE_DIAGNOSTICS: remove this file after the S25 Ultra investigation.
const DIAGNOSTICS_QUERY_PARAM = "responsiveDiagnostics";
const MOBILE_MAX_WIDTH = 767;
const TABLET_MAX_WIDTH = 1199;
const COARSE_TABLET_MAX_WIDTH = 1600;

type DiagnosticValue = boolean | number | string | null;

function safeRead<T extends DiagnosticValue>(reader: () => T): T | null {
  try {
    return reader();
  } catch {
    return null;
  }
}

function safeMediaQuery(query: string): boolean | null {
  return safeRead(() => {
    if (typeof window.matchMedia !== "function") return null;
    return window.matchMedia(query).matches;
  });
}

function readRuntimeValues() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return null;

    const innerWidth = safeRead(() => window.innerWidth);
    const innerHeight = safeRead(() => window.innerHeight);
    const visualWidth = safeRead(() => window.visualViewport?.width ?? null);
    const visualHeight = safeRead(() => window.visualViewport?.height ?? null);
    const classifierWidthSource = visualWidth ?? innerWidth;
    const classifierHeightSource = visualHeight ?? innerHeight;
    const classifierWidth = typeof classifierWidthSource === "number" ? Math.round(classifierWidthSource) : null;
    const classifierHeight = typeof classifierHeightSource === "number" ? Math.round(classifierHeightSource) : null;
    const shortestSide = classifierWidth !== null && classifierHeight !== null
      ? Math.min(classifierWidth, classifierHeight)
      : null;
    const widestSide = classifierWidth !== null && classifierHeight !== null
      ? Math.max(classifierWidth, classifierHeight)
      : null;
    const pointerCoarse = safeMediaQuery("(pointer: coarse)");
    const pointerFine = safeMediaQuery("(pointer: fine)");
    const hoverNone = safeMediaQuery("(hover: none)");
    const usesTouchPrimaryInput = pointerCoarse === null || hoverNone === null
      ? null
      : pointerCoarse && hoverNone;

    let deviceClass: "mobile" | "tablet" | "desktop" | null = null;
    if (usesTouchPrimaryInput !== null && classifierWidth !== null && shortestSide !== null && widestSide !== null) {
      deviceClass = usesTouchPrimaryInput && classifierWidth <= MOBILE_MAX_WIDTH
        ? "mobile"
        : usesTouchPrimaryInput && shortestSide <= TABLET_MAX_WIDTH && widestSide <= COARSE_TABLET_MAX_WIDTH
          ? "tablet"
          : "desktop";
    }

    const mobileWidthQuery = safeMediaQuery(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const useIsMobileEquivalent = mobileWidthQuery === null || innerWidth === null || innerHeight === null || usesTouchPrimaryInput === null
      ? null
      : mobileWidthQuery || (usesTouchPrimaryInput && Math.min(innerWidth, innerHeight) <= MOBILE_MAX_WIDTH);
    const userAgentData = safeRead(() => {
      const value = (window.navigator as Navigator & { userAgentData?: { toJSON?: () => unknown } }).userAgentData;
      if (!value) return null;
      try {
        return JSON.stringify(value.toJSON?.() ?? value);
      } catch {
        return "unsupported";
      }
    });

    return {
      TEMP_RESPONSIVE_DIAGNOSTICS: true,
      capturedAt: safeRead(() => new Date().toISOString()),
      window: {
        innerWidth,
        innerHeight,
        outerWidth: safeRead(() => window.outerWidth),
        outerHeight: safeRead(() => window.outerHeight),
      },
      visualViewport: {
        width: visualWidth,
        height: visualHeight,
        scale: safeRead(() => window.visualViewport?.scale ?? null),
      },
      screen: {
        width: safeRead(() => window.screen?.width ?? null),
        height: safeRead(() => window.screen?.height ?? null),
        orientationType: safeRead(() => window.screen?.orientation?.type ?? null),
      },
      devicePixelRatio: safeRead(() => window.devicePixelRatio),
      mediaQueries: {
        pointerCoarse,
        pointerFine,
        hoverNone,
        hoverHover: safeMediaQuery("(hover: hover)"),
        anyPointerCoarse: safeMediaQuery("(any-pointer: coarse)"),
        anyPointerFine: safeMediaQuery("(any-pointer: fine)"),
        anyHoverHover: safeMediaQuery("(any-hover: hover)"),
        mobileWidthQuery,
      },
      classifierInputs: {
        width: classifierWidth,
        height: classifierHeight,
        shortestSide,
        widestSide,
        usesTouchPrimaryInput,
      },
      calculatedResults: {
        deviceClass,
        usesTouchStudioLayout: deviceClass === null ? null : deviceClass !== "desktop",
        useIsMobileEquivalent,
        classifiersDisagree: deviceClass === null || useIsMobileEquivalent === null
          ? null
          : useIsMobileEquivalent !== (deviceClass === "mobile"),
        documentDatasetViewportClass: safeRead(() => document.documentElement?.dataset?.viewportClass ?? null),
      },
      navigator: {
        userAgent: safeRead(() => window.navigator?.userAgent ?? null),
        userAgentData,
      },
      viewportMetaContent: safeRead(
        () => document.querySelector<HTMLMetaElement>('meta[name="viewport"]')?.content ?? null,
      ),
    };
  } catch (error) {
    // TEMP_RESPONSIVE_DIAGNOSTICS: temporary on-device initialization logging.
    console.error("TEMP_RESPONSIVE_DIAGNOSTICS data collection failed", error);
    return null;
  }
}

class DiagnosticErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // TEMP_RESPONSIVE_DIAGNOSTICS: never let this temporary UI take down the app.
    console.error("TEMP_RESPONSIVE_DIAGNOSTICS render failed", error, info);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function DiagnosticPanel() {
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [closed, setClosed] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [report, setReport] = useState<ReturnType<typeof readRuntimeValues>>(null);
  const [copyStatus, setCopyStatus] = useState("Copy");

  useEffect(() => {
    setMounted(true);
    try {
      const active = typeof window !== "undefined" &&
        new URLSearchParams(window.location?.search ?? "").get(DIAGNOSTICS_QUERY_PARAM) === "1";
      setEnabled(active);
      if (active) console.info("TEMP_RESPONSIVE_DIAGNOSTICS initialized");
    } catch (error) {
      console.error("TEMP_RESPONSIVE_DIAGNOSTICS initialization failed", error);
      setEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !enabled || closed || typeof window === "undefined") return;

    try {
      const sync = () => setReport(readRuntimeValues());
      sync();
      const intervalId = typeof window.setInterval === "function"
        ? window.setInterval(sync, 1000)
        : null;

      return () => {
        try {
          if (intervalId !== null && typeof window.clearInterval === "function") {
            window.clearInterval(intervalId);
          }
        } catch (error) {
          console.error("TEMP_RESPONSIVE_DIAGNOSTICS cleanup failed", error);
        }
      };
    } catch (error) {
      console.error("TEMP_RESPONSIVE_DIAGNOSTICS refresh initialization failed", error);
      return;
    }
  }, [closed, enabled, mounted]);

  if (!mounted || !enabled || closed || !report) return null;

  let reportJson = "Unable to serialize diagnostics";
  try {
    reportJson = JSON.stringify(report, null, 2);
  } catch (error) {
    console.error("TEMP_RESPONSIVE_DIAGNOSTICS serialization failed", error);
  }

  return (
    <aside
      aria-label="Temporary responsive diagnostics"
      style={{
        position: "fixed",
        right: 8,
        bottom: 8,
        zIndex: 2147483647,
        width: minimized ? "auto" : "min(340px, calc(100vw - 16px))",
        maxHeight: "55vh",
        overflow: "hidden",
        padding: 8,
        border: "2px solid #ffcc00",
        borderRadius: 8,
        background: "rgba(12, 12, 16, 0.96)",
        color: "#f7f7f7",
        font: "11px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        direction: "ltr",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <strong style={{ flex: 1, color: "#ffdf52" }}>RESP DEBUG</strong>
        {!minimized && (
          <button
            type="button"
            onClick={() => {
              try {
                const clipboard = window.navigator?.clipboard;
                if (!clipboard || typeof clipboard.writeText !== "function") {
                  setCopyStatus("Unsupported");
                  return;
                }
                void clipboard.writeText(reportJson).then(
                  () => setCopyStatus("Copied"),
                  () => setCopyStatus("Failed"),
                );
              } catch (error) {
                console.error("TEMP_RESPONSIVE_DIAGNOSTICS clipboard failed", error);
                setCopyStatus("Failed");
              }
            }}
          >
            {copyStatus}
          </button>
        )}
        <button type="button" onClick={() => setMinimized((value) => !value)}>
          {minimized ? "Open" : "Min"}
        </button>
        <button type="button" onClick={() => setClosed(true)} aria-label="Close diagnostics">×</button>
      </div>
      {!minimized && (
        <pre style={{ maxHeight: "calc(55vh - 40px)", margin: "8px 0 0", overflow: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {reportJson}
        </pre>
      )}
    </aside>
  );
}

export default function TemporaryResponsiveDiagnostics() {
  return (
    <DiagnosticErrorBoundary>
      <DiagnosticPanel />
    </DiagnosticErrorBoundary>
  );
}
