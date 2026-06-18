create table if not exists public.analytics_daily_summary (
  summary_date date primary key,
  visitors integer not null default 0,
  sessions integer not null default 0,
  events integer not null default 0,
  page_views integer not null default 0,
  content_opens integer not null default 0,
  content_completes integer not null default 0,
  studio_projects integer not null default 0,
  studio_exports integer not null default 0,
  avg_session_duration_seconds numeric,
  sections jsonb not null default '{}'::jsonb,
  languages jsonb not null default '{}'::jsonb,
  event_counts jsonb not null default '{}'::jsonb,
  top_content jsonb not null default '[]'::jsonb,
  data_quality jsonb not null default '{}'::jsonb,
  refreshed_at timestamptz not null default now()
);

alter table public.analytics_daily_summary enable row level security;

revoke all on table public.analytics_daily_summary from anon;
revoke all on table public.analytics_daily_summary from authenticated;
grant select, insert, update, delete on table public.analytics_daily_summary to service_role;

create index if not exists analytics_daily_summary_refreshed_idx
  on public.analytics_daily_summary(refreshed_at desc);

create or replace function public.refresh_analytics_daily_summary(
  p_from date default (current_date - 16),
  p_to date default current_date
)
returns table (
  refreshed_days integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refreshed_days integer := 0;
begin
  delete from public.analytics_daily_summary
  where summary_date between p_from and p_to;

  with event_rows as (
    select
      created_at::date as summary_date,
      event_name,
      coalesce(section, properties->>'section', entity_type, 'unknown') as resolved_section,
      coalesce(language, lang, properties->>'language', 'unknown') as resolved_language,
      coalesce(content_id, properties->>'content_id', entity_id, page, 'unknown') as resolved_content_id,
      coalesce(content_title, properties->>'content_title', entity_title, page, 'Unknown content') as resolved_content_title,
      coalesce(anonymous_user_id, visitor_id) as resolved_user_id,
      session_id,
      duration_seconds,
      created_at
    from public.analytics_events
    where created_at::date between p_from and p_to
  ),
  daily as (
    select
      summary_date,
      count(distinct resolved_user_id) filter (where resolved_user_id is not null) as visitors,
      count(distinct session_id) filter (where session_id is not null) as sessions,
      count(*) as events,
      count(*) filter (where event_name in ('page_view', 'page_viewed')) as page_views,
      count(*) filter (where event_name in (
        'content_open',
        'story_opened',
        'recipe_opened',
        'map_opened',
        'cat_question_opened',
        'raccoon_map_opened',
        'country_opened',
        'dog_lesson_opened',
        'parrot_music_opened',
        'bedtime_story_opened'
      )) as content_opens,
      count(*) filter (where event_name in (
        'content_complete',
        'story_completed',
        'cat_question_completed',
        'dog_lesson_completed',
        'bedtime_story_completed'
      )) as content_completes,
      count(*) filter (where event_name in ('studio_project_created', 'project_created')) as studio_projects,
      count(*) filter (where event_name in ('studio_export_completed', 'video_exported')) as studio_exports,
      avg(duration_seconds) filter (where duration_seconds is not null and duration_seconds >= 0) as avg_session_duration_seconds
    from event_rows
    group by summary_date
  ),
  section_counts as (
    select summary_date, jsonb_object_agg(resolved_section, event_count order by event_count desc) as sections
    from (
      select summary_date, resolved_section, count(*) as event_count
      from event_rows
      group by summary_date, resolved_section
    ) grouped
    group by summary_date
  ),
  language_counts as (
    select summary_date, jsonb_object_agg(resolved_language, event_count order by event_count desc) as languages
    from (
      select summary_date, resolved_language, count(*) as event_count
      from event_rows
      group by summary_date, resolved_language
    ) grouped
    group by summary_date
  ),
  event_counts as (
    select summary_date, jsonb_object_agg(event_name, event_count order by event_count desc) as event_counts
    from (
      select summary_date, event_name, count(*) as event_count
      from event_rows
      group by summary_date, event_name
    ) grouped
    group by summary_date
  ),
  top_content as (
    select summary_date, jsonb_agg(item order by opens desc) as top_content
    from (
      select
        summary_date,
        jsonb_build_object(
          'content_id', resolved_content_id,
          'content_title', max(resolved_content_title),
          'opens', count(*) filter (where event_name in (
            'content_open',
            'story_opened',
            'recipe_opened',
            'cat_question_opened',
            'country_opened',
            'dog_lesson_opened',
            'bedtime_story_opened'
          )),
          'completes', count(*) filter (where event_name in (
            'content_complete',
            'story_completed',
            'cat_question_completed',
            'dog_lesson_completed',
            'bedtime_story_completed'
          ))
        ) as item,
        count(*) filter (where event_name in (
          'content_open',
          'story_opened',
          'recipe_opened',
          'cat_question_opened',
          'country_opened',
          'dog_lesson_opened',
          'bedtime_story_opened'
        )) as opens
      from event_rows
      where resolved_content_id <> 'unknown'
      group by summary_date, resolved_content_id
      having count(*) filter (where event_name in (
        'content_open',
        'story_opened',
        'recipe_opened',
        'cat_question_opened',
        'country_opened',
        'dog_lesson_opened',
        'bedtime_story_opened'
      )) > 0
    ) ranked
    group by summary_date
  ),
  data_quality as (
    select
      summary_date,
      jsonb_build_object(
        'events_without_session_id', count(*) filter (where session_id is null),
        'events_without_user_id', count(*) filter (where resolved_user_id is null),
        'content_events_without_title', count(*) filter (
          where event_name like '%open%' and nullif(resolved_content_title, 'Unknown content') is null
        ),
        'duration_events', count(*) filter (where duration_seconds is not null)
      ) as data_quality
    from event_rows
    group by summary_date
  )
  insert into public.analytics_daily_summary (
    summary_date,
    visitors,
    sessions,
    events,
    page_views,
    content_opens,
    content_completes,
    studio_projects,
    studio_exports,
    avg_session_duration_seconds,
    sections,
    languages,
    event_counts,
    top_content,
    data_quality,
    refreshed_at
  )
  select
    daily.summary_date,
    daily.visitors::integer,
    daily.sessions::integer,
    daily.events::integer,
    daily.page_views::integer,
    daily.content_opens::integer,
    daily.content_completes::integer,
    daily.studio_projects::integer,
    daily.studio_exports::integer,
    daily.avg_session_duration_seconds,
    coalesce(section_counts.sections, '{}'::jsonb),
    coalesce(language_counts.languages, '{}'::jsonb),
    coalesce(event_counts.event_counts, '{}'::jsonb),
    coalesce(top_content.top_content, '[]'::jsonb),
    coalesce(data_quality.data_quality, '{}'::jsonb),
    now()
  from daily
  left join section_counts using (summary_date)
  left join language_counts using (summary_date)
  left join event_counts using (summary_date)
  left join top_content using (summary_date)
  left join data_quality using (summary_date);

  get diagnostics v_refreshed_days = row_count;
  return query select v_refreshed_days;
end;
$$;

revoke all on function public.refresh_analytics_daily_summary(date, date) from public;
grant execute on function public.refresh_analytics_daily_summary(date, date) to service_role;
