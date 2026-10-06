alter table public.customer_profiles
  add column billing_name text null,
  add constraint customer_profiles_billing_name_length_check
    check (billing_name is null or char_length(billing_name) between 2 and 160);

alter table public.orders
  add column customer_name_snapshot text null,
  add column customer_email_snapshot text null,
  add column provider_environment text null,
  add constraint orders_customer_identity_snapshot_check check (
    (customer_name_snapshot is null and customer_email_snapshot is null)
    or (
      customer_name_snapshot is not null
      and customer_email_snapshot is not null
      and
      char_length(customer_name_snapshot) between 2 and 160
      and char_length(customer_email_snapshot) between 3 and 320
    )
  ),
  add constraint orders_provider_environment_check
    check (provider_environment is null or provider_environment in ('sandbox', 'live'));

create index orders_provider_environment_status_idx
  on public.orders (provider_environment, status, paid_at desc);

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

revoke all on function public.resolve_paypal_commerce_checkout(uuid, text, integer, text, text, text, uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
drop function public.resolve_paypal_commerce_checkout(uuid, text, integer, text, text, text, uuid, uuid, uuid);

revoke all on function public.create_commerce_order(uuid, text, integer, text, text, text, uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
drop function public.create_commerce_order(uuid, text, integer, text, text, text, uuid, uuid, uuid);

create function public.create_commerce_order(
  target_user_id uuid,
  target_product_id text,
  target_total_minor integer,
  target_currency text,
  target_price_source text,
  target_offer_code text,
  target_checkout_idempotency_key uuid,
  target_paypal_create_request_id uuid,
  target_paypal_capture_request_id uuid,
  target_customer_name_snapshot text,
  target_customer_email_snapshot text,
  target_provider_environment text
)
returns table (
  order_id uuid, order_item_id uuid, created boolean, order_status text,
  total_minor integer, currency text, price_source text, offer_code text,
  paypal_create_request_id uuid, paypal_capture_request_id uuid,
  customer_name_snapshot text, customer_email_snapshot text, provider_environment text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  commerce_order public.orders;
  commerce_item public.order_items;
  order_created boolean := false;
begin
  if target_user_id is null then raise exception 'A customer is required'; end if;
  if target_product_id is null or char_length(target_product_id) not between 1 and 120 then raise exception 'A valid product id is required'; end if;
  if target_total_minor is null or target_total_minor <= 0 then raise exception 'A valid order total is required'; end if;
  if target_currency <> 'ILS' then raise exception 'Unsupported order currency'; end if;
  if target_price_source not in ('catalog', 'preorder') then raise exception 'Unsupported price source'; end if;
  if (target_price_source = 'catalog' and target_offer_code is not null)
    or (target_price_source = 'preorder' and (target_offer_code is null or char_length(target_offer_code) not between 1 and 120))
  then raise exception 'Invalid preorder offer snapshot'; end if;
  if target_customer_name_snapshot is null or char_length(target_customer_name_snapshot) not between 2 and 160 then raise exception 'A billing name snapshot is required'; end if;
  if target_customer_email_snapshot is null or char_length(target_customer_email_snapshot) not between 3 and 320 then raise exception 'A verified email snapshot is required'; end if;
  if target_provider_environment not in ('sandbox', 'live') then raise exception 'A provider environment is required'; end if;

  insert into public.orders (
    user_id, provider, status, currency, total_minor, checkout_idempotency_key,
    paypal_create_request_id, paypal_capture_request_id, customer_name_snapshot,
    customer_email_snapshot, provider_environment
  ) values (
    target_user_id, 'paypal', 'creating', target_currency, target_total_minor,
    target_checkout_idempotency_key, target_paypal_create_request_id,
    target_paypal_capture_request_id, target_customer_name_snapshot,
    target_customer_email_snapshot, target_provider_environment
  ) on conflict (user_id, provider, checkout_idempotency_key) do nothing
  returning * into commerce_order;

  if found then
    order_created := true;
    insert into public.order_items (order_id, product_id, quantity, unit_price_minor, currency, price_source, offer_code)
    values (commerce_order.id, target_product_id, 1, target_total_minor, target_currency, target_price_source, target_offer_code)
    returning * into commerce_item;
  else
    select * into commerce_order from public.orders
      where user_id = target_user_id and provider = 'paypal'
        and checkout_idempotency_key = target_checkout_idempotency_key for update;
    select * into commerce_item from public.order_items as existing_item where existing_item.order_id = commerce_order.id;
    if not found or commerce_item.product_id <> target_product_id then raise exception 'Checkout idempotency key conflicts with another product'; end if;
    if commerce_order.customer_name_snapshot is null or commerce_order.customer_email_snapshot is null
      or commerce_order.provider_environment is null then
      raise exception 'Legacy checkout cannot be resumed by idempotency key';
    end if;
    if commerce_order.provider_environment <> target_provider_environment then
      raise exception 'Checkout idempotency key belongs to another provider environment';
    end if;
  end if;

  return query select commerce_order.id, commerce_item.id, order_created, commerce_order.status,
    commerce_order.total_minor, commerce_order.currency, commerce_item.price_source,
    commerce_item.offer_code, commerce_order.paypal_create_request_id,
    commerce_order.paypal_capture_request_id, commerce_order.customer_name_snapshot,
    commerce_order.customer_email_snapshot, commerce_order.provider_environment;
end;
$$;

revoke all on function public.create_commerce_order(uuid, text, integer, text, text, text, uuid, uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_commerce_order(uuid, text, integer, text, text, text, uuid, uuid, uuid, text, text, text)
  to service_role;

create function public.resolve_paypal_commerce_checkout(
  target_user_id uuid, target_product_id text, target_total_minor integer,
  target_currency text, target_price_source text, target_offer_code text,
  target_checkout_idempotency_key uuid, target_paypal_create_request_id uuid,
  target_paypal_capture_request_id uuid, target_customer_name_snapshot text,
  target_customer_email_snapshot text, target_provider_environment text
)
returns table (
  checkout_result text, order_id uuid, order_item_id uuid, created boolean,
  order_status text, total_minor integer, currency text, price_source text,
  offer_code text, paypal_create_request_id uuid, paypal_capture_request_id uuid,
  customer_name_snapshot text, customer_email_snapshot text, provider_environment text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  resumable_count integer;
  commerce_order public.orders;
  commerce_item public.order_items;
  created_order record;
begin
  if target_provider_environment not in ('sandbox', 'live') then raise exception 'A provider environment is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'paypal-checkout:' || target_user_id::text || ':' || target_product_id || ':' || target_provider_environment, 0
  ));

  select count(*) into resumable_count
  from public.orders candidate_order
  join public.order_items candidate_item on candidate_item.order_id = candidate_order.id
  where candidate_order.user_id = target_user_id and candidate_order.provider = 'paypal'
    and candidate_order.provider_environment = target_provider_environment
    and candidate_item.product_id = target_product_id
    and candidate_order.status in ('creating', 'pending_approval', 'capture_pending');

  if resumable_count > 1 then
    return query select 'needs_reconciliation'::text, null::uuid, null::uuid, false,
      null::text, null::integer, null::text, null::text, null::text, null::uuid,
      null::uuid, null::text, null::text, null::text;
    return;
  end if;

  if resumable_count = 1 then
    select candidate_order.* into commerce_order
    from public.orders candidate_order
    join public.order_items candidate_item on candidate_item.order_id = candidate_order.id
    where candidate_order.user_id = target_user_id and candidate_order.provider = 'paypal'
      and candidate_order.provider_environment = target_provider_environment
      and candidate_item.product_id = target_product_id
      and candidate_order.status in ('creating', 'pending_approval', 'capture_pending')
    for update of candidate_order;
    select * into commerce_item from public.order_items as existing_item where existing_item.order_id = commerce_order.id for update;
    return query select 'resumed'::text, commerce_order.id, commerce_item.id, false,
      commerce_order.status, commerce_order.total_minor, commerce_order.currency,
      commerce_item.price_source, commerce_item.offer_code, commerce_order.paypal_create_request_id,
      commerce_order.paypal_capture_request_id, commerce_order.customer_name_snapshot,
      commerce_order.customer_email_snapshot, commerce_order.provider_environment;
    return;
  end if;

  select * into created_order from public.create_commerce_order(
    target_user_id, target_product_id, target_total_minor, target_currency,
    target_price_source, target_offer_code, target_checkout_idempotency_key,
    target_paypal_create_request_id, target_paypal_capture_request_id,
    target_customer_name_snapshot, target_customer_email_snapshot, target_provider_environment
  );

  return query select
    case when created_order.created then 'created'::text else 'resumed'::text end,
    created_order.order_id, created_order.order_item_id, created_order.created,
    created_order.order_status, created_order.total_minor, created_order.currency,
    created_order.price_source, created_order.offer_code, created_order.paypal_create_request_id,
    created_order.paypal_capture_request_id, created_order.customer_name_snapshot,
    created_order.customer_email_snapshot, created_order.provider_environment;
end;
$$;

revoke all on function public.resolve_paypal_commerce_checkout(uuid, text, integer, text, text, text, uuid, uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_paypal_commerce_checkout(uuid, text, integer, text, text, text, uuid, uuid, uuid, text, text, text)
  to service_role;
