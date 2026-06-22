import { supabase } from "@/lib/supabase";

const DEVTOOLS_KEY = "__laplaplaDevtools";
const DEVTOOLS_REGISTERED_KEY = "__laplaplaDevtoolsRegistered";
const ANALYTICS_BUFFER_KEY = "__laplaplaAnalyticsDebugBuffer";
const NETWORK_BUFFER_KEY = "__laplaplaNetworkDebugBuffer";
const FETCH_WRAPPED_KEY = "__laplaplaFetchDebugWrapped";
const PROJECT_SAVE_STATE_KEY = "__laplaplaProjectSaveDebugState";
const MAX_BUFFER_SIZE = 100;

type AnalyticsDebugStatus = "queued" | "sent" | "failed";

export type LaplaplaAnalyticsDebugEntry = {
  id: string;
  eventName: string;
  route: string;
  status: AnalyticsDebugStatus;
  responseStatus: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  timestamp: string;
};

type NetworkDebugEntry = {
  id: string;
  method: string;
  origin: string;
  pathname: string;
  queryKeys: string[];
  status: number | null;
  durationMs: number;
  result: "success" | "failure";
  requestType: "api" | "supabase" | "external" | "static";
  timestamp: string;
  errorMessage: string | null;
};

type AnalyticsRecordInput = {
  id: string;
  eventName: string;
  route: string;
};

type AnalyticsCompleteInput = {
  id: string;
  status: "sent" | "failed";
  responseStatus?: number | null;
  durationMs?: number | null;
  errorMessage?: string | null;
};

type DevtoolsTool = {
  name: string;
  description: string;
  execute: () => unknown | Promise<unknown>;
};

type ProjectSaveDebugState = {
  source: "StudioRoot";
  projectId: string;
  activeStudioPageType: string | null;
  isSaving: boolean;
  isSaved: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  lastSaveAttemptAt: string | null;
  lastSaveStatus: "idle" | "saving" | "saved" | "failed" | "unknown";
  slideCount: number;
  trackCount: number;
  historyDepth: number;
  futureDepth: number;
  hasInitialImport: boolean;
  updatedAt: string | null;
};

type ToolDiscoveryRuntime = {
  registerTool?: unknown;
  registerTools?: unknown;
  register?: unknown;
  addTool?: unknown;
};

type DevtoolsGlobal = {
  getLaplaplaRuntimeContext: () => ReturnType<typeof getLaplaplaRuntimeContext>;
  getLaplaplaAnalyticsDebug: () => ReturnType<typeof getLaplaplaAnalyticsDebug>;
  getLaplaplaAuthDebug: () => ReturnType<typeof getLaplaplaAuthDebug>;
  getLaplaplaFeatureGateDebug: () => ReturnType<typeof getLaplaplaFeatureGateDebug>;
  getLaplaplaNetworkDebug: () => ReturnType<typeof getLaplaplaNetworkDebug>;
  getLaplaplaMonetizationReadiness: () => ReturnType<typeof getLaplaplaMonetizationReadiness>;
  getLaplaplaProjectSaveDebug: () => ReturnType<typeof getLaplaplaProjectSaveDebug>;
};

declare global {
  interface Window {
    [DEVTOOLS_KEY]?: DevtoolsGlobal;
    [DEVTOOLS_REGISTERED_KEY]?: boolean;
    [ANALYTICS_BUFFER_KEY]?: LaplaplaAnalyticsDebugEntry[];
    [NETWORK_BUFFER_KEY]?: NetworkDebugEntry[];
    [FETCH_WRAPPED_KEY]?: boolean;
    [PROJECT_SAVE_STATE_KEY]?: ProjectSaveDebugState;
    __laplaplaRecordAnalyticsDebug?: (input: AnalyticsRecordInput) => void;
    __laplaplaCompleteAnalyticsDebug?: (input: AnalyticsCompleteInput) => void;
    __laplaplaUpdateProjectSaveDebug?: (input: ProjectSaveDebugState) => void;
    devtoolstooldiscovery?: ToolDiscoveryRuntime | ((tool: unknown) => unknown);
  }
}

function isEnabled() {
  return process.env.NODE_ENV === "development" && typeof window !== "undefined";
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function sanitizeErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(access_token|refresh_token|apikey|api_key|token|key)=([^&\s]+)/gi, "$1=[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .slice(0, 240);
}

