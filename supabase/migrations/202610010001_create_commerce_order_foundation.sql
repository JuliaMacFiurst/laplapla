create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  provider text not null,
  status text not null default 'creating',
  currency text not null,
  total_minor integer not null,
  provider_order_id text,
  provider_capture_id text,
  checkout_idempotency_key uuid not null,
  paypal_create_request_id uuid not null,
  paypal_capture_request_id uuid not null,
  paid_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_provider_check check (provider = 'paypal'),
  constraint orders_status_check check (
    status in ('creating', 'pending_approval', 'capture_pending', 'paid', 'cancelled', 'failed')
  ),
  constraint orders_currency_check check (currency = 'ILS'),
  constraint orders_total_minor_check check (total_minor > 0),
  constraint orders_provider_order_id_check check (
    provider_order_id is null or char_length(provider_order_id) between 1 and 128
  ),
  constraint orders_provider_capture_id_check check (
    provider_capture_id is null or char_length(provider_capture_id) between 1 and 128
  ),
  constraint orders_failure_code_check check (
    failure_code is null or (
      char_length(failure_code) between 1 and 80
      and failure_code ~ '^[a-z0-9_.-]+$'
    )
  ),
  constraint orders_paid_state_check check (
    (status = 'paid' and paid_at is not null and provider_order_id is not null and provider_capture_id is not null)
    or (status <> 'paid' and paid_at is null)
  ),
  constraint orders_checkout_idempotency_key unique (user_id, provider, checkout_idempotency_key),
  constraint orders_paypal_create_request_id_key unique (paypal_create_request_id),
  constraint orders_paypal_capture_request_id_key unique (paypal_capture_request_id),
  constraint orders_provider_order_id_key unique (provider, provider_order_id),
  constraint orders_provider_capture_id_key unique (provider, provider_capture_id)
);

create index orders_user_created_at_idx
  on public.orders(user_id, created_at desc);

create index orders_status_updated_at_idx
  on public.orders(status, updated_at);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  quantity integer not null default 1,
  unit_price_minor integer not null,
  currency text not null,
  price_source text not null,
  offer_code text,
  entitlement_id uuid references public.product_entitlements(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_order_key unique (order_id),
  constraint order_items_product_id_check check (char_length(product_id) between 1 and 120),
  constraint order_items_quantity_check check (quantity = 1),
  constraint order_items_unit_price_minor_check check (unit_price_minor > 0),
  constraint order_items_currency_check check (currency = 'ILS'),
  constraint order_items_price_source_check check (price_source in ('catalog', 'preorder')),
  constraint order_items_offer_code_check check (
    (price_source = 'catalog' and offer_code is null)
    or (
      price_source = 'preorder'
      and offer_code is not null
      and char_length(offer_code) between 1 and 120
    )
  )
);

create index order_items_product_id_idx
  on public.order_items(product_id);

create table public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  transmission_id text,
  provider_order_id text,
  provider_capture_id text,
  payload_hash text not null,
  status text not null default 'processing',
  attempt_count integer not null default 1,
  failure_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint payment_provider_events_identity_key unique (provider, provider_event_id),
  constraint payment_provider_events_provider_check check (provider = 'paypal'),
  constraint payment_provider_events_provider_event_id_check check (
    char_length(provider_event_id) between 1 and 180
  ),
  constraint payment_provider_events_event_type_check check (
    char_length(event_type) between 1 and 160
  ),
  constraint payment_provider_events_transmission_id_check check (
    transmission_id is null or char_length(transmission_id) between 1 and 180
  ),
  constraint payment_provider_events_provider_order_id_check check (
    provider_order_id is null or char_length(provider_order_id) between 1 and 128
  ),
  constraint payment_provider_events_provider_capture_id_check check (
    provider_capture_id is null or char_length(provider_capture_id) between 1 and 128
  ),
  constraint payment_provider_events_payload_hash_check check (
    payload_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint payment_provider_events_status_check check (
    status in ('processing', 'processed', 'failed', 'ignored')
  ),
  constraint payment_provider_events_attempt_count_check check (attempt_count > 0),
  constraint payment_provider_events_failure_code_check check (
    failure_code is null or (
      char_length(failure_code) between 1 and 80
      and failure_code ~ '^[a-z0-9_.-]+$'
    )
  ),
  constraint payment_provider_events_processed_state_check check (
    (status in ('processed', 'ignored') and processed_at is not null)
    or (status in ('processing', 'failed') and processed_at is null)
  )
);

create index payment_provider_events_order_idx
  on public.payment_provider_events(provider, provider_order_id);

create index payment_provider_events_status_idx
  on public.payment_provider_events(status, received_at);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_provider_events enable row level security;

revoke all on table public.orders from public, anon, authenticated;
revoke all on table public.order_items from public, anon, authenticated;
revoke all on table public.payment_provider_events from public, anon, authenticated;

grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.order_items to service_role;
grant select, insert, update, delete on table public.payment_provider_events to service_role;

create or replace function public.set_commerce_record_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.enforce_commerce_order_integrity()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if row(
    new.user_id,
    new.provider,
    new.currency,
    new.total_minor,
    new.checkout_idempotency_key,
    new.paypal_create_request_id,
    new.paypal_capture_request_id,
    new.created_at
  ) is distinct from row(
    old.user_id,
    old.provider,
    old.currency,
    old.total_minor,
    old.checkout_idempotency_key,
    old.paypal_create_request_id,
    old.paypal_capture_request_id,
    old.created_at
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

create or replace function public.enforce_commerce_order_item_integrity()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if row(
    new.order_id,
    new.product_id,
    new.quantity,
    new.unit_price_minor,
    new.currency,
    new.price_source,
    new.offer_code,
    new.created_at
  ) is distinct from row(
    old.order_id,
    old.product_id,
    old.quantity,
    old.unit_price_minor,
    old.currency,
    old.price_source,
    old.offer_code,
    old.created_at
  ) then
    raise exception 'Immutable order item fields cannot be changed';
  end if;

  if old.entitlement_id is not null and new.entitlement_id is distinct from old.entitlement_id then
    raise exception 'Linked entitlement cannot be changed';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_payment_provider_event_integrity()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if row(
    new.provider,
    new.provider_event_id,
    new.event_type,
    new.transmission_id,
    new.provider_order_id,
    new.provider_capture_id,
    new.payload_hash,
    new.received_at
  ) is distinct from row(
    old.provider,
    old.provider_event_id,
    old.event_type,
    old.transmission_id,
    old.provider_order_id,
    old.provider_capture_id,
    old.payload_hash,
    old.received_at
  ) then
    raise exception 'Immutable provider event fields cannot be changed';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'processing' and new.status in ('processed', 'failed', 'ignored'))
    or (old.status = 'failed' and new.status = 'processing')
  ) then
    raise exception 'Invalid provider event status transition: % -> %', old.status, new.status;
  end if;

  if new.attempt_count <> old.attempt_count and not (
    old.status = 'failed'
    and new.status = 'processing'
    and new.attempt_count = old.attempt_count + 1
  ) then
    raise exception 'Invalid provider event attempt count';
  end if;

  return new;
end;
$$;

create trigger orders_enforce_integrity
  before update on public.orders
  for each row execute function public.enforce_commerce_order_integrity();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_commerce_record_updated_at();

create trigger order_items_enforce_integrity
  before update on public.order_items
  for each row execute function public.enforce_commerce_order_item_integrity();

create trigger order_items_set_updated_at
  before update on public.order_items
  for each row execute function public.set_commerce_record_updated_at();

create trigger payment_provider_events_enforce_integrity
  before update on public.payment_provider_events
  for each row execute function public.enforce_payment_provider_event_integrity();

create trigger payment_provider_events_set_updated_at
  before update on public.payment_provider_events
  for each row execute function public.set_commerce_record_updated_at();

create or replace function public.create_commerce_order(
  target_user_id uuid,
  target_product_id text,
  target_total_minor integer,
  target_currency text,
  target_price_source text,
  target_offer_code text,
  target_checkout_idempotency_key uuid,
  target_paypal_create_request_id uuid,
  target_paypal_capture_request_id uuid
)
returns table (
  order_id uuid,
  order_item_id uuid,
  created boolean,
  order_status text,
  total_minor integer,
  currency text,
  price_source text,
  offer_code text,
  paypal_create_request_id uuid,
  paypal_capture_request_id uuid
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
  if target_user_id is null then
    raise exception 'A customer is required';
  end if;
  if target_product_id is null or char_length(target_product_id) not between 1 and 120 then
    raise exception 'A valid product id is required';
  end if;
  if target_total_minor is null or target_total_minor <= 0 then
    raise exception 'A valid order total is required';
  end if;
  if target_currency <> 'ILS' then
    raise exception 'Unsupported order currency';
  end if;
  if target_price_source not in ('catalog', 'preorder') then
    raise exception 'Unsupported price source';
  end if;
  if (target_price_source = 'catalog' and target_offer_code is not null)
    or (target_price_source = 'preorder' and (
      target_offer_code is null or char_length(target_offer_code) not between 1 and 120
    )) then
    raise exception 'Invalid preorder offer snapshot';
  end if;

  insert into public.orders (
    user_id,
    provider,
    status,
    currency,
    total_minor,
    checkout_idempotency_key,
    paypal_create_request_id,
    paypal_capture_request_id
  ) values (
    target_user_id,
    'paypal',
    'creating',
    target_currency,
    target_total_minor,
    target_checkout_idempotency_key,
    target_paypal_create_request_id,
    target_paypal_capture_request_id
  )
  on conflict (user_id, provider, checkout_idempotency_key) do nothing
  returning * into commerce_order;

  if found then
    order_created := true;
    insert into public.order_items (
      order_id,
      product_id,
      quantity,
      unit_price_minor,
      currency,
      price_source,
      offer_code
    ) values (
      commerce_order.id,
      target_product_id,
      1,
      target_total_minor,
      target_currency,
      target_price_source,
      target_offer_code
    )
    returning * into commerce_item;
  else
    select *
    into commerce_order
    from public.orders
    where user_id = target_user_id
      and provider = 'paypal'
      and checkout_idempotency_key = target_checkout_idempotency_key
    for update;

    select *
    into commerce_item
    from public.order_items
    where public.order_items.order_id = commerce_order.id;

    if not found or commerce_item.product_id <> target_product_id then
      raise exception 'Checkout idempotency key conflicts with another product';
    end if;
  end if;

  return query select
    commerce_order.id,
    commerce_item.id,
    order_created,
    commerce_order.status,
    commerce_order.total_minor,
    commerce_order.currency,
    commerce_item.price_source,
    commerce_item.offer_code,
    commerce_order.paypal_create_request_id,
    commerce_order.paypal_capture_request_id;
end;
$$;

create or replace function public.claim_payment_provider_event(
  target_provider text,
  target_provider_event_id text,
  target_event_type text,
  target_transmission_id text,
  target_provider_order_id text,
  target_provider_capture_id text,
  target_payload_hash text
)
returns table (
  event_id uuid,
  claim_status text,
  claimed boolean,
  duplicate boolean,
  event_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  provider_event public.payment_provider_events;
begin
  if target_provider <> 'paypal' then
    raise exception 'Unsupported payment provider';
  end if;

  insert into public.payment_provider_events (
    provider,
    provider_event_id,
    event_type,
    transmission_id,
    provider_order_id,
    provider_capture_id,
    payload_hash,
    status
  ) values (
    target_provider,
    target_provider_event_id,
    target_event_type,
    target_transmission_id,
    target_provider_order_id,
    target_provider_capture_id,
    target_payload_hash,
    'processing'
  )
  on conflict (provider, provider_event_id) do nothing
  returning * into provider_event;

  if found then
    return query select provider_event.id, 'claimed'::text, true, false, provider_event.status;
    return;
  end if;

  select *
  into provider_event
  from public.payment_provider_events
  where provider = target_provider
    and provider_event_id = target_provider_event_id
  for update;

  if provider_event.event_type <> target_event_type
    or provider_event.payload_hash <> target_payload_hash
    or provider_event.provider_order_id is distinct from target_provider_order_id
    or provider_event.provider_capture_id is distinct from target_provider_capture_id then
    return query select provider_event.id, 'conflict'::text, false, true, provider_event.status;
    return;
  end if;

  if provider_event.status = 'failed' then
    update public.payment_provider_events
    set status = 'processing',
        attempt_count = attempt_count + 1,
        failure_code = null,
        processed_at = null
    where id = provider_event.id
    returning * into provider_event;

    return query select provider_event.id, 'retry_claimed'::text, true, true, provider_event.status;
    return;
  end if;

  return query select provider_event.id, 'duplicate'::text, false, true, provider_event.status;
end;
$$;

create or replace function public.set_payment_provider_event_status(
  target_event_id uuid,
  target_status text,
  target_failure_code text default null
)
returns table (result text, event_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  provider_event public.payment_provider_events;
begin
  if target_status not in ('processed', 'failed', 'ignored') then
    raise exception 'Unsupported provider event status';
  end if;
  if target_status = 'failed' and (
    target_failure_code is null
    or char_length(target_failure_code) not between 1 and 80
    or target_failure_code !~ '^[a-z0-9_.-]+$'
  ) then
    raise exception 'A safe failure code is required';
  end if;

  select *
  into provider_event
  from public.payment_provider_events
  where id = target_event_id
  for update;

  if not found then
    return query select 'unknown_event'::text, null::text;
    return;
  end if;

  if provider_event.status in ('processed', 'ignored') then
    return query select 'already_final'::text, provider_event.status;
    return;
  end if;

  update public.payment_provider_events
  set status = target_status,
      failure_code = case when target_status = 'failed' then target_failure_code else null end,
      processed_at = case when target_status in ('processed', 'ignored') then now() else null end
  where id = provider_event.id
  returning * into provider_event;

  return query select 'updated'::text, provider_event.status;
end;
$$;

create or replace function public.finalize_commerce_order_paid(
  target_order_id uuid,
  target_provider text,
  target_provider_order_id text,
  target_provider_capture_id text,
  target_confirmed_amount_minor integer,
  target_confirmed_currency text,
  target_provider_event_record_id uuid default null
)
returns table (
  result text,
  finalized_order_id uuid,
  finalized_entitlement_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  commerce_order public.orders;
  commerce_item public.order_items;
  provider_event public.payment_provider_events;
  granted_entitlement public.product_entitlements;
  existing_entitlement_id uuid;
begin
  select *
  into commerce_order
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    return query select 'unknown_order'::text, target_order_id, null::uuid;
    return;
  end if;

  if target_provider is null or target_provider <> commerce_order.provider then
    return query select 'provider_mismatch'::text, commerce_order.id, null::uuid;
    return;
  end if;
  if target_provider_order_id is null
    or commerce_order.provider_order_id is null
    or target_provider_order_id <> commerce_order.provider_order_id then
    return query select 'provider_order_mismatch'::text, commerce_order.id, null::uuid;
    return;
  end if;
  if target_provider_capture_id is null
    or char_length(target_provider_capture_id) not between 1 and 128 then
    return query select 'invalid_capture_id'::text, commerce_order.id, null::uuid;
    return;
  end if;
  if target_confirmed_amount_minor is null
    or target_confirmed_amount_minor <> commerce_order.total_minor then
    return query select 'amount_mismatch'::text, commerce_order.id, null::uuid;
    return;
  end if;
  if target_confirmed_currency is null
    or target_confirmed_currency <> commerce_order.currency then
    return query select 'currency_mismatch'::text, commerce_order.id, null::uuid;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_provider || ':' || target_provider_capture_id, 0));

  if exists (
    select 1
    from public.orders
    where provider = target_provider
      and provider_capture_id = target_provider_capture_id
      and id <> commerce_order.id
  ) then
    return query select 'capture_conflict'::text, commerce_order.id, null::uuid;
    return;
  end if;

  if target_provider_event_record_id is not null then
    select *
    into provider_event
    from public.payment_provider_events
    where id = target_provider_event_record_id
    for update;

    if not found
      or provider_event.provider <> target_provider
      or provider_event.provider_order_id is distinct from target_provider_order_id
      or provider_event.provider_capture_id is distinct from target_provider_capture_id then
      return query select 'provider_event_mismatch'::text, commerce_order.id, null::uuid;
      return;
    end if;

    if commerce_order.status <> 'paid' and provider_event.status <> 'processing' then
      return query select 'provider_event_not_claimed'::text, commerce_order.id, null::uuid;
      return;
    end if;
  end if;

  select *
  into commerce_item
  from public.order_items
  where order_id = commerce_order.id
  for update;

  if not found then
    raise exception 'Order item is missing';
  end if;

  if commerce_order.status = 'paid' then
    if commerce_order.provider_capture_id is distinct from target_provider_capture_id then
      return query select 'capture_conflict'::text, commerce_order.id, commerce_item.entitlement_id;
      return;
    end if;

    if target_provider_event_record_id is not null and provider_event.status = 'processing' then
      update public.payment_provider_events
      set status = 'processed', processed_at = now(), failure_code = null
      where id = provider_event.id;
    end if;

    return query select 'already_paid'::text, commerce_order.id, commerce_item.entitlement_id;
    return;
  end if;

  if commerce_order.status not in ('pending_approval', 'capture_pending') then
    return query select 'invalid_state'::text, commerce_order.id, null::uuid;
    return;
  end if;

  if commerce_order.provider_capture_id is not null
    and commerce_order.provider_capture_id <> target_provider_capture_id then
    return query select 'capture_conflict'::text, commerce_order.id, null::uuid;
    return;
  end if;

  update public.orders
  set provider_capture_id = target_provider_capture_id,
      status = 'paid',
      paid_at = now(),
      failure_code = null
  where id = commerce_order.id;

  select *
  into granted_entitlement
  from public.grant_product_entitlement(
    commerce_order.user_id,
    commerce_item.product_id,
    'laplapla_web'
  );

  update public.order_items
  set entitlement_id = granted_entitlement.id
  where id = commerce_item.id;

  if target_provider_event_record_id is not null then
    update public.payment_provider_events
    set status = 'processed', processed_at = now(), failure_code = null
    where id = provider_event.id;
  end if;

  existing_entitlement_id := granted_entitlement.id;
  return query select 'paid'::text, commerce_order.id, existing_entitlement_id;
end;
$$;

revoke all on function public.set_commerce_record_updated_at() from public, anon, authenticated;
revoke all on function public.enforce_commerce_order_integrity() from public, anon, authenticated;
revoke all on function public.enforce_commerce_order_item_integrity() from public, anon, authenticated;
revoke all on function public.enforce_payment_provider_event_integrity() from public, anon, authenticated;

revoke all on function public.create_commerce_order(uuid, text, integer, text, text, text, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.create_commerce_order(uuid, text, integer, text, text, text, uuid, uuid, uuid)
  to service_role;

revoke all on function public.claim_payment_provider_event(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_payment_provider_event(text, text, text, text, text, text, text)
  to service_role;

revoke all on function public.set_payment_provider_event_status(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.set_payment_provider_event_status(uuid, text, text)
  to service_role;

revoke all on function public.finalize_commerce_order_paid(uuid, text, text, text, integer, text, uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_commerce_order_paid(uuid, text, text, text, integer, text, uuid)
  to service_role;
