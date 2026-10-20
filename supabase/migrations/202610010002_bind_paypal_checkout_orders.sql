create or replace function public.bind_paypal_order_to_commerce_order(
  target_order_id uuid,
  target_provider_order_id text
)
returns table (
  result text,
  bound_order_id uuid,
  order_status text,
  provider_order_id text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  commerce_order public.orders;
begin
  if target_provider_order_id is null
    or char_length(target_provider_order_id) not between 1 and 128 then
    return query select 'invalid_provider_order_id'::text, target_order_id, null::text, null::text;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('paypal:' || target_provider_order_id, 0));

  select *
  into commerce_order
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    return query select 'unknown_order'::text, target_order_id, null::text, null::text;
    return;
  end if;

  if commerce_order.provider <> 'paypal' then
    return query select 'provider_mismatch'::text, commerce_order.id, commerce_order.status,
      commerce_order.provider_order_id;
    return;
  end if;

  if commerce_order.status in ('paid', 'cancelled', 'failed') then
    return query select 'invalid_state'::text, commerce_order.id, commerce_order.status,
      commerce_order.provider_order_id;
    return;
  end if;

  if commerce_order.provider_order_id is not null then
    if commerce_order.provider_order_id = target_provider_order_id
      and commerce_order.status in ('pending_approval', 'capture_pending') then
      return query select 'already_bound'::text, commerce_order.id, commerce_order.status,
        commerce_order.provider_order_id;
      return;
    end if;

    return query select 'provider_order_conflict'::text, commerce_order.id, commerce_order.status,
      commerce_order.provider_order_id;
    return;
  end if;

  if commerce_order.status <> 'creating' then
    return query select 'invalid_state'::text, commerce_order.id, commerce_order.status,
      commerce_order.provider_order_id;
    return;
  end if;

  if exists (
    select 1
    from public.orders as existing_order
    where existing_order.provider = 'paypal'
      and existing_order.provider_order_id = target_provider_order_id
      and existing_order.id <> commerce_order.id
  ) then
    return query select 'provider_order_conflict'::text, commerce_order.id, commerce_order.status,
      commerce_order.provider_order_id;
    return;
  end if;

  update public.orders
  set provider_order_id = target_provider_order_id,
      status = 'pending_approval',
      failure_code = null
  where id = commerce_order.id
  returning * into commerce_order;

  return query select 'bound'::text, commerce_order.id, commerce_order.status,
    commerce_order.provider_order_id;
end;
$$;

create or replace function public.begin_paypal_commerce_order_capture(
  target_order_id uuid,
  target_user_id uuid,
  target_provider_order_id text
)
returns table (
  result text,
  capture_order_id uuid,
  order_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  commerce_order public.orders;
begin
  select *
  into commerce_order
  from public.orders
  where id = target_order_id
    and user_id = target_user_id
  for update;

  if not found then
    return query select 'unknown_order'::text, target_order_id, null::text;
    return;
  end if;

  if commerce_order.provider <> 'paypal' then
    return query select 'provider_mismatch'::text, commerce_order.id, commerce_order.status;
    return;
  end if;

  if target_provider_order_id is null
    or commerce_order.provider_order_id is null
    or target_provider_order_id <> commerce_order.provider_order_id then
    return query select 'provider_order_mismatch'::text, commerce_order.id, commerce_order.status;
    return;
  end if;

  if commerce_order.status = 'paid' then
    return query select 'already_paid'::text, commerce_order.id, commerce_order.status;
    return;
  end if;

  if commerce_order.status = 'capture_pending' then
    return query select 'capture_ready'::text, commerce_order.id, commerce_order.status;
    return;
  end if;

  if commerce_order.status <> 'pending_approval' then
    return query select 'invalid_state'::text, commerce_order.id, commerce_order.status;
    return;
  end if;

  update public.orders
  set status = 'capture_pending',
      failure_code = null
  where id = commerce_order.id
  returning * into commerce_order;

  return query select 'capture_ready'::text, commerce_order.id, commerce_order.status;
end;
$$;

revoke all on function public.bind_paypal_order_to_commerce_order(uuid, text)
  from public, anon, authenticated;
grant execute on function public.bind_paypal_order_to_commerce_order(uuid, text)
  to service_role;

revoke all on function public.begin_paypal_commerce_order_capture(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.begin_paypal_commerce_order_capture(uuid, uuid, text)
  to service_role;
