-- Analytics v2 Phase 1: idempotency, taxonomy contract, canonical reports and summaries.
alter table public.analytics_events
  add column if not exists event_id uuid;

alter table public.analytics_events
  drop constraint if exists analytics_events_event_id_key;

alter table public.analytics_events
  add constraint analytics_events_event_id_key unique (event_id);

alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

-- Keep this list aligned with lib/analytics/events.ts; tests enforce the contract.
alter table public.analytics_events
  add constraint analytics_events_event_name_check check (event_name in (
    'page_view', 'session_start',
    'content_open', 'content_start', 'content_progress', 'content_complete', 'content_exit',
    'language_changed', 'share_clicked', 'external_link_clicked', 'error_seen',
    'studio_open', 'studio_cta_clicked', 'studio_project_created', 'studio_media_added',
    'studio_sticker_added', 'studio_export_started', 'studio_export_completed',
    'studio_export_failed', 'studio_recording_started', 'studio_recording_completed',
    'studio_recording_failed', 'cat_question_opened', 'cat_question_completed',
    'raccoon_map_opened', 'country_opened', 'recipe_opened', 'recipe_steps_viewed',
    'dog_lesson_opened', 'dog_lesson_completed', 'parrot_music_opened',
    'parrot_audio_created', 'bedtime_story_opened', 'bedtime_story_completed',
    'page_viewed', 'story_opened', 'story_completed', 'map_opened', 'video_exported',
    'project_created', 'short_opened', 'story_downloaded', 'shop_view', 'product_view'
  ));

alter table public.analytics_events
  drop constraint if exists analytics_events_entity_type_check;

alter table public.analytics_events
  add constraint analytics_events_entity_type_check check (entity_type is null or entity_type in (
    'page', 'story', 'book', 'recipe', 'map', 'studio_project', 'video', 'short', 'shop_product'
  ));

