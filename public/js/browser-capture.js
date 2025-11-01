// ======================================================
// ✅ Full Browser Capture Client
// Tracks: runtime errors, console errors, country clicks
// Sends batched logs to local AI Agents server
// ======================================================

(function () {
  const SERVER =
    window.__BROWSER_CAPTURE_ENDPOINT__ ||
    "http://127.0.0.1:5050/log/browser";

  const PROJECT =
    window.__PROJECT_NAME__ ||
    "capybara-tales";

  let sessionId =
    window.__AI_SESSION_ID__ ||
    (window.__AI_SESSION_ID__ = "sess_" + Date.now());

  console.debug(
    `✅ BrowserCapture active → ${SERVER} (session ${sessionId})`
  );

  // ---- Queue / Buffer management ----
  const queue = [];

  function now() {
    return new Date().toISOString();
  }

  // ======================================================
  // 🔍 DevTools Mini Replayer → show last 5 UX events
  // ======================================================
  const LAST_EVENTS_LIMIT = 5;
  const lastEvents = [];

  const IMPORTANT_TYPES = new Set([
    "country-click",
    "map-popup:open-attempt",
    "map-popup:open-success",
    "map-popup:close-success",
    "ai-freeze",
    "browser-error",
    "uncaught-error",
    "network-fetch-error"
  ]);

  function pushLocalEvent(event) {
    lastEvents.push(event);
    if (lastEvents.length > LAST_EVENTS_LIMIT) {
      lastEvents.shift();
    }

    if (!IMPORTANT_TYPES.has(event.type)) return;

    console.info(
      "%c🦝 UX Event",
      "background:#fed;color:#000;padding:2px 4px;border-radius:3px;",
      {
        type: event.type,
        id: event.id,
        mapType: event.mapType,
        note: event.note,
        stalledMs: event.stalledMs,
        duration: event.duration
      }
    );
  }

  // Manual access from console
  window.showBrowserLog = function () {
    console.group("🦝 BrowserCapture – Last events");
    lastEvents.forEach((ev, i) =>
      console.log(`${i + 1}.`, ev.type, ev)
    );
    console.groupEnd();
  };

  function enqueue(payload) {
    payload.ts = now();
    payload.project = PROJECT;
    payload.session = sessionId;
    // Add lightweight DOM snapshot
    payload.dom = {
      popupVisible: !!document.querySelector(".country-popup"),
      popupId: document.querySelector(".country-popup [data-country-id]")?.getAttribute("data-country-id") || null,
      selectedPath: document.querySelector("path.country[data-selected='true']")?.id || null
    };
    // Add simple performance metrics
    const nav = performance.getEntriesByType("navigation")[0];
    payload.perf = {
      fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime || null,
      domReady: nav ? nav.domContentLoadedEventEnd : null,
      loadComplete: nav ? nav.loadEventEnd : null
    };
    pushLocalEvent(payload);

    fetch(SERVER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([payload]),
      keepalive: true
    }).catch(() => {});
  }

  // ---- Console error interception ----
  const origConsoleError = console.error;
  console.error = function (...args) {
    enqueue({
      type: "browser-error",
      text: args.join(" ")
    });
    return origConsoleError.apply(console, args);
  };

  // ---- Runtime errors ----
  window.onerror = function (msg, src, line, col) {
    enqueue({
      type: "uncaught-error",
      message: msg,
      source: src,
      line,
      col
    });
  };

  // ---- Unhandled promises ----
  window.onunhandledrejection = function (ev) {
    enqueue({
      type: "unhandled-rejection",
      reason: ev.reason
    });
  };

  // ======================================================
  // ✅ CLICK tracking only for SVG countries on map
  // ======================================================
  document.addEventListener("click", (e) => {
    const target = e.target.closest("path.country");
    if (!target) return;

    const path = e.composedPath
      ? e.composedPath().map((n) => n.tagName || n.id || n.className)
      : [];

    enqueue({
      type: "country-click",
      event: "select",
      id: target.id || null,
      mapType: "country",
      tag: target.tagName,
      path,
    });

  });

  // ======================================================
  // ✅ Network fetch duration logging
  // ======================================================
  /*
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const start = performance.now();
    try {
      const res = await origFetch.apply(this, args);
      const end = performance.now();

      enqueue({
        type: "network-fetch",
        url: typeof args[0] === "string" ? args[0] : (args[0]?.url || null),
        duration: end - start,
        ok: res.ok,
        status: res.status
      });

      return res;
    } catch (err) {
      const end = performance.now();
      enqueue({
        type: "network-fetch-error",
        url: typeof args[0] === "string" ? args[0] : (args[0]?.url || null),
        duration: end - start,
        error: err?.message || String(err)
      });
      throw err;
    }
  };
  */

  // ======================================================
  // ✅ MutationObserver → detect stalls in popup updates
  // ======================================================
  let lastPopupMutation = performance.now();

  const popupObserver = new MutationObserver(() => {
    lastPopupMutation = performance.now();
    enqueue({
      type: "mutation",
      event: "popup-change"
    });
  });

  const popupNode = document.querySelector(".country-popup");
  if (popupNode) {
    popupObserver.observe(popupNode, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  /* 
  // ======================================================
  // ✅ AI Freeze Detector
  // If popup is visible but no mutations for 5 seconds → freeze suspected
  // ======================================================
  setInterval(() => {
    const popup = document.querySelector(".country-popup");
    if (!popup) return;

    const nowTs = performance.now();
    const diff = nowTs - lastPopupMutation;

    if (diff > 5000) {
      enqueue({
        type: "ai-freeze",
        reason: "no-dom-mutations",
        stalledMs: diff
      });
    }
  }, 2000);
  */

  // Public API: manual flush + generic capture + CustomEvent bridge
  window.__browserCapture = {
    sendNow: () => {}, // flushQueue removed, so no-op
    capture(type, detail = {}) {
      enqueue({ type, ...detail });
    },
  };

  // Listen to app-side telemetry as CustomEvent('ai-telemetry', { detail })
  window.addEventListener("ai-telemetry", (ev) => {
    try {
      const d = ev && ev.detail ? ev.detail : {};
      if (d && typeof d === "object") {
        enqueue({ type: d.type || "app-event", ...d });
      }
    } catch (_) {}
  });
    // ======================================================
  // ✅ FPS Capture — measures rendering performance
  // ======================================================
  /*
  let frameCount = 0;
  let lastFpsStamp = performance.now();

  function fpsLoop() {
    frameCount++;
    const now = performance.now();

    if (now - lastFpsStamp >= 1000) {
      const fps = frameCount;
      frameCount = 0;
      lastFpsStamp = now;

      enqueue({
        type: "perf-fps",
        fps,
        note:
          fps < 45
            ? "low"
            : fps < 30
            ? "very-low"
            : "ok",
      });
    }

    requestAnimationFrame(fpsLoop);
  }
  requestAnimationFrame(fpsLoop);
  */

  // ======================================================
  // ✅ Long Tasks API — detect main-thread blocks
  // ======================================================
  /*
  if ("PerformanceObserver" in window) {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          enqueue({
            type: "perf-long-task",
            name: entry.name || "long-task",
            duration: entry.duration,
            start: entry.startTime,
          });
        }
      });

      longTaskObserver.observe({ entryTypes: ["longtask"] });
    } catch (err) {}
  }
  */

  // ======================================================
  // ✅ Event Loop Stall Detector
  // ======================================================
  /*
  let loopLast = performance.now();
  setInterval(() => {
    const now = performance.now();
    const block = now - loopLast;
    loopLast = now;

    if (block > 120) {
      enqueue({
        type: "perf-event-loop-stall",
        stalledMs: block,
        severity:
          block > 500 ? "severe" :
          block > 250 ? "moderate" : "mild"
      });
    }
  }, 100);
  */
})();