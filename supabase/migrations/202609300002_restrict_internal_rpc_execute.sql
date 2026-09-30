-- Internal SECURITY DEFINER functions must explicitly revoke browser roles.
-- The project's function default privileges may grant EXECUTE directly to
-- anon/authenticated, so revoking PUBLIC alone is not sufficient.

revoke execute on function public.cleanup_analytics_events(interval) from public;
revoke execute on function public.cleanup_analytics_events(interval) from anon;
revoke execute on function public.cleanup_analytics_events(interval) from authenticated;
grant execute on function public.cleanup_analytics_events(interval) to service_role;

revoke execute on function public.cleanup_meme_engine_cache(interval, integer) from public;
revoke execute on function public.cleanup_meme_engine_cache(interval, integer) from anon;
revoke execute on function public.cleanup_meme_engine_cache(interval, integer) from authenticated;
grant execute on function public.cleanup_meme_engine_cache(interval, integer) to service_role;

revoke execute on function public.refresh_analytics_daily_summary(date, date) from public;
revoke execute on function public.refresh_analytics_daily_summary(date, date) from anon;
revoke execute on function public.refresh_analytics_daily_summary(date, date) from authenticated;
grant execute on function public.refresh_analytics_daily_summary(date, date) to service_role;

revoke execute on function public.analytics_report_v2(timestamptz, timestamptz) from public;
revoke execute on function public.analytics_report_v2(timestamptz, timestamptz) from anon;
revoke execute on function public.analytics_report_v2(timestamptz, timestamptz) from authenticated;
grant execute on function public.analytics_report_v2(timestamptz, timestamptz) to service_role;
