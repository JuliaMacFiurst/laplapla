#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_root="$(mktemp -d "${TMPDIR:-/tmp}/laplapla-analytics-v2.XXXXXX")"
data_dir="$test_root/data"
socket_dir="$test_root/socket"
port="$((50000 + RANDOM % 10000))"

cleanup() {
  if [[ -f "$data_dir/postmaster.pid" ]]; then
    pg_ctl -D "$data_dir" stop -m fast >/dev/null 2>&1 || true
  fi
  case "$test_root" in
    "${TMPDIR:-/tmp}"/laplapla-analytics-v2.*) rm -rf -- "$test_root" ;;
    *) printf 'Refusing to remove unexpected test path: %s\n' "$test_root" >&2 ;;
  esac
}
trap cleanup EXIT

for command in initdb pg_ctl psql; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Required PostgreSQL command is unavailable: %s\n' "$command" >&2
    exit 1
  fi
done

mkdir -p "$socket_dir"
initdb -D "$data_dir" --auth=trust --encoding=UTF8 --no-locale >/dev/null
pg_ctl -D "$data_dir" -l "$test_root/postgres.log" -o "-k $socket_dir -p $port" start >/dev/null

psql_local=(psql -X -v ON_ERROR_STOP=1 -h "$socket_dir" -p "$port" -d postgres)

"${psql_local[@]}" -c "create role anon; create role authenticated; create role service_role;" >/dev/null

# Reproduce the production named default grants. The historical migrations only
# revoked PUBLIC, which left these direct role grants effective.
"${psql_local[@]}" -c "alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;" >/dev/null

historical_migrations=(
  "supabase/migrations/202606020001_create_meme_engine_cache.sql"
  "supabase/migrations/202606020002_add_meme_engine_cache_cleanup.sql"
  "supabase/migrations/202606090001_create_analytics_events.sql"
  "supabase/migrations/202606090002_add_analytics_events_cleanup.sql"
  "supabase/migrations/202606170001_expand_analytics_events.sql"
  "supabase/migrations/202606180001_create_analytics_daily_summary.sql"
  "supabase/migrations/202607290001_lock_analytics_writes_to_server.sql"
)

for migration in "${historical_migrations[@]}"; do
  "${psql_local[@]}" -f "$repo_root/$migration" >/dev/null
done

# One row for every event accepted by the immediately preceding production schema.
"${psql_local[@]}" -c "
  insert into public.analytics_events(event_name, entity_type, properties, created_at)
  select event_name, entity_type, '{}'::jsonb, '2026-09-29T12:00:00Z'
  from unnest(array[
    'page_view','session_start','content_open','content_start','content_progress',
    'content_complete','content_exit','language_changed','share_clicked',
    'external_link_clicked','error_seen','studio_open','studio_project_created',
    'studio_media_added','studio_sticker_added','studio_export_started',
    'studio_export_completed','studio_export_failed','studio_recording_started',
    'studio_recording_completed','studio_recording_failed','cat_question_opened',
    'cat_question_completed','raccoon_map_opened','country_opened','recipe_opened',
    'recipe_steps_viewed','dog_lesson_opened','dog_lesson_completed',
    'parrot_music_opened','parrot_audio_created','bedtime_story_opened',
    'bedtime_story_completed','page_viewed','story_opened','story_completed',
    'map_opened','video_exported','project_created','short_opened','story_downloaded'
  ]) with ordinality as events(event_name, ordinal)
  left join lateral (
    select (array['page','story','book','recipe','map','studio_project','video','short'])[ordinal] as entity_type
  ) entity on ordinal <= 8;
" >/dev/null

"${psql_local[@]}" -f "$repo_root/supabase/migrations/202609300001_analytics_v2_foundation.sql" >/dev/null

# Prove the disposable schema reproduces the production exposure before the
# reconciliation is applied.
"${psql_local[@]}" -c "
  do \$\$
  begin
    assert has_function_privilege('anon', 'public.cleanup_analytics_events(interval)', 'EXECUTE');
    assert has_function_privilege('authenticated', 'public.cleanup_meme_engine_cache(interval,integer)', 'EXECUTE');
    assert has_function_privilege('anon', 'public.refresh_analytics_daily_summary(date,date)', 'EXECUTE');
    assert has_function_privilege('authenticated', 'public.analytics_report_v2(timestamp with time zone,timestamp with time zone)', 'EXECUTE');
  end;
  \$\$;
" >/dev/null

"${psql_local[@]}" -f "$repo_root/supabase/migrations/202609300002_restrict_internal_rpc_execute.sql" >/dev/null
"${psql_local[@]}" -f "$repo_root/supabase/migrations/202609300004_add_preorder_analytics_events.sql" >/dev/null
"${psql_local[@]}" -f "$repo_root/tests/sql/analyticsSecurityReconciliation.sql"
"${psql_local[@]}" -f "$repo_root/tests/sql/analyticsV2Regression.sql"

printf 'Analytics v2 migration SQL regression checks passed.\n'