function pushBounded<T>(items: T[], item: T) {
  items.push(item);
  if (items.length > MAX_BUFFER_SIZE) {
    items.splice(0, items.length - MAX_BUFFER_SIZE);
  }
}

function getAnalyticsBuffer() {
  window[ANALYTICS_BUFFER_KEY] ||= [];
  return window[ANALYTICS_BUFFER_KEY];
}

function getNetworkBuffer() {
  window[NETWORK_BUFFER_KEY] ||= [];
  return window[NETWORK_BUFFER_KEY];
}

function safeStorageKeys(storage: Storage | null, storageType: "localStorage" | "sessionStorage") {
  if (!storage) {
    return {
      storageType,
      available: false,
      keys: [] as string[],
      projectLikeKeys: [] as string[],
      warning: `${storageType}_unavailable`,
    };
  }

  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => Boolean(key))
      .sort();
    const projectLikeKeys = keys.filter((key) =>
      /(project|draft|slide|story|studio|parrot_import|catsSlides|composition|lesson_draft)/i.test(key),
    );

    return {
      storageType,
      available: true,
      keys,
      projectLikeKeys,
      warning: null as string | null,
    };
  } catch (error) {
    return {
      storageType,
      available: false,
      keys: [] as string[],
      projectLikeKeys: [] as string[],
      warning: sanitizeErrorMessage(error),
    };
  }
}

async function inspectStudioIndexedDb() {
  if (!("indexedDB" in window)) {
    return {
      available: false,
      databaseName: "studio-db",
      stores: [] as string[],
      projectCount: null as number | null,
      audioCount: null as number | null,
      projectKeys: [] as string[],
      warning: "indexedDB_unavailable",
    };
  }

  const databaseName = "studio-db";
  const indexedDbWithDatabases = indexedDB as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string | null }>>;
  };

  if (indexedDbWithDatabases.databases) {
    try {
      const databases = await indexedDbWithDatabases.databases();
      if (!databases.some((database) => database.name === databaseName)) {
        return {
          available: true,
          databaseName,
          stores: [] as string[],
          projectCount: 0,
          audioCount: 0,
          projectKeys: [] as string[],
          warning: "studio_db_not_initialized",
        };
      }
    } catch {
      // Fall through to opening the DB; older engines can reject this metadata call.
    }
  }

  return new Promise<{
    available: boolean;
    databaseName: string;
    stores: string[];
    projectCount: number | null;
    audioCount: number | null;
    projectKeys: string[];
    warning: string | null;
  }>((resolve) => {
    const request = indexedDB.open(databaseName);

    request.onupgradeneeded = () => {
      request.transaction?.abort();
      request.result?.close();
      resolve({
        available: true,
        databaseName,
        stores: [],
        projectCount: 0,
        audioCount: 0,
        projectKeys: [],
        warning: "studio_db_not_initialized",
      });
    };

    request.onerror = () => {
      resolve({
        available: false,
        databaseName,
        stores: [],
        projectCount: null,
        audioCount: null,
        projectKeys: [],
        warning: sanitizeErrorMessage(request.error),
      });
    };

    request.onsuccess = () => {
      const db = request.result;
      const stores = Array.from(db.objectStoreNames);

      if (!stores.includes("projects") && !stores.includes("audio")) {
        db.close();
        resolve({
          available: true,
          databaseName,
          stores,
          projectCount: 0,
          audioCount: 0,
          projectKeys: [],
          warning: null,
        });
        return;
      }

      try {
        const transaction = db.transaction(stores.filter((store) => store === "projects" || store === "audio"), "readonly");
        const projectsStore = stores.includes("projects") ? transaction.objectStore("projects") : null;
        const audioStore = stores.includes("audio") ? transaction.objectStore("audio") : null;
        let projectCount: number | null = null;
        let audioCount: number | null = null;
        let projectKeys: string[] = [];
        let projectCountLoaded = !projectsStore;
        let projectKeysLoaded = !projectsStore;
        let audioCountLoaded = !audioStore;
        let resolved = false;

        const maybeResolve = () => {
          if (!resolved && projectCountLoaded && projectKeysLoaded && audioCountLoaded) {
            resolved = true;
            db.close();
            resolve({
              available: true,
              databaseName,
              stores,
              projectCount,
              audioCount,
              projectKeys,
              warning: null,
            });
          }
        };

        if (projectsStore) {
          const countRequest = projectsStore.count();
          countRequest.onsuccess = () => {
            projectCount = countRequest.result;
            projectCountLoaded = true;
            maybeResolve();
          };
          countRequest.onerror = () => {
            projectCount = null;
            projectCountLoaded = true;
            maybeResolve();
          };

          const keysRequest = projectsStore.getAllKeys();
          keysRequest.onsuccess = () => {
            projectKeys = keysRequest.result.map(String).sort();
            projectKeysLoaded = true;
            maybeResolve();
          };
          keysRequest.onerror = () => {
            projectKeys = [];
            projectKeysLoaded = true;
            maybeResolve();
          };
        }

        if (audioStore) {
          const countRequest = audioStore.count();
          countRequest.onsuccess = () => {
            audioCount = countRequest.result;
            audioCountLoaded = true;
            maybeResolve();
          };
          countRequest.onerror = () => {
            audioCount = null;
            audioCountLoaded = true;
            maybeResolve();
          };
        }

        maybeResolve();
      } catch (error) {
        db.close();
        resolve({
          available: false,
          databaseName,
          stores,
          projectCount: null,
          audioCount: null,
          projectKeys: [],
          warning: sanitizeErrorMessage(error),
        });
      }
    };
  });
}

