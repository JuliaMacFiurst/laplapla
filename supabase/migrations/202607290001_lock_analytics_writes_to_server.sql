-- Analytics ingestion is performed by /api/analytics/event with the service role.
-- Public clients must not be able to bypass API validation or rate limiting.
drop policy if exists "Public clients can insert safe analytics events"
  on public.analytics_events;

revoke insert on table public.analytics_events from anon;
revoke insert on table public.analytics_events from authenticated;

grant select, insert, update, delete on table public.analytics_events
  to service_role;
