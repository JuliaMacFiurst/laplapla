-- Sandbox purchase documents are test attachments, never accounting receipts.
create table public.sandbox_purchase_email_deliveries (
  order_id uuid primary key references public.orders(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'sending', 'accepted', 'failed', 'uncertain')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  claim_token uuid,
  claimed_at timestamptz,
  accepted_at timestamptz,
  provider_email_id text,
  error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sandbox_purchase_email_accepted_check check (
    status <> 'accepted' or (accepted_at is not null and provider_email_id is not null)
  )
);

create index sandbox_purchase_email_recovery_idx
  on public.sandbox_purchase_email_deliveries (status, created_at)
  where status in ('pending', 'failed');

alter table public.sandbox_purchase_email_deliveries enable row level security;
revoke all on table public.sandbox_purchase_email_deliveries from public, anon, authenticated;
grant select, insert, update on table public.sandbox_purchase_email_deliveries to service_role;

-- Existing Discord delivery evidence remains the single Discord channel for both environments.
alter table public.purchase_notifications drop constraint purchase_notifications_status_check;
alter table public.purchase_notifications add constraint purchase_notifications_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'uncertain'));

-- Keep the historical function/trigger name. Only future sandbox orders are registered;
-- old test purchases are not backfilled or notified by this migration.
create or replace function public.register_live_order_purchase_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.provider_environment in ('live', 'sandbox') then
    insert into public.purchase_notifications (order_id) values (new.id)
    on conflict (order_id) do nothing;
  end if;
  if new.provider_environment = 'sandbox' then
    insert into public.sandbox_purchase_email_deliveries (order_id) values (new.id)
    on conflict (order_id) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.claim_paid_order_purchase_notification(target_order_id uuid)
