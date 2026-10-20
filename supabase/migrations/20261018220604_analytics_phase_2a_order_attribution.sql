alter table public.orders
  add column attribution_snapshot jsonb null,
  add constraint orders_attribution_snapshot_check check (
    attribution_snapshot is null
    or (
      jsonb_typeof(attribution_snapshot) = 'object'
      and attribution_snapshot @> '{"version": 1}'::jsonb
      and jsonb_typeof(attribution_snapshot -> 'first_touch') = 'object'
      and jsonb_typeof(attribution_snapshot -> 'session_touch') = 'object'
      and jsonb_typeof(attribution_snapshot -> 'visitor_id') = 'string'
      and jsonb_typeof(attribution_snapshot -> 'session_id') = 'string'
      and octet_length(attribution_snapshot::text) <= 8192
    )
  );

comment on column public.orders.attribution_snapshot is
  'Immutable privacy-safe acquisition snapshot captured at local checkout creation; retained with commerce history independently of analytics event cleanup.';

create index orders_paid_attribution_source_idx
  on public.orders (
    provider_environment,
    status,
    (attribution_snapshot #>> '{first_touch,source}'),
    paid_at desc
  )
  where attribution_snapshot is not null;

create or replace function public.enforce_commerce_order_integrity()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if row(
    new.user_id, new.provider, new.currency, new.total_minor,
    new.checkout_idempotency_key, new.paypal_create_request_id,
    new.paypal_capture_request_id, new.customer_name_snapshot,
    new.customer_email_snapshot, new.provider_environment, new.created_at
  ) is distinct from row(
    old.user_id, old.provider, old.currency, old.total_minor,
    old.checkout_idempotency_key, old.paypal_create_request_id,
    old.paypal_capture_request_id, old.customer_name_snapshot,
    old.customer_email_snapshot, old.provider_environment, old.created_at
  ) then
    raise exception 'Immutable order fields cannot be changed';
  end if;

  if old.attribution_snapshot is not null
    and new.attribution_snapshot is distinct from old.attribution_snapshot
  then
    raise exception 'Order attribution snapshot cannot be changed';
  end if;

  if old.provider_order_id is not null and new.provider_order_id is distinct from old.provider_order_id then
    raise exception 'Provider order id cannot be changed';
  end if;
  if old.provider_capture_id is not null and new.provider_capture_id is distinct from old.provider_capture_id then
    raise exception 'Provider capture id cannot be changed';
  end if;
  if old.paid_at is not null and new.paid_at is distinct from old.paid_at then
    raise exception 'Paid timestamp cannot be changed';
  end if;
  if new.status is distinct from old.status and not (
    (old.status = 'creating' and new.status in ('pending_approval', 'cancelled', 'failed'))
    or (old.status = 'pending_approval' and new.status in ('capture_pending', 'paid', 'cancelled', 'failed'))
    or (old.status = 'capture_pending' and new.status in ('paid', 'cancelled', 'failed'))
  ) then
    raise exception 'Invalid order status transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;

create function public.attach_commerce_order_attribution_once(
  target_order_id uuid,
  target_user_id uuid,
  target_attribution_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  commerce_order public.orders;
begin
  if target_order_id is null or target_user_id is null then
    raise exception 'Order and customer are required';
  end if;
  if target_attribution_snapshot is null then
    raise exception 'Attribution snapshot is required';
  end if;

  select * into commerce_order
  from public.orders
  where id = target_order_id and user_id = target_user_id
  for update;

  if not found then
    raise exception 'Commerce order not found';
  end if;

  if commerce_order.attribution_snapshot is null then
    update public.orders
    set attribution_snapshot = target_attribution_snapshot
    where id = commerce_order.id
    returning * into commerce_order;
  end if;

  return commerce_order.attribution_snapshot;
end;
$$;

revoke all on function public.attach_commerce_order_attribution_once(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.attach_commerce_order_attribution_once(uuid, uuid, jsonb)
  to service_role;

comment on function public.attach_commerce_order_attribution_once(uuid, uuid, jsonb) is
  'Server-only idempotent order attribution attachment. A non-null snapshot is returned unchanged on checkout retry or resume.';