function summarizeUserAgent() {
  const userAgent = navigator.userAgent;
  const browser =
    userAgent.includes("Edg/")
      ? "Edge"
      : userAgent.includes("Chrome/")
        ? "Chrome"
        : userAgent.includes("Firefox/")
          ? "Firefox"
          : userAgent.includes("Safari/")
            ? "Safari"
            : "unknown";

  return {
    browser,
    platform: navigator.platform || "unknown",
    mobile: /Mobi|Android|iPhone|iPad/i.test(userAgent),
  };
}

function safeUrl(input: RequestInfo | URL) {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  return new URL(raw, window.location.href);
}

function classifyRequest(url: URL) {
  if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
    return "api" as const;
  }

  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/supabase-storage") ||
    url.pathname.includes("/storage/v1/") ||
    url.pathname.includes("/rest/v1/")
  ) {
    return "supabase" as const;
  }

  if (url.origin !== window.location.origin) {
    return "external" as const;
  }

  return "static" as const;
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  if (typeof Request !== "undefined" && input instanceof Request && input.method) {
    return input.method.toUpperCase();
  }

  return "GET";
}

function getLaplaplaRuntimeContext() {
  const url = new URL(window.location.href);
  return {
    currentUrl: `${url.origin}${url.pathname}${url.search}`,
    pathname: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    documentTitle: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    userAgentSummary: summarizeUserAgent(),
    environment: "development" as const,
    timestamp: new Date().toISOString(),
  };
}

function getLaplaplaAnalyticsDebug() {
  return {
    status: "ok" as const,
    eventsSincePageLoad: [...getAnalyticsBuffer()],
    count: getAnalyticsBuffer().length,
    timestamp: new Date().toISOString(),
  };
}

async function getLaplaplaAuthDebug() {
  const result = {
    authSystemDetected: true,
    currentUserState: "unknown" as "guest" | "authenticated" | "unknown",
    userId: null as string | null,
    role: null as string | null,
    subscriptionStatus: null as string | null,
    isAdmin: null as boolean | null,
    status: "supabase_auth_detected" as "supabase_auth_detected" | "auth_not_implemented" | "auth_error",
    notes: [] as string[],
  };

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return {
        ...result,
        status: "auth_error" as const,
        currentUserState: "unknown" as const,
        errorMessage: sanitizeErrorMessage(error),
      };
    }

    const user = data.session?.user;
    if (!user) {
      return {
        ...result,
        currentUserState: "guest" as const,
      };
    }

    const metadata = {
      ...(user.app_metadata || {}),
      ...(user.user_metadata || {}),
    } as Record<string, unknown>;
    const role = typeof metadata.role === "string" ? metadata.role : null;
    const subscriptionStatus =
      typeof metadata.subscription_status === "string"
        ? metadata.subscription_status
        : typeof metadata.subscriptionStatus === "string"
          ? metadata.subscriptionStatus
          : null;

    return {
      ...result,
      currentUserState: "authenticated" as const,
      userId: user.id || null,
      role,
      subscriptionStatus,
      isAdmin: role === "admin" ? true : null,
      notes: ["Email, tokens, cookies and auth headers are intentionally omitted."],
    };
  } catch (error) {
    return {
      ...result,
      status: "auth_error" as const,
      errorMessage: sanitizeErrorMessage(error),
    };
  }
}

