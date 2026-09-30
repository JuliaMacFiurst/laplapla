\set ON_ERROR_STOP on

begin;

-- Empty reports must remain structurally valid.
truncate public.analytics_events, public.analytics_daily_summary;
do $$
declare
  report jsonb;
begin
  report := public.analytics_report_v2('2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z');
  assert (report #>> '{audience,events}')::integer = 0, 'empty events must be zero';
  assert (report #>> '{audience,page_views}')::integer = 0, 'empty page views must be zero';
  assert (report #>> '{engagement,content_opened}')::integer = 0, 'empty content opens must be zero';
  assert (report #>> '{engagement,content_completed}')::integer = 0, 'empty content completions must be zero';
  assert report #> '{engagement,completion_rate}' = 'null'::jsonb, 'empty completion rate must be null';
  assert report->'pages' = '[]'::jsonb, 'empty pages must be an array';
  assert report->'content' = '[]'::jsonb, 'empty content must be an array';
end;
$$;

-- Three independent session attempts for one content item must be 3 / 3 / 100%.
insert into public.analytics_events (
  event_name, event_id, session_id, anonymous_user_id, content_id, content_title, properties, created_at
)
select
  event_name,
  gen_random_uuid(),
  session_id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'content-a',
  'Content A',
  '{}'::jsonb,
  created_at
from (values
  ('content_open',     '00000000-0000-0000-0000-000000000101'::uuid, '2026-09-30T01:00:00Z'::timestamptz),
  ('content_complete', '00000000-0000-0000-0000-000000000101'::uuid, '2026-09-30T01:01:00Z'::timestamptz),
  ('content_open',     '00000000-0000-0000-0000-000000000102'::uuid, '2026-09-30T02:00:00Z'::timestamptz),
  ('content_complete', '00000000-0000-0000-0000-000000000102'::uuid, '2026-09-30T02:01:00Z'::timestamptz),
  ('content_open',     '00000000-0000-0000-0000-000000000103'::uuid, '2026-09-30T03:00:00Z'::timestamptz),
  ('content_complete', '00000000-0000-0000-0000-000000000103'::uuid, '2026-09-30T03:01:00Z'::timestamptz)
) as fixture(event_name, session_id, created_at);

do $$
declare
  report jsonb := public.analytics_report_v2('2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z');
begin
  assert (report #>> '{engagement,content_opened}')::integer = 3, 'three attempts must produce three opens';
  assert (report #>> '{engagement,content_completed}')::integer = 3, 'three matched attempts must produce three completions';
  assert (report #>> '{engagement,completion_rate}')::numeric = 100.0, '3 / 3 must be 100%';
end;
$$;

-- Remove one completion: 3 / 2 / 66.7%.
delete from public.analytics_events
where event_name = 'content_complete'
  and session_id = '00000000-0000-0000-0000-000000000103';

do $$
declare
  report jsonb := public.analytics_report_v2('2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z');
begin
  assert (report #>> '{engagement,content_opened}')::integer = 3, 'open denominator must remain three';
  assert (report #>> '{engagement,content_completed}')::integer = 2, 'two matched attempts must produce two completions';
  assert (report #>> '{engagement,completion_rate}')::numeric = 66.7, '2 / 3 must be 66.7%';
end;
$$;

-- A repeated complete for one attempt and a complete without an open must not increase completions.
insert into public.analytics_events (
  event_name, event_id, session_id, anonymous_user_id, content_id, content_title, properties, created_at
) values
  ('content_complete', gen_random_uuid(), '00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000001', 'content-a', 'Content A', '{}', '2026-09-30T01:02:00Z'),
  ('content_complete', gen_random_uuid(), '00000000-0000-0000-0000-000000000199',
   '00000000-0000-0000-0000-000000000001', 'content-without-open', 'No Open', '{}', '2026-09-30T04:00:00Z');

do $$
declare
  report jsonb := public.analytics_report_v2('2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z');
begin
  assert (report #>> '{engagement,content_opened}')::integer = 3, 'unmatched complete must not create an open';
  assert (report #>> '{engagement,content_completed}')::integer = 2, 'duplicate and unmatched completes must be ignored';
  assert (report #>> '{engagement,completion_rate}')::numeric between 0 and 100, 'completion rate must remain bounded';
end;
$$;

-- Multiple content keys must sum attempts, not count content rows.
insert into public.analytics_events (
  event_name, event_id, session_id, anonymous_user_id, content_id, content_title, properties, created_at
) values
  ('content_open', gen_random_uuid(), '00000000-0000-0000-0000-000000000104',
   '00000000-0000-0000-0000-000000000001', 'content-b', 'Content B', '{}', '2026-09-30T05:00:00Z'),
  ('content_complete', gen_random_uuid(), '00000000-0000-0000-0000-000000000104',
   '00000000-0000-0000-0000-000000000001', 'content-b', 'Content B', '{}', '2026-09-30T05:01:00Z'),
  ('content_open', gen_random_uuid(), '00000000-0000-0000-0000-000000000105',
   '00000000-0000-0000-0000-000000000001', 'content-b', 'Content B', '{}', '2026-09-30T06:00:00Z');

do $$
declare
  report jsonb := public.analytics_report_v2('2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z');
begin
  assert (report #>> '{engagement,content_opened}')::integer = 5, 'attempts across content keys must be summed';
  assert (report #>> '{engagement,content_completed}')::integer = 3, 'matched completions across content keys must be summed';
  assert (report #>> '{engagement,completion_rate}')::numeric = 60.0, '3 / 5 must be 60%';
end;
$$;

-- Required bounce example: legacy and canonical interactions both prevent bounce.
truncate public.analytics_events;
insert into public.analytics_events (
  event_name, event_id, session_id, anonymous_user_id, current_page, content_id, properties, created_at
) values
  ('page_view', gen_random_uuid(), '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '/story', 'story-a', '{}', '2026-09-30T01:00:00Z'),
  ('story_opened', null, '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '/story', 'story-a', '{}', '2026-09-30T01:01:00Z'),
  ('page_view', gen_random_uuid(), '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000002', '/content', 'content-a', '{}', '2026-09-30T02:00:00Z'),
  ('content_open', gen_random_uuid(), '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000002', '/content', 'content-a', '{}', '2026-09-30T02:01:00Z'),
  ('page_view', gen_random_uuid(), '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000003', '/only', null, '{}', '2026-09-30T03:00:00Z');

do $$
declare
  report jsonb := public.analytics_report_v2('2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z');
begin
  assert (report #>> '{audience,bounce_rate}')::numeric = 33.3, 'only the page-only session must bounce';
end;
$$;

-- Every meaningful legacy event from the historical taxonomy must prevent bounce.
truncate public.analytics_events;
do $$
declare
  legacy_event text;
  legacy_session uuid;
begin
  foreach legacy_event in array array[
    'story_opened', 'story_completed', 'recipe_opened', 'map_opened',
    'dog_lesson_opened', 'dog_lesson_completed', 'parrot_music_opened',
    'bedtime_story_opened', 'bedtime_story_completed', 'project_created',
    'video_exported', 'short_opened', 'story_downloaded'
  ] loop
    legacy_session := gen_random_uuid();
    insert into public.analytics_events (
      event_name, event_id, session_id, anonymous_user_id, current_page, content_id, properties, created_at
    ) values
      ('page_view', gen_random_uuid(), legacy_session, gen_random_uuid(), '/legacy', legacy_event, '{}', '2026-09-30T01:00:00Z'),
      (legacy_event, null, legacy_session, gen_random_uuid(), '/legacy', legacy_event, '{}', '2026-09-30T01:01:00Z');
  end loop;
end;
$$;

do $$
declare
  report jsonb := public.analytics_report_v2('2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z');
begin
  assert (report #>> '{audience,bounce_rate}')::numeric = 0.0, 'meaningful legacy sessions must not bounce';
  assert (report #>> '{data_quality,events_without_event_id}')::integer = 13, 'legacy rows without event_id must remain readable';
end;
$$;

-- UTC daily buckets and serialized report periods must not depend on session TimeZone.
truncate public.analytics_events, public.analytics_daily_summary;
insert into public.analytics_events (
  event_name, event_id, session_id, anonymous_user_id, current_page, properties, created_at
) values
  ('page_view', gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), '/before-midnight', '{}', '2026-09-29T22:30:00Z'),
  ('page_view', gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), '/at-midnight', '{}', '2026-09-30T00:00:00Z');

set local time zone 'UTC';
select * from public.refresh_analytics_daily_summary('2026-09-29', '2026-09-30');
create temporary table utc_summary as
select summary_date, events, page_views
from public.analytics_daily_summary
where summary_date between '2026-09-29' and '2026-09-30';
create temporary table timezone_reports (
  timezone_name text primary key,
  report_before jsonb not null,
  report_after jsonb not null
);
insert into timezone_reports values (
  'UTC',
  public.analytics_report_v2('2026-09-29T00:00:00Z', '2026-09-30T00:00:00Z'),
  public.analytics_report_v2('2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z')
);

truncate public.analytics_daily_summary;
set local time zone 'Asia/Jerusalem';
select * from public.refresh_analytics_daily_summary('2026-09-29', '2026-09-30');
insert into timezone_reports values (
  'Asia/Jerusalem',
  public.analytics_report_v2('2026-09-29T00:00:00Z', '2026-09-30T00:00:00Z'),
  public.analytics_report_v2('2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z')
);

do $$
declare
  utc_before jsonb;
  utc_after jsonb;
  jerusalem_before jsonb;
  jerusalem_after jsonb;
begin
  assert not exists (
    (select * from utc_summary except select summary_date, events, page_views from public.analytics_daily_summary)
    union all
    (select summary_date, events, page_views from public.analytics_daily_summary except select * from utc_summary)
  ), 'daily UTC buckets must be timezone-independent';

  assert (select events from public.analytics_daily_summary where summary_date = '2026-09-29') = 1,
    '22:30Z must belong to the September 29 UTC bucket';
  assert (select events from public.analytics_daily_summary where summary_date = '2026-09-30') = 1,
    '00:00Z must belong to the September 30 UTC bucket';

  select report_before, report_after into utc_before, utc_after
  from timezone_reports where timezone_name = 'UTC';
  select report_before, report_after into jerusalem_before, jerusalem_after
  from timezone_reports where timezone_name = 'Asia/Jerusalem';

  assert utc_before = jerusalem_before, 'report before-midnight window must be timezone-independent';
  assert utc_after = jerusalem_after, 'report at-midnight window must be timezone-independent';
  assert (utc_before #>> '{audience,page_views}')::integer = 1, 'UTC day before midnight must contain one page view';
  assert (utc_after #>> '{audience,page_views}')::integer = 1, 'UTC day at midnight must contain one page view';
  assert utc_before #>> '{period,from}' like '%+00:00', 'serialized period start must be UTC';
  assert utc_before #>> '{period,to}' like '%+00:00', 'serialized period end must be UTC';
end;
$$;

-- Report RPC must remain service-role-only.
do $$
begin
  set local role anon;
  begin
    perform public.analytics_report_v2('2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z');
    raise exception 'anon unexpectedly executed analytics_report_v2';
  exception when insufficient_privilege then
    null;
  end;
  reset role;

  set local role authenticated;
  begin
    perform public.analytics_report_v2('2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z');
    raise exception 'authenticated unexpectedly executed analytics_report_v2';
  exception when insufficient_privilege then
    null;
  end;
  reset role;

  set local role service_role;
  perform public.analytics_report_v2('2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z');
  reset role;
end;
$$;

rollback;
