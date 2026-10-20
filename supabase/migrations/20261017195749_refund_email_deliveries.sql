-- Future completed full refunds only. Historical refunds are intentionally not backfilled.
-- Email evidence is separate from PayPal, entitlement and immutable receipt evidence.
create table public.commerce_refund_email_deliveries (
  operation_id uuid primary key references public.commerce_refund_operations(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'accepted', 'failed', 'uncertain')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  claim_token uuid,
  claimed_at timestamptz,
  accepted_at timestamptz,
  provider_email_id text,
  error_code text check (error_code is null or error_code ~ '^[a-z0-9_.-]{1,80}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_refund_email_sending_check check (
    status <> 'sending' or (claim_token is not null and claimed_at is not null)
  ),
  constraint commerce_refund_email_accepted_check check (
    status <> 'accepted' or (accepted_at is not null and provider_email_id is not null)
  )
);

create index commerce_refund_email_recovery_idx
  on public.commerce_refund_email_deliveries(status, created_at)
  where status in ('pending', 'failed');

alter table public.commerce_refund_email_deliveries enable row level security;
revoke all on public.commerce_refund_email_deliveries from public, anon, authenticated;
grant select, insert, update on public.commerce_refund_email_deliveries to service_role;

create function public.register_completed_refund_email()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if old.status is distinct from 'completed' and new.status = 'completed' then
    insert into public.commerce_refund_email_deliveries(operation_id)
      values (new.id) on conflict (operation_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.register_completed_refund_email() from public, anon, authenticated;
grant execute on function public.register_completed_refund_email() to service_role;

create trigger commerce_refund_email_on_completion
  after update of status on public.commerce_refund_operations
  for each row execute function public.register_completed_refund_email();