function getLaplaplaFeatureGateDebug() {
  return {
    status: "feature_gates_not_implemented" as const,
    detectedFeatureGates: [] as Array<{
      featureName: string;
      requiredRole: string | null;
      requiredPlan: string | null;
      currentState: "allowed" | "blocked" | "unknown";
      reason: string | null;
    }>,
    timestamp: new Date().toISOString(),
  };
}

function getLaplaplaNetworkDebug() {
  return {
    status: "ok" as const,
    requestsSincePageLoad: [...getNetworkBuffer()],
    count: getNetworkBuffer().length,
    timestamp: new Date().toISOString(),
  };
}

function getActiveStudioPageType() {
  const url = new URL(window.location.href);
  const routeType = url.searchParams.get("type");
  const pathname = url.pathname;

  if (routeType === "cats" || pathname.includes("/cats/studio")) return "cats";
  if (routeType === "parrot" || pathname.includes("/parrots/studio")) return "parrots";
  if (pathname.includes("/caps/stories/create")) return "capybara_story_composer";
  if (pathname.includes("/capybara") || pathname.includes("/books")) return "capybara_books";
  if (pathname.includes("/raccoons/kitchen")) return "recipes";
  if (pathname.includes("/bedtime-stories")) return "bedtime_stories";
  if (pathname.includes("/studio")) return "studio";
  return null;
}

async function getLaplaplaProjectSaveDebug() {
  const local = safeStorageKeys(window.localStorage, "localStorage");
  const session = safeStorageKeys(window.sessionStorage, "sessionStorage");
  const indexedDb = await inspectStudioIndexedDb();
  const networkRequests = getNetworkBuffer();
  const activeProjectState = window[PROJECT_SAVE_STATE_KEY] ?? null;
  const apiDetected = networkRequests.some((request) => request.requestType === "api");
  const supabaseDetected = networkRequests.some((request) => request.requestType === "supabase");
  const knownProjectLikeKeys = [...new Set([
    ...local.projectLikeKeys,
    ...session.projectLikeKeys,
    ...indexedDb.projectKeys.map((key) => `indexedDB:studio-db/projects:${key}`),
  ])].sort();
  const storageWarnings = [
    local.warning,
    session.warning,
    indexedDb.warning,
  ].filter((warning): warning is string => Boolean(warning));
  const hasProjectSaveSignals =
    Boolean(activeProjectState) ||
    knownProjectLikeKeys.length > 0 ||
    (indexedDb.projectCount ?? 0) > 0 ||
    getActiveStudioPageType() !== null;

  return {
    status: hasProjectSaveSignals ? "ok" as const : "project_save_not_implemented" as const,
    detectedStorageTypes: {
      localStorage: local.available,
      sessionStorage: session.available,
      indexedDB: indexedDb.available,
      Supabase: supabaseDetected,
      API: apiDetected,
    },
    knownProjectLikeKeys,
    counts: {
      localStorageProjectLikeKeys: local.projectLikeKeys.length,
      sessionStorageProjectLikeKeys: session.projectLikeKeys.length,
      indexedDbProjects: indexedDb.projectCount,
      indexedDbAudioItems: indexedDb.audioCount,
    },
    indexedDb: {
      databaseName: indexedDb.databaseName,
      stores: indexedDb.stores,
      projectKeys: indexedDb.projectKeys,
    },
    activeStudioPageType: activeProjectState?.activeStudioPageType ?? getActiveStudioPageType(),
    activeProject: activeProjectState
      ? {
          source: activeProjectState.source,
          projectId: activeProjectState.projectId,
          slideCount: activeProjectState.slideCount,
          trackCount: activeProjectState.trackCount,
          historyDepth: activeProjectState.historyDepth,
          futureDepth: activeProjectState.futureDepth,
          hasInitialImport: activeProjectState.hasInitialImport,
          updatedAt: activeProjectState.updatedAt,
        }
      : null,
    unsavedChangesDetected: activeProjectState?.hasUnsavedChanges ?? "unknown" as const,
    lastSaveAttempt: activeProjectState?.lastSaveAttemptAt ?? null,
    lastSaveStatus: activeProjectState?.lastSaveStatus ?? "unknown" as const,
    lastSavedAt: activeProjectState?.lastSavedAt ?? null,
    storageWarnings,
    potentialFutureHookPoints: [
      "components/studio/StudioRoot.tsx",
      "lib/studioStorage.ts",
      "hooks/useStoryGenerator.ts",
      "pages/cats/studio.tsx",
      "pages/parrots/studio.tsx",
      "pages/api/story/preview.ts",
      "pages/api/map-popup-content/slides.ts",
      "pages/api/map-popup-content/media.ts",
    ],
    futureAuthReadinessNotes: [
      "IndexedDB projects currently have local ids but no owner id.",
      "sessionStorage import keys are handoff buffers, not durable user-owned projects.",
      "Server-owned project saves will need user id, ownership checks and migration from local project ids.",
      "Do not sync slide text, prompts, media URLs or audio data to diagnostics.",
    ],
    safety: {
      omitsProjectBodies: true,
      omitsSlideText: true,
      omitsPrompts: true,
      omitsMediaAndAudioUrls: true,
      omitsPrivateAuthData: true,
      omitsRequestAndResponseBodies: true,
    },
    timestamp: new Date().toISOString(),
  };
}