create or replace function public.analytics_report_v2(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
set timezone = 'UTC'
as $$
with base as (
  select
    event_id,
    event_name,
    coalesce(anonymous_user_id, visitor_id) as user_id,
    session_id,
    coalesce(current_page, page, properties->>'current_page') as current_page,
    coalesce(section, properties->>'section', 'unknown') as section,
    coalesce(language, lang, properties->>'language', 'unknown') as language,
    coalesce(content_id, properties->>'content_id', entity_id, current_page, page) as content_key,
    coalesce(content_title, properties->>'content_title', entity_title, current_page, page, 'Unknown content') as content_title,
    created_at
  from public.analytics_events
  where created_at >= p_from and created_at < p_to
),
session_rollup as (
  select
    session_id,
    count(*) filter (where event_name in ('page_view', 'page_viewed')) as page_views,
    count(*) filter (where event_name in (
      'content_open', 'content_progress', 'content_complete', 'language_changed',
      'share_clicked', 'external_link_clicked', 'studio_cta_clicked', 'studio_open',
      'studio_project_created', 'studio_media_added', 'studio_sticker_added',
      'studio_export_started', 'studio_export_completed', 'studio_export_failed',
      'studio_recording_started', 'studio_recording_completed', 'studio_recording_failed',
      'shop_view', 'product_view', 'cat_question_opened', 'raccoon_map_opened',
      'country_opened', 'recipe_opened', 'recipe_steps_viewed', 'cat_question_completed',
      'dog_lesson_opened', 'dog_lesson_completed', 'parrot_music_opened',
      'parrot_audio_created', 'bedtime_story_opened', 'bedtime_story_completed',
      'story_opened', 'story_completed', 'map_opened', 'project_created',
      'video_exported', 'short_opened', 'story_downloaded'
    )) as meaningful_interactions,
    extract(epoch from max(created_at) - min(created_at)) as duration_seconds
  from base
  where session_id is not null
  group by session_id
),
content_open_events as (
  select * from base where event_name = 'content_open'
  union all
  select legacy.*
  from base legacy
  where legacy.event_name in (
    'story_opened', 'recipe_opened', 'map_opened', 'cat_question_opened',
    'raccoon_map_opened', 'country_opened', 'dog_lesson_opened',
    'parrot_music_opened', 'bedtime_story_opened'
  )
  and not exists (
    select 1 from base canonical
    where canonical.event_name = 'content_open'
      and coalesce(canonical.session_id::text, canonical.user_id::text) = coalesce(legacy.session_id::text, legacy.user_id::text)
      and canonical.content_key = legacy.content_key
      and abs(extract(epoch from canonical.created_at - legacy.created_at)) <= 10
  )
),
content_complete_events as (
  select * from base where event_name = 'content_complete'
  union all
  select legacy.*
  from base legacy
  where legacy.event_name in (
    'story_completed', 'cat_question_completed', 'dog_lesson_completed', 'bedtime_story_completed'
  )
  and not exists (
    select 1 from base canonical
    where canonical.event_name = 'content_complete'
      and coalesce(canonical.session_id::text, canonical.user_id::text) = coalesce(legacy.session_id::text, legacy.user_id::text)
      and canonical.content_key = legacy.content_key
      and abs(extract(epoch from canonical.created_at - legacy.created_at)) <= 10
  )
),
content_opens as (
  select distinct
    concat(coalesce(session_id::text, user_id::text), ':', content_key) as attempt_key,
    content_key,
    max(content_title) over (partition by content_key) as content_title,
    max(section) over (partition by content_key) as section
  from content_open_events
  where true
    and coalesce(session_id::text, user_id::text) is not null
    and content_key is not null
),
content_completes as (
  select distinct concat(coalesce(session_id::text, user_id::text), ':', content_key) as attempt_key
  from content_complete_events
  where true
    and coalesce(session_id::text, user_id::text) is not null
    and content_key is not null
),
content_rollup as (
  select
    o.content_key,
    max(o.content_title) as content_title,
    max(o.section) as section,
    count(*)::integer as opens,
    count(c.attempt_key)::integer as completions
  from content_opens o
  left join content_completes c using (attempt_key)
  group by o.content_key
),
page_rollup as (
  select
    current_page as page,
    max(content_title) as title,
    count(*)::integer as views,
    count(distinct user_id)::integer as visitors
  from base
  where event_name in ('page_view', 'page_viewed') and current_page is not null
  group by current_page
),
section_rollup as (
  select section, count(*)::integer as count from base group by section
),
language_rollup as (
  select language, count(*)::integer as count from base group by language
),
event_rollup as (
  select event_name, count(*)::integer as count from base group by event_name
),
totals as (
  select
    count(distinct user_id)::integer as visitors,
    count(distinct session_id)::integer as sessions,
    count(*)::integer as events,
    count(*) filter (where event_name in ('page_view', 'page_viewed'))::integer as page_views,
    count(*) filter (where event_name = 'studio_open')::integer as studio_opens,
    count(*) filter (where event_name in ('studio_project_created', 'project_created'))::integer as projects_created,
    count(*) filter (where event_name in ('studio_export_completed', 'video_exported'))::integer as successful_exports,
    count(*) filter (where event_name = 'studio_export_failed')::integer as failed_exports,
    count(*) filter (where event_name = 'studio_recording_completed')::integer as successful_recordings,
    count(*) filter (where event_name = 'studio_recording_failed')::integer as failed_recordings,
    count(*) filter (where session_id is null)::integer as events_without_session_id,
    count(*) filter (where user_id is null)::integer as events_without_user_id,
    count(*) filter (where event_id is null)::integer as events_without_event_id
  from base
),
content_totals as (
  select
    coalesce(sum(opens), 0)::integer as opens,
    coalesce(sum(completions), 0)::integer as completions
  from content_rollup
),
session_totals as (
  select
    count(*) filter (where page_views > 0)::integer as page_sessions,
    count(*) filter (where page_views = 1 and meaningful_interactions = 0)::integer as bounced_sessions,
    round(avg(duration_seconds))::integer as average_duration_seconds
  from session_rollup
)
select jsonb_build_object(
  'version', 2,
  'period', jsonb_build_object('from', p_from, 'to', p_to, 'timezone', 'UTC'),
  'audience', jsonb_build_object(
    'unique_visitors', totals.visitors,
    'sessions', totals.sessions,
    'page_views', totals.page_views,
    'events', totals.events,
    'average_session_duration_seconds', session_totals.average_duration_seconds,
    'bounce_rate', case when session_totals.page_sessions > 0
      then round(100.0 * session_totals.bounced_sessions / session_totals.page_sessions, 1)
      else null end
  ),
  'engagement', jsonb_build_object(
    'content_opened', content_totals.opens,
    'content_completed', content_totals.completions,
    'completion_rate', case when content_totals.opens > 0
      then round(100.0 * content_totals.completions / content_totals.opens, 1)
      else null end
  ),
  'studio', jsonb_build_object(
    'opened', totals.studio_opens,
    'projects_created', totals.projects_created,
    'successful_exports', totals.successful_exports,
    'failed_exports', totals.failed_exports,
    'successful_recordings', totals.successful_recordings,
    'failed_recordings', totals.failed_recordings
  ),
  'pages', coalesce((select jsonb_agg(to_jsonb(p) order by views desc, page) from page_rollup p), '[]'::jsonb),
  'content', coalesce((select jsonb_agg(
    jsonb_build_object(
      'key', content_key, 'title', content_title, 'section', section,
      'opens', opens, 'completions', completions,
      'completion_rate', case when opens > 0 then round(100.0 * completions / opens, 1) else null end
    ) order by opens desc, content_key
  ) from content_rollup), '[]'::jsonb),
  'sections', coalesce((select jsonb_object_agg(section, count) from section_rollup), '{}'::jsonb),
  'languages', coalesce((select jsonb_object_agg(language, count) from language_rollup), '{}'::jsonb),
  'event_counts', coalesce((select jsonb_object_agg(event_name, count) from event_rollup), '{}'::jsonb),
  'data_quality', jsonb_build_object(
    'status', case when totals.events_without_session_id > 0 or totals.events_without_user_id > 0 then 'data incomplete' else 'data ok' end,
    'truncated', false,
    'events_without_session_id', totals.events_without_session_id,
    'events_without_user_id', totals.events_without_user_id,
    'events_without_event_id', totals.events_without_event_id,
    'missing_expected_events', coalesce((
      select jsonb_agg(expected_name order by expected_name)
      from unnest(array[
        'page_view', 'session_start', 'content_open', 'content_complete',
        'studio_open', 'studio_project_created', 'studio_export_completed',
        'studio_export_failed', 'studio_recording_completed', 'studio_recording_failed'
      ]) as expected(expected_name)
      where not exists (select 1 from base where base.event_name = expected.expected_name)
    ), '[]'::jsonb),
    'skipped_events_observable', false,
    'note', 'Skipped client/API events are not stored in analytics_events and cannot be counted here.'
  )
)
from totals cross join content_totals cross join session_totals;
$$;

revoke all on function public.analytics_report_v2(timestamptz, timestamptz) from public;
grant execute on function public.analytics_report_v2(timestamptz, timestamptz) to service_role;

alter table public.analytics_daily_summary
  add column if not exists studio_opens integer not null default 0,
  add column if not exists studio_export_failures integer not null default 0,
  add column if not exists studio_recording_failures integer not null default 0;

create or replace function public.refresh_analytics_daily_summary(
  p_from date default (current_date - 16),
  p_to date default current_date
)
returns table (refreshed_days integer)
language plpgsql
security definer
set search_path = public
set timezone = 'UTC'
as $$
declare
  v_day date;
  v_report jsonb;
  v_refreshed integer := 0;
begin
  for v_day in select generate_series(p_from, p_to, interval '1 day')::date loop
    v_report := public.analytics_report_v2(
      v_day::timestamp at time zone 'UTC',
      (v_day + 1)::timestamp at time zone 'UTC'
    );
    insert into public.analytics_daily_summary (
      summary_date, visitors, sessions, events, page_views, content_opens, content_completes,
      studio_opens, studio_projects, studio_exports, studio_export_failures,
      studio_recordings, studio_recording_failures, avg_session_duration_seconds,
      sections, languages, event_counts, top_content, data_quality, refreshed_at
    ) values (
      v_day,
      coalesce((v_report #>> '{audience,unique_visitors}')::integer, 0),
      coalesce((v_report #>> '{audience,sessions}')::integer, 0),
      coalesce((v_report #>> '{audience,events}')::integer, 0),
      coalesce((v_report #>> '{audience,page_views}')::integer, 0),
      coalesce((v_report #>> '{engagement,content_opened}')::integer, 0),
      coalesce((v_report #>> '{engagement,content_completed}')::integer, 0),
      coalesce((v_report #>> '{studio,opened}')::integer, 0),
      coalesce((v_report #>> '{studio,projects_created}')::integer, 0),
      coalesce((v_report #>> '{studio,successful_exports}')::integer, 0),
      coalesce((v_report #>> '{studio,failed_exports}')::integer, 0),
      coalesce((v_report #>> '{studio,successful_recordings}')::integer, 0),
      coalesce((v_report #>> '{studio,failed_recordings}')::integer, 0),
      (v_report #>> '{audience,average_session_duration_seconds}')::numeric,
      coalesce(v_report->'sections', '{}'::jsonb),
      coalesce(v_report->'languages', '{}'::jsonb),
      coalesce(v_report->'event_counts', '{}'::jsonb),
      coalesce(v_report->'content', '[]'::jsonb),
      coalesce(v_report->'data_quality', '{}'::jsonb),
      now()
    )
    on conflict (summary_date) do update set
      visitors = excluded.visitors, sessions = excluded.sessions, events = excluded.events,
      page_views = excluded.page_views, content_opens = excluded.content_opens,
      content_completes = excluded.content_completes, studio_opens = excluded.studio_opens,
      studio_projects = excluded.studio_projects, studio_exports = excluded.studio_exports,
      studio_export_failures = excluded.studio_export_failures,
      studio_recordings = excluded.studio_recordings,
      studio_recording_failures = excluded.studio_recording_failures,
      avg_session_duration_seconds = excluded.avg_session_duration_seconds,
      sections = excluded.sections, languages = excluded.languages,
      event_counts = excluded.event_counts, top_content = excluded.top_content,
      data_quality = excluded.data_quality, refreshed_at = excluded.refreshed_at;
    v_refreshed := v_refreshed + 1;
  end loop;
  return query select v_refreshed;
end;
$$;

revoke all on function public.refresh_analytics_daily_summary(date, date) from public;
grant execute on function public.refresh_analytics_daily_summary(date, date) to service_role;