returns table (
  result text,
  notification_id uuid,
  claim_token uuid,
  product_title text,
  amount_minor integer,
  currency text,
  provider text,
  paid_at timestamptz,
  price_source text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_order public.orders;
  target_item public.order_items;
  target_notification public.purchase_notifications;
begin
  select * into target_order from public.orders where id = target_order_id for update;
  if not found then
    return query select 'order_not_found'::text, null::uuid, null::uuid, null::text, null::integer,
      null::text, null::text, null::timestamptz, null::text;
    return;
  end if;
  if target_order.status <> 'paid' then
    return query select 'order_not_paid'::text, null::uuid, null::uuid, null::text, null::integer,
      null::text, null::text, null::timestamptz, null::text;
    return;
  end if;
  if target_order.provider_environment not in ('live', 'sandbox') or target_order.provider_environment is null then
    return query select 'unknown_environment'::text,
      null::uuid, null::uuid, null::text, null::integer, null::text, null::text, null::timestamptz, null::text;
    return;
  end if;

  select * into target_notification from public.purchase_notifications
    where order_id = target_order_id for update;
  if not found then
    return query select 'not_registered'::text, null::uuid, null::uuid, null::text, null::integer,
      null::text, null::text, null::timestamptz, null::text;
    return;
  end if;
  if target_notification.status = 'sent' then
    return query select 'already_sent'::text, target_notification.id, null::uuid, null::text, null::integer,
      null::text, null::text, null::timestamptz, null::text;
    return;
  end if;
  if target_notification.status = 'uncertain' then
    return query select 'uncertain'::text, target_notification.id, null::uuid, null::text, null::integer,
      null::text, null::text, null::timestamptz, null::text;
    return;
  end if;
  if target_notification.status = 'processing' then
    if target_order.provider_environment = 'sandbox'
      and (target_notification.claimed_at is null
        or target_notification.claimed_at <= timezone('utc', now()) - interval '10 minutes')
    then
      update public.purchase_notifications set
        status = 'uncertain', claim_token = null, last_failure_code = 'claim_timed_out',
        updated_at = timezone('utc', now())
      where id = target_notification.id;
      return query select 'uncertain'::text, target_notification.id, null::uuid, null::text, null::integer,
        null::text, null::text, null::timestamptz, null::text;
      return;
    end if;
    if target_notification.claimed_at > timezone('utc', now()) - interval '10 minutes' then
      return query select 'processing'::text, target_notification.id, null::uuid, null::text, null::integer,
        null::text, null::text, null::timestamptz, null::text;
      return;
    end if;
  end if;

  select * into target_item from public.order_items where order_id = target_order_id;
  if not found or target_item.product_title_snapshot is null then
    return query select 'invalid_order_snapshot'::text, target_notification.id, null::uuid, null::text, null::integer,
      null::text, null::text, null::timestamptz, null::text;
    return;
  end if;
  if target_order.provider_environment = 'sandbox'
    and not exists (
      select 1 from public.product_entitlements entitlement
      where entitlement.id = target_item.entitlement_id
        and entitlement.user_id = target_order.user_id
        and entitlement.product_id = target_item.product_id
        and entitlement.status = 'active'
    )
  then
    return query select 'access_not_active'::text, target_notification.id, null::uuid, null::text, null::integer,
      null::text, null::text, null::timestamptz, null::text;
    return;
  end if;

  update public.purchase_notifications set
    status = 'processing', attempt_count = attempt_count + 1,
    claimed_at = timezone('utc', now()), claim_token = gen_random_uuid(),
    last_failure_code = null, updated_at = timezone('utc', now())
  where id = target_notification.id;

  select * into target_notification from public.purchase_notifications where id = target_notification.id;
  return query select 'claimed'::text, target_notification.id, target_notification.claim_token,
    target_item.product_title_snapshot, target_order.total_minor, target_order.currency,
    target_order.provider, target_order.paid_at, target_item.price_source;
end;
$$;

create function public.mark_sandbox_purchase_notification_uncertain(
  target_notification_id uuid,
  target_claim_token uuid,
  target_failure_code text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if target_failure_code is null or char_length(target_failure_code) not between 1 and 120 then
    raise exception 'A safe failure code is required';
  end if;
  update public.purchase_notifications notification set
    status = 'uncertain', claim_token = null, last_failure_code = target_failure_code,
    updated_at = timezone('utc', now())
  from public.orders commerce_order
  where notification.id = target_notification_id
    and notification.order_id = commerce_order.id
    and commerce_order.provider_environment = 'sandbox'
    and notification.status = 'processing'
    and notification.claim_token = target_claim_token;
  return case when found then 'uncertain' else 'not_processing' end;
end;
$$;

create or replace function public.list_purchase_notification_recovery_candidates(target_limit integer default 25)
returns table (order_id uuid)
language sql
security definer
set search_path = public, pg_temp
as $$
  select notification.order_id
  from public.purchase_notifications notification
  join public.orders commerce_order on commerce_order.id = notification.order_id
  where commerce_order.status = 'paid'
    and (
      (commerce_order.provider_environment = 'live' and (
        notification.status in ('pending', 'failed')
        or (notification.status = 'processing'
          and notification.claimed_at <= timezone('utc', now()) - interval '10 minutes')
      ))
      or (commerce_order.provider_environment = 'sandbox'
        and (notification.status = 'pending'
          or (notification.status = 'failed' and notification.attempt_count < 2)))
    )
  order by commerce_order.paid_at asc nulls last, notification.created_at asc
  limit least(greatest(coalesce(target_limit, 25), 1), 25);
$$;

create function public.list_sandbox_purchase_email_recovery_candidates(target_limit integer default 25)
returns table (order_id uuid)
language sql
security definer
set search_path = public, pg_temp
as $$
  select delivery.order_id
  from public.sandbox_purchase_email_deliveries delivery
  join public.orders commerce_order on commerce_order.id = delivery.order_id
  where commerce_order.status = 'paid'
    and commerce_order.provider_environment = 'sandbox'
    and (delivery.status = 'pending'
      or (delivery.status = 'failed' and delivery.attempt_count < 2))
  order by commerce_order.paid_at asc nulls last, delivery.created_at asc
  limit least(greatest(coalesce(target_limit, 25), 1), 25);
$$;

revoke all on function public.mark_sandbox_purchase_notification_uncertain(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.mark_sandbox_purchase_notification_uncertain(uuid, uuid, text)
  to service_role;
revoke all on function public.list_sandbox_purchase_email_recovery_candidates(integer)
  from public, anon, authenticated;
grant execute on function public.list_sandbox_purchase_email_recovery_candidates(integer)
  to service_role;