function getLaplaplaMonetizationReadiness() {
  const analyticsEvents = getAnalyticsBuffer();
  const networkRequests = getNetworkBuffer();
  const hasSupabaseNetwork = networkRequests.some((request) => request.requestType === "supabase");
  const pathname = window.location.pathname;
  const hasProjectSaveSignal =
    pathname.includes("/studio") ||
    pathname.includes("/cats/export") ||
    pathname.includes("/caps/stories/create") ||
    networkRequests.some((request) => request.pathname.includes("studio"));

  return {
    analyticsDetected: analyticsEvents.length > 0,
    authDetected: true,
    featureGatesDetected: false,
    projectSaveDetected: hasProjectSaveSignal,
    paymentProviderDetected: false,
    adminToolsDetected:
      window.location.pathname.includes("admin") ||
      networkRequests.some((request) => request.pathname.includes("/api/map-popup-content/")),
    runtimeSignals: {
      analyticsEvents: analyticsEvents.length,
      networkRequests: networkRequests.length,
      supabaseRequests: hasSupabaseNetwork,
    },
    missingPiecesForPaidFeatures: [
      "user-facing auth state provider",
      "explicit role/permission model",
      "subscription/payment provider runtime signal",
      "feature gate registry",
      "server-backed project ownership and save flow",
    ],
    note: "Runtime-only summary; it does not infer business rules.",
    timestamp: new Date().toISOString(),
  };
}

function installAnalyticsDebugBridge() {
  window.__laplaplaRecordAnalyticsDebug = (input) => {
    const existing = getAnalyticsBuffer().find((entry) => entry.id === input.id);
    if (existing) {
      return;
    }

    pushBounded(getAnalyticsBuffer(), {
      id: input.id,
      eventName: input.eventName,
      route: input.route,
      status: "queued",
      responseStatus: null,
      durationMs: null,
      errorMessage: null,
      timestamp: new Date().toISOString(),
    });
  };

  window.__laplaplaCompleteAnalyticsDebug = (input) => {
    const entry = getAnalyticsBuffer().find((item) => item.id === input.id);
    if (!entry) {
      return;
    }

    entry.status = input.status;
    entry.responseStatus = input.responseStatus ?? null;
    entry.durationMs = input.durationMs ?? null;
    entry.errorMessage = input.errorMessage ? sanitizeErrorMessage(input.errorMessage) : null;
  };
}

function installProjectSaveDebugBridge() {
  window.__laplaplaUpdateProjectSaveDebug = (input) => {
    window[PROJECT_SAVE_STATE_KEY] = input;
  };
}

function installNetworkDebug() {
  if (window[FETCH_WRAPPED_KEY]) {
    return;
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isEnabled()) {
      return originalFetch(input, init);
    }

    const startedAt = performance.now();
    const id = createId("network");
    let url: URL;
    let method = "GET";

    try {
      url = safeUrl(input);
      method = getRequestMethod(input, init);
    } catch {
      return originalFetch(input, init);
    }

    try {
      const response = await originalFetch(input, init);
      pushBounded(getNetworkBuffer(), {
        id,
        method,
        origin: url.origin,
        pathname: url.pathname,
        queryKeys: [...url.searchParams.keys()].sort(),
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
        result: response.ok ? "success" : "failure",
        requestType: classifyRequest(url),
        timestamp: new Date().toISOString(),
        errorMessage: null,
      });
      return response;
    } catch (error) {
      pushBounded(getNetworkBuffer(), {
        id,
        method,
        origin: url.origin,
        pathname: url.pathname,
        queryKeys: [...url.searchParams.keys()].sort(),
        status: null,
        durationMs: Math.round(performance.now() - startedAt),
        result: "failure",
        requestType: classifyRequest(url),
        timestamp: new Date().toISOString(),
        errorMessage: sanitizeErrorMessage(error),
      });
      throw error;
    }
  };

  window[FETCH_WRAPPED_KEY] = true;
}

