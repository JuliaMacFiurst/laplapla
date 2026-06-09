create extension if not exists "pgcrypto";

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  entity_type text,
  entity_id text,
  entity_title text,
  page text,
  lang text,
  visitor_id uuid,
  session_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_event_name_check check (
    event_name in (
      'page_viewed',
      'story_opened',
      'story_completed',
      'recipe_opened',
      'map_opened',
      'video_exported',
      'project_created',
      'short_opened',
      'story_downloaded'
    )
  ),
  constraint analytics_events_entity_type_check check (
    entity_type is null or entity_type in (
      'page',
      'story',
      'book',
      'recipe',
      'map',
      'studio_project',
      'video',
      'short'
    )
  ),
  constraint analytics_events_lang_check check (
    lang is null or lang in ('ru', 'en', 'he')
  ),
  constraint analytics_events_event_name_length_check check (char_length(event_name) <= 64),
  constraint analytics_events_entity_id_length_check check (entity_id is null or char_length(entity_id) <= 160),
  constraint analytics_events_entity_title_length_check check (entity_title is null or char_length(entity_title) <= 240),
  constraint analytics_events_page_length_check check (page is null or char_length(page) <= 300),
  constraint analytics_events_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

alter table public.analytics_events enable row level security;

revoke all on table public.analytics_events from anon;
revoke all on table public.analytics_events from authenticated;

grant insert on table public.analytics_events to anon;
grant insert on table public.analytics_events to authenticated;
grant select, insert, update, delete on table public.analytics_events to service_role;

create policy "Public clients can insert safe analytics events"
  on public.analytics_events
  for insert
  to anon, authenticated
  with check (
    event_name in (
      'page_viewed',
      'story_opened',
      'story_completed',
      'recipe_opened',
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
    and char_length(event_name) <= 64
    and (entity_id is null or char_length(entity_id) <= 160)
    and (entity_title is null or char_length(entity_title) <= 240)
    and (page is null or char_length(page) <= 300)
    and jsonb_typeof(metadata) = 'object'
  );

create index if not exists analytics_events_created_at_idx
  on public.analytics_events(created_at desc);

create index if not exists analytics_events_event_created_idx
  on public.analytics_events(event_name, created_at desc);

create index if not exists analytics_events_entity_created_idx
  on public.analytics_events(entity_type, entity_id, created_at desc);

create index if not exists analytics_events_lang_created_idx
  on public.analytics_events(lang, created_at desc);

create index if not exists analytics_events_visitor_created_idx
  on public.analytics_events(visitor_id, created_at desc)
  where visitor_id is not null;

create index if not exists analytics_events_session_created_idx
  on public.analytics_events(session_id, created_at desc)
  where session_id is not null;
