-- Full-refund evidence is separate from the immutable paid order and receipt ledger.
-- Apply before deploying the Commerce Admin refund endpoint. Never apply automatically.
create table public.commerce_refund_operations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  entitlement_id uuid not null references public.product_entitlements(id) on delete restrict,
  provider_capture_id text not null,
  provider_environment text not null check (provider_environment in ('sandbox', 'live')),
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency = 'ILS'),
  request_id uuid not null unique default gen_random_uuid(),
  status text not null default 'prepared' check (status in (
    'prepared', 'dispatching', 'uncertain', 'provider_pending',
    'provider_confirmed', 'completed', 'failed', 'needs_review'
  )),
  provider_refund_id text unique,
  error_code text,
  accounting_status text not null check (accounting_status in ('not_required', 'pending_manual')),
  provider_confirmed_at timestamptz,
  access_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refund_provider_id_check check (provider_refund_id is null or provider_refund_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  constraint refund_capture_id_check check (provider_capture_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  constraint refund_error_code_check check (error_code is null or error_code ~ '^[a-z0-9_.-]{1,80}$'),
  constraint refund_accounting_environment_check check (
    (provider_environment = 'sandbox' and accounting_status = 'not_required')
    or (provider_environment = 'live' and accounting_status = 'pending_manual')
  ),
  constraint refund_provider_confirmed_state_check check (
    status not in ('provider_confirmed', 'completed')
    or (provider_refund_id is not null and provider_confirmed_at is not null)
  ),
  constraint refund_completed_state_check check (status <> 'completed' or (provider_refund_id is not null and access_revoked_at is not null))
);

create index commerce_refund_operations_status_idx
  on public.commerce_refund_operations(status, updated_at);

alter table public.commerce_refund_operations enable row level security;
revoke all on table public.commerce_refund_operations from public, anon, authenticated;
grant select, insert, update on table public.commerce_refund_operations to service_role;

create or replace function public.enforce_commerce_refund_integrity()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.order_id is distinct from old.order_id
     or new.entitlement_id is distinct from old.entitlement_id
     or new.provider_capture_id is distinct from old.provider_capture_id
     or new.provider_environment is distinct from old.provider_environment
     or new.amount_minor is distinct from old.amount_minor
     or new.currency is distinct from old.currency
     or new.request_id is distinct from old.request_id
     or new.accounting_status is distinct from old.accounting_status
     or (old.provider_refund_id is not null and new.provider_refund_id is distinct from old.provider_refund_id)
     or old.status in ('completed', 'failed', 'needs_review') then
    raise exception 'Refund evidence is immutable'
      using errcode = '23514';
  end if;
  if new.status is distinct from old.status and not (
    (old.status = 'prepared' and new.status = 'dispatching')
    or (old.status = 'dispatching' and new.status in
      ('uncertain', 'provider_pending', 'provider_confirmed', 'failed', 'needs_review'))
    or (old.status = 'uncertain' and new.status in
      ('provider_pending', 'provider_confirmed', 'needs_review'))
    or (old.status = 'provider_pending' and new.status in
      ('provider_confirmed', 'needs_review'))
    or (old.status = 'provider_confirmed' and new.status in
      ('completed', 'needs_review'))
  ) then
    raise exception 'Invalid refund status transition: % -> %', old.status, new.status
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_commerce_refund_integrity() from public, anon, authenticated;
grant execute on function public.enforce_commerce_refund_integrity() to service_role;

create trigger commerce_refund_operations_enforce_integrity
  before update on public.commerce_refund_operations
  for each row execute function public.enforce_commerce_refund_integrity();

create trigger commerce_refund_operations_set_updated_at
  before update on public.commerce_refund_operations
  for each row execute function public.set_commerce_record_updated_at();

-- One transaction closes the gap between provider confirmation and revoked access.
-- A newer paid order using this entitlement prevents revocation of a later purchase.
create or replace function public.complete_commerce_full_refund(target_operation_id uuid)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  operation public.commerce_refund_operations;
  linked_order public.orders;
  linked_item public.order_items;
  current_access public.product_entitlements;
begin
  select * into operation from public.commerce_refund_operations
    where id = target_operation_id for update;
  if not found then return 'not_found'; end if;
  if operation.status = 'completed' then return 'already_completed'; end if;
  if operation.status <> 'provider_confirmed' or operation.provider_refund_id is null
     or operation.provider_confirmed_at is null then
    return 'provider_not_confirmed';
  end if;

  select * into linked_order from public.orders where id = operation.order_id for update;
  if not found then
    update public.commerce_refund_operations set status = 'needs_review', error_code = 'order_missing'
      where id = operation.id;
    return 'needs_review';
  end if;
  select * into linked_item from public.order_items where order_id = operation.order_id;
  if not found or linked_order.status <> 'paid'
     or linked_order.provider_capture_id is distinct from operation.provider_capture_id
     or linked_order.total_minor <> operation.amount_minor or linked_order.currency <> operation.currency
     or linked_item.entitlement_id is distinct from operation.entitlement_id then
    update public.commerce_refund_operations set status = 'needs_review', error_code = 'order_mismatch'
      where id = operation.id;
    return 'needs_review';
  end if;

  select * into current_access from public.product_entitlements
    where id = operation.entitlement_id for update;
  if not found or current_access.user_id <> linked_order.user_id
     or current_access.product_id <> linked_item.product_id then
    update public.commerce_refund_operations set status = 'needs_review', error_code = 'entitlement_mismatch'
      where id = operation.id;
    return 'needs_review';
  end if;

  if exists (
    select 1 from public.order_items newer_item
    join public.orders newer_order on newer_order.id = newer_item.order_id
    where newer_item.entitlement_id = operation.entitlement_id
      and newer_order.id <> operation.order_id
      and newer_order.status = 'paid'
      and newer_order.paid_at > linked_order.paid_at
      and not exists (
        select 1 from public.commerce_refund_operations newer_refund
        where newer_refund.order_id = newer_order.id and newer_refund.status = 'completed'
      )
  ) then
    update public.commerce_refund_operations set status = 'needs_review', error_code = 'newer_purchase'
      where id = operation.id;
    return 'needs_review';
  end if;

  if current_access.status = 'active' then
    update public.product_entitlements set status = 'refunded'
      where id = operation.entitlement_id;
  elsif current_access.status <> 'refunded' then
    update public.commerce_refund_operations set status = 'needs_review', error_code = 'access_state_mismatch'
      where id = operation.id;
    return 'needs_review';
  end if;

  update public.commerce_refund_operations
    set status = 'completed', access_revoked_at = now(), error_code = null
    where id = operation.id;
  return 'completed';
end;
$$;

revoke all on function public.complete_commerce_full_refund(uuid) from public, anon, authenticated;
grant execute on function public.complete_commerce_full_refund(uuid) to service_role;