function registerWithToolDiscovery(tools: DevtoolsTool[]) {
  const discovery = window.devtoolstooldiscovery;
  if (!discovery) {
    return { registered: false, reason: "devtoolstooldiscovery_not_found" };
  }

  const toolPayloads = tools.map((tool) => ({
    name: tool.name,
    title: tool.name,
    description: tool.description,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: tool.execute,
    handler: tool.execute,
    callback: tool.execute,
  }));

  try {
    if (typeof discovery === "function") {
      for (const tool of toolPayloads) {
        discovery(tool);
      }
      return { registered: true, method: "function" };
    }

    if (typeof discovery.registerTools === "function") {
      discovery.registerTools(toolPayloads);
      return { registered: true, method: "registerTools" };
    }

    if (typeof discovery.registerTool === "function") {
      for (const tool of toolPayloads) {
        discovery.registerTool(tool);
      }
      return { registered: true, method: "registerTool" };
    }

    if (typeof discovery.register === "function") {
      for (const tool of toolPayloads) {
        discovery.register(tool);
      }
      return { registered: true, method: "register" };
    }

    if (typeof discovery.addTool === "function") {
      for (const tool of toolPayloads) {
        discovery.addTool(tool);
      }
      return { registered: true, method: "addTool" };
    }
  } catch (error) {
    return { registered: false, reason: sanitizeErrorMessage(error) };
  }

  return { registered: false, reason: "unsupported_devtoolstooldiscovery_runtime" };
}

export function initializeLaplaplaDevtools() {
  if (!isEnabled() || window[DEVTOOLS_REGISTERED_KEY]) {
    return;
  }

  installAnalyticsDebugBridge();
  installProjectSaveDebugBridge();
  installNetworkDebug();

  const api: DevtoolsGlobal = {
    getLaplaplaRuntimeContext,
    getLaplaplaAnalyticsDebug,
    getLaplaplaAuthDebug,
    getLaplaplaFeatureGateDebug,
    getLaplaplaNetworkDebug,
    getLaplaplaMonetizationReadiness,
    getLaplaplaProjectSaveDebug,
  };
  window[DEVTOOLS_KEY] = api;

  const tools: DevtoolsTool[] = [
    {
      name: "getLaplaplaRuntimeContext",
      description: "Return safe LapLapLa runtime page context for development debugging.",
      execute: api.getLaplaplaRuntimeContext,
    },
    {
      name: "getLaplaplaAnalyticsDebug",
      description: "Return safe analytics event send status captured since this page loaded.",
      execute: api.getLaplaplaAnalyticsDebug,
    },
    {
      name: "getLaplaplaAuthDebug",
      description: "Return safe auth state summary without tokens, cookies, headers, email or profile data.",
      execute: api.getLaplaplaAuthDebug,
    },
    {
      name: "getLaplaplaFeatureGateDebug",
      description: "Return detected feature gate runtime state when a gate system exists.",
      execute: api.getLaplaplaFeatureGateDebug,
    },
    {
      name: "getLaplaplaNetworkDebug",
      description: "Return sanitized fetch request summary without headers, bodies, cookies or tokens.",
      execute: api.getLaplaplaNetworkDebug,
    },
    {
      name: "getLaplaplaProjectSaveDebug",
      description: "Return safe project save, draft and generated-content storage metadata without project bodies.",
      execute: api.getLaplaplaProjectSaveDebug,
    },
    {
      name: "getLaplaplaMonetizationReadiness",
      description: "Return runtime-only paid feature readiness signals detected on the current page.",
      execute: api.getLaplaplaMonetizationReadiness,
    },
  ];

  const registration = registerWithToolDiscovery(tools);
  window[DEVTOOLS_REGISTERED_KEY] = true;

  if (!registration.registered) {
    console.info("[LapLapLa DevTools] third-party tool discovery unavailable", registration.reason);
  }
}
