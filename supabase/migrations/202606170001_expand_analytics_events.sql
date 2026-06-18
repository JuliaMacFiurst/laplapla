alter table public.analytics_events
  add column if not exists properties jsonb not null default '{}'::jsonb,
  add column if not exists section text,
  add column if not exists content_id text,
  add column if not exists content_slug text,
  add column if not exists content_title text,
  add column if not exists language text,
  add column if not exists device_type text,
  add column if not exists viewport_width integer,
  add column if not exists source_page text,
  add column if not exists current_page text,
  add column if not exists referrer text,
  add column if not exists anonymous_user_id uuid,
  add column if not exists duration_seconds numeric,
  add column if not exists completion_percent numeric,
  add column if not exists step_index integer,
  add column if not exists total_steps integer,
  add column if not exists error_message text,
  add column if not exists export_format text;

update public.analytics_events
set
  properties = coalesce(properties, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'section', metadata->>'section',
    'content_id', coalesce(entity_id, metadata->>'content_id'),
    'content_slug', metadata->>'content_slug',
    'content_title', coalesce(entity_title, metadata->>'content_title'),
    'language', coalesce(lang, metadata->>'language'),
    'current_page', coalesce(page, metadata->>'current_page'),
    'session_id', session_id,
    'anonymous_user_id', visitor_id
  )),
  section = coalesce(section, metadata->>'section'),
  content_id = coalesce(content_id, entity_id, metadata->>'content_id'),
  content_slug = coalesce(content_slug, metadata->>'content_slug'),
  content_title = coalesce(content_title, entity_title, metadata->>'content_title'),
  language = coalesce(language, lang, metadata->>'language'),
  current_page = coalesce(current_page, page, metadata->>'current_page'),
  anonymous_user_id = coalesce(anonymous_user_id, visitor_id)
where properties = '{}'::jsonb
   or section is null
   or content_id is null
   or content_title is null
   or language is null
   or current_page is null
   or anonymous_user_id is null;

alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

alter table public.analytics_events
  add constraint analytics_events_event_name_check check (
    event_name in (
      'page_view',
      'session_start',
      'content_open',
      'content_start',
      'content_progress',
      'content_complete',
      'content_exit',
      'language_changed',
      'share_clicked',
      'external_link_clicked',
      'error_seen',
      'studio_open',
      'studio_project_created',
      'studio_media_added',
      'studio_sticker_added',
      'studio_export_started',
      'studio_export_completed',
      'studio_export_failed',
      'cat_question_opened',
      'cat_question_completed',
      'raccoon_map_opened',
      'country_opened',
      'recipe_opened',
      'recipe_steps_viewed',
      'dog_lesson_opened',
      'dog_lesson_completed',
      'parrot_music_opened',
      'parrot_audio_created',
      'bedtime_story_opened',
      'bedtime_story_completed',
      'page_viewed',
      'story_opened',
      'story_completed',
      'map_opened',
      'video_exported',
      'project_created',
      'short_opened',
      'story_downloaded'
    )
  );

alter table public.analytics_events
  drop constraint if exists analytics_events_properties_object_check;

alter table public.analytics_events
  add constraint analytics_events_properties_object_check check (jsonb_typeof(properties) = 'object');

drop policy if exists "Public clients can insert safe analytics events" on public.analytics_events;

create policy "Public clients can insert safe analytics events"
  on public.analytics_events
  for insert
  to anon, authenticated
  with check (
    event_name in (
      'page_view',
      'session_start',
      'content_open',
      'content_start',
      'content_progress',
      'content_complete',
      'content_exit',
      'language_changed',
      'share_clicked',
      'external_link_clicked',
      'error_seen',
      'studio_open',
      'studio_project_created',
      'studio_media_added',
      'studio_sticker_added',
      'studio_export_started',
      'studio_export_completed',
      'studio_export_failed',
      'cat_question_opened',
      'cat_question_completed',
      'raccoon_map_opened',
      'country_opened',
      'recipe_opened',
      'recipe_steps_viewed',
      'dog_lesson_opened',
      'dog_lesson_completed',
      'parrot_music_opened',
      'parrot_audio_created',
      'bedtime_story_opened',
      'bedtime_story_completed',
      'page_viewed',
      'story_opened',
      'story_completed',
      'map_opened',
      'video_exported',
      'project_created',
      'short_opened',
      'story_downloaded'
    )
    and (entity_type is null or entity_type in (
      'page',
      'story',
      'book',
      'recipe',
      'map',
      'studio_project',
      'video',
      'short'
    ))
    and (lang is null or lang in ('ru', 'en', 'he'))
    and (language is null or language in ('ru', 'en', 'he'))
    and char_length(event_name) <= 64
    and (entity_id is null or char_length(entity_id) <= 160)
    and (entity_title is null or char_length(entity_title) <= 240)
    and (page is null or char_length(page) <= 300)
    and jsonb_typeof(metadata) = 'object'
    and jsonb_typeof(properties) = 'object'
  );

create index if not exists analytics_events_event_name_idx
  on public.analytics_events(event_name);

create index if not exists analytics_events_section_created_idx
  on public.analytics_events(section, created_at desc)
  where section is not null;

create index if not exists analytics_events_anonymous_user_created_idx
  on public.analytics_events(anonymous_user_id, created_at desc)
  where anonymous_user_id is not null;

create index if not exists analytics_events_properties_gin_idx
  on public.analytics_events using gin(properties);
