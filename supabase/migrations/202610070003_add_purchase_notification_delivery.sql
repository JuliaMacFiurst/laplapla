create table public.purchase_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  channel text not null default 'discord_purchases' check (channel = 'discord_purchases'),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  claimed_at timestamptz null,
  claim_token uuid null,
  delivered_at timestamptz null,
  discord_message_id text null,
  last_failure_code text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (status = 'sent' and delivered_at is not null and discord_message_id is not null)
    or status <> 'sent'
  )
);

create index purchase_notifications_recovery_idx
  on public.purchase_notifications (status, created_at)
  where status <> 'sent';

alter table public.purchase_notifications enable row level security;
revoke all on table public.purchase_notifications from public, anon, authenticated;
grant select on table public.purchase_notifications to service_role;

create function public.register_live_order_purchase_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.provider_environment = 'live' then
    insert into public.purchase_notifications (order_id) values (new.id)
    on conflict (order_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger register_live_order_purchase_notification_after_insert
  after insert on public.orders
  for each row execute function public.register_live_order_purchase_notification();

create function public.claim_paid_order_purchase_notification(target_order_id uuid)
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
  if target_order.provider_environment <> 'live' then
    return query select case when target_order.provider_environment = 'sandbox' then 'sandbox_order' else 'unknown_environment' end,
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
  if target_notification.status = 'processing'
    and target_notification.claimed_at > timezone('utc', now()) - interval '10 minutes'
  then
    return query select 'processing'::text, target_notification.id, null::uuid, null::text, null::integer,
      null::text, null::text, null::timestamptz, null::text;
    return;
  end if;

  select * into target_item from public.order_items where order_id = target_order_id;
  if not found or target_item.product_title_snapshot is null then
    return query select 'invalid_order_snapshot'::text, target_notification.id, null::uuid, null::text, null::integer,
      null::text, null::text, null::timestamptz, null::text;
    return;
  end if;

  update public.purchase_notifications set
    status = 'processing',
    attempt_count = attempt_count + 1,
    claimed_at = timezone('utc', now()),
    claim_token = gen_random_uuid(),
    last_failure_code = null,
    updated_at = timezone('utc', now())
  where id = target_notification.id;

  select * into target_notification from public.purchase_notifications where id = target_notification.id;
  return query select 'claimed'::text, target_notification.id, target_notification.claim_token,
    target_item.product_title_snapshot, target_order.total_minor, target_order.currency,
    target_order.provider, target_order.paid_at, target_item.price_source;
end;
$$;

create function public.complete_purchase_notification(
  target_notification_id uuid,
  target_claim_token uuid,
  target_discord_message_id text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if target_discord_message_id is null or char_length(target_discord_message_id) not between 1 and 128 then
    raise exception 'A valid Discord message id is required';
  end if;
  update public.purchase_notifications set
    status = 'sent',
    delivered_at = timezone('utc', now()),
    discord_message_id = target_discord_message_id,
    last_failure_code = null,
    updated_at = timezone('utc', now())
  where id = target_notification_id and status = 'processing' and claim_token = target_claim_token;
  return case when found then 'sent' else 'not_processing' end;
end;
$$;

create function public.fail_purchase_notification(
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
  update public.purchase_notifications set
    status = 'failed',
    claimed_at = null,
    claim_token = null,
    last_failure_code = target_failure_code,
    updated_at = timezone('utc', now())
  where id = target_notification_id and status = 'processing' and claim_token = target_claim_token;
  return case when found then 'failed' else 'not_processing' end;
end;
$$;

create function public.list_purchase_notification_recovery_candidates(target_limit integer default 25)
returns table (order_id uuid)
language sql
security definer
set search_path = public, pg_temp
as $$
  select notification.order_id
  from public.purchase_notifications notification
  join public.orders commerce_order on commerce_order.id = notification.order_id
  where commerce_order.status = 'paid'
    and commerce_order.provider_environment = 'live'
    and (
      notification.status in ('pending', 'failed')
      or (
        notification.status = 'processing'
        and notification.claimed_at <= timezone('utc', now()) - interval '10 minutes'
      )
    )
  order by commerce_order.paid_at asc nulls last, notification.created_at asc
  limit least(greatest(coalesce(target_limit, 25), 1), 25);
$$;

revoke all on function public.register_live_order_purchase_notification() from public, anon, authenticated, service_role;
revoke all on function public.claim_paid_order_purchase_notification(uuid) from public, anon, authenticated;
revoke all on function public.complete_purchase_notification(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.fail_purchase_notification(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.list_purchase_notification_recovery_candidates(integer) from public, anon, authenticated;
grant execute on function public.claim_paid_order_purchase_notification(uuid) to service_role;
grant execute on function public.complete_purchase_notification(uuid, uuid, text) to service_role;
grant execute on function public.fail_purchase_notification(uuid, uuid, text) to service_role;
grant execute on function public.list_purchase_notification_recovery_candidates(integer) to service_role;
