export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "session_start",
  "content_open",
  "content_start",
  "content_progress",
  "content_complete",
  "content_exit",
  "language_changed",
  "share_clicked",
  "external_link_clicked",
  "error_seen",
  "studio_open",
  "studio_project_created",
  "studio_media_added",
  "studio_sticker_added",
  "studio_export_started",
  "studio_export_completed",
  "studio_export_failed",
  "studio_recording_started",
  "studio_recording_completed",
  "studio_recording_failed",
  "cat_question_opened",
  "cat_question_completed",
  "raccoon_map_opened",
  "country_opened",
  "recipe_opened",
  "recipe_steps_viewed",
  "dog_lesson_opened",
  "dog_lesson_completed",
  "parrot_music_opened",
  "parrot_audio_created",
  "bedtime_story_opened",
  "bedtime_story_completed",
  "page_viewed",
  "story_opened",
  "story_completed",
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

export type AnalyticsSection =
  | "home"
  | "cats"
  | "studio"
  | "raccoons"
  | "recipes"
  | "dog_lessons"
  | "parrots"
  | "bedtime_stories"
  | "books"
  | "map"
  | "legal"
  | "other";

export type AnalyticsDeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type AnalyticsProperties = {
  section?: AnalyticsSection | string | null;
  content_type?: AnalyticsEntityType | string | null;
  content_id?: string | number | null;
  content_slug?: string | null;
  content_title?: string | null;
  page_title?: string | null;
  readable_title?: string | null;
  language?: AnalyticsLang | null;
  device_type?: AnalyticsDeviceType | null;
  viewport_width?: number | null;
  source_page?: string | null;
  current_page?: string | null;
  referrer?: string | null;
  session_id?: string | null;
  anonymous_user_id?: string | null;
  duration_seconds?: number | null;
  completion_percent?: number | null;
  step_index?: number | null;
  total_steps?: number | null;
  error_message?: string | null;
  export_format?: string | null;
  studio_type?: string | null;
  entry_point?: string | null;
  export_method?: string | null;
  export_surface?: string | null;
  project_id?: string | number | null;
  scroll_percent?: number | null;
  [key: string]: string | number | boolean | null | undefined;
};

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
  properties?: AnalyticsProperties;
};

export const ANALYTICS_EVENT_LABELS: Record<AnalyticsEventName, string> = {
  page_view: "Page views",
  session_start: "Sessions started",
  content_open: "Content opened",
  content_start: "Content started",
  content_progress: "Content progress",
  content_complete: "Content completed",
  content_exit: "Content exits",
  language_changed: "Language changes",
  share_clicked: "Shares clicked",
  external_link_clicked: "External links clicked",
  error_seen: "Errors seen",
  studio_open: "Studio opened",
  studio_project_created: "Studio projects created",
  studio_media_added: "Studio media added",
  studio_sticker_added: "Studio stickers added",
  studio_export_started: "Studio exports started",
  studio_export_completed: "Studio exports completed",
  studio_export_failed: "Studio exports failed",
  studio_recording_started: "Studio recordings started",
  studio_recording_completed: "Studio recordings completed",
  studio_recording_failed: "Studio recordings failed",
  cat_question_opened: "Cat questions opened",
  cat_question_completed: "Cat questions completed",
  raccoon_map_opened: "Raccoon map opened",
  country_opened: "Countries opened",
  recipe_steps_viewed: "Recipe steps viewed",
  dog_lesson_opened: "Dog lessons opened",
  dog_lesson_completed: "Dog lessons completed",
  parrot_music_opened: "Parrot music opened",
  parrot_audio_created: "Parrot audio created",
  bedtime_story_opened: "Bedtime stories opened",
  bedtime_story_completed: "Bedtime stories completed",
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
