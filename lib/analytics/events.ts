export const ANALYTICS_EVENT_NAMES = [
  "page_viewed",
  "story_opened",
  "story_completed",
  "recipe_opened",
  "map_opened",
  "video_exported",
  "project_created",
  "short_opened",
  "story_downloaded",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export const ANALYTICS_ENTITY_TYPES = [
  "page",
  "story",
  "book",
  "recipe",
  "map",
  "studio_project",
  "video",
  "short",
] as const;

export type AnalyticsEntityType = (typeof ANALYTICS_ENTITY_TYPES)[number];

export type AnalyticsLang = "ru" | "en" | "he";

export type AnalyticsMetadata = Record<string, string | number | boolean | null>;

export type AnalyticsEventInput = {
  eventName: AnalyticsEventName;
  entityType?: AnalyticsEntityType;
  entityId?: string | number | null;
  entityTitle?: string | null;
  page?: string | null;
  lang?: AnalyticsLang | null;
  visitorId?: string | null;
  sessionId?: string | null;
  metadata?: AnalyticsMetadata;
};

export const ANALYTICS_EVENT_LABELS: Record<AnalyticsEventName, string> = {
  page_viewed: "Page views",
  story_opened: "Stories opened",
  story_completed: "Stories completed",
  recipe_opened: "Recipes viewed",
  map_opened: "Maps opened",
  video_exported: "Videos exported",
  project_created: "Projects created",
  short_opened: "Shorts opened",
  story_downloaded: "Story downloads",
};

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value);
}

export function isAnalyticsEntityType(value: unknown): value is AnalyticsEntityType {
  return typeof value === "string" && (ANALYTICS_ENTITY_TYPES as readonly string[]).includes(value);
}

export function isAnalyticsLang(value: unknown): value is AnalyticsLang {
  return value === "ru" || value === "en" || value === "he";
}
