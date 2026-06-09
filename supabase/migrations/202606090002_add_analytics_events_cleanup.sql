create or replace function public.cleanup_analytics_events(
  p_retention interval default interval '15 days'
)
returns table (
  deleted_events integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count integer := 0;
begin
  delete from public.analytics_events
  where created_at < now() - p_retention;

  get diagnostics v_deleted_count = row_count;

  return query select v_deleted_count;
end;
$$;

revoke all on function public.cleanup_analytics_events(interval) from public;
grant execute on function public.cleanup_analytics_events(interval) to service_role;
