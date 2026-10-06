alter table public.order_items
  add column product_title_snapshot text null,
  add column receipt_description_snapshot text null,
  add constraint order_items_receipt_snapshot_check check (
    (product_title_snapshot is null and receipt_description_snapshot is null)
    or (
      product_title_snapshot is not null
      and receipt_description_snapshot is not null
      and char_length(product_title_snapshot) between 1 and 240
      and char_length(receipt_description_snapshot) between 1 and 1000
    )
  );

create or replace function public.enforce_commerce_order_item_integrity()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if row(
    new.order_id, new.product_id, new.quantity, new.unit_price_minor,
    new.currency, new.price_source, new.offer_code,
    new.product_title_snapshot, new.receipt_description_snapshot, new.created_at
  ) is distinct from row(
    old.order_id, old.product_id, old.quantity, old.unit_price_minor,
    old.currency, old.price_source, old.offer_code,
    old.product_title_snapshot, old.receipt_description_snapshot, old.created_at
  ) then
    raise exception 'Immutable order item fields cannot be changed';
  end if;

  if old.entitlement_id is not null and new.entitlement_id is distinct from old.entitlement_id then
    raise exception 'Linked entitlement cannot be changed';
  end if;

  return new;
end;
$$;

revoke all on function public.resolve_paypal_commerce_checkout(
  uuid, text, integer, text, text, text, uuid, uuid, uuid, text, text, text
) from public, anon, authenticated, service_role;
drop function public.resolve_paypal_commerce_checkout(
  uuid, text, integer, text, text, text, uuid, uuid, uuid, text, text, text
);

revoke all on function public.create_commerce_order(
  uuid, text, integer, text, text, text, uuid, uuid, uuid, text, text, text
) from public, anon, authenticated, service_role;
drop function public.create_commerce_order(
  uuid, text, integer, text, text, text, uuid, uuid, uuid, text, text, text
);

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
  target_provider_environment text,
  target_product_title_snapshot text,
  target_receipt_description_snapshot text
)
returns table (
  order_id uuid, order_item_id uuid, created boolean, order_status text,
  total_minor integer, currency text, price_source text, offer_code text,
  paypal_create_request_id uuid, paypal_capture_request_id uuid,
  customer_name_snapshot text, customer_email_snapshot text, provider_environment text,
  product_title_snapshot text, receipt_description_snapshot text
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
  if target_product_title_snapshot is null or char_length(target_product_title_snapshot) not between 1 and 240
    or target_receipt_description_snapshot is null or char_length(target_receipt_description_snapshot) not between 1 and 1000
  then raise exception 'Product receipt snapshots are required'; end if;

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
    insert into public.order_items (
      order_id, product_id, quantity, unit_price_minor, currency, price_source,
      offer_code, product_title_snapshot, receipt_description_snapshot
    ) values (
      commerce_order.id, target_product_id, 1, target_total_minor, target_currency,
      target_price_source, target_offer_code, target_product_title_snapshot,
      target_receipt_description_snapshot
    ) returning * into commerce_item;
  else
    select * into commerce_order from public.orders
      where user_id = target_user_id and provider = 'paypal'
        and checkout_idempotency_key = target_checkout_idempotency_key for update;
    select * into commerce_item from public.order_items as existing_item
      where existing_item.order_id = commerce_order.id;
    if not found or commerce_item.product_id <> target_product_id then raise exception 'Checkout idempotency key conflicts with another product'; end if;
    if commerce_order.customer_name_snapshot is null or commerce_order.customer_email_snapshot is null
      or commerce_order.provider_environment is null
      or commerce_item.product_title_snapshot is null or commerce_item.receipt_description_snapshot is null
    then raise exception 'Legacy checkout cannot be resumed by idempotency key'; end if;
    if commerce_order.provider_environment <> target_provider_environment then
      raise exception 'Checkout idempotency key belongs to another provider environment';
    end if;
  end if;

  return query select commerce_order.id, commerce_item.id, order_created, commerce_order.status,
    commerce_order.total_minor, commerce_order.currency, commerce_item.price_source,
    commerce_item.offer_code, commerce_order.paypal_create_request_id,
    commerce_order.paypal_capture_request_id, commerce_order.customer_name_snapshot,
    commerce_order.customer_email_snapshot, commerce_order.provider_environment,
    commerce_item.product_title_snapshot, commerce_item.receipt_description_snapshot;
end;
$$;

revoke all on function public.create_commerce_order(
  uuid, text, integer, text, text, text, uuid, uuid, uuid, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_commerce_order(
  uuid, text, integer, text, text, text, uuid, uuid, uuid, text, text, text, text, text
) to service_role;

create function public.resolve_paypal_commerce_checkout(
  target_user_id uuid, target_product_id text, target_total_minor integer,
  target_currency text, target_price_source text, target_offer_code text,
  target_checkout_idempotency_key uuid, target_paypal_create_request_id uuid,
  target_paypal_capture_request_id uuid, target_customer_name_snapshot text,
  target_customer_email_snapshot text, target_provider_environment text,
  target_product_title_snapshot text, target_receipt_description_snapshot text
)
returns table (
  checkout_result text, order_id uuid, order_item_id uuid, created boolean,
  order_status text, total_minor integer, currency text, price_source text,
  offer_code text, paypal_create_request_id uuid, paypal_capture_request_id uuid,
  customer_name_snapshot text, customer_email_snapshot text, provider_environment text,
  product_title_snapshot text, receipt_description_snapshot text
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
      null::uuid, null::text, null::text, null::text, null::text, null::text;
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
    select * into commerce_item from public.order_items as existing_item
      where existing_item.order_id = commerce_order.id for update;
    if commerce_item.product_title_snapshot is null or commerce_item.receipt_description_snapshot is null then
      return query select 'needs_reconciliation'::text, null::uuid, null::uuid, false,
        null::text, null::integer, null::text, null::text, null::text, null::uuid,
        null::uuid, null::text, null::text, null::text, null::text, null::text;
      return;
    end if;
    return query select 'resumed'::text, commerce_order.id, commerce_item.id, false,
      commerce_order.status, commerce_order.total_minor, commerce_order.currency,
      commerce_item.price_source, commerce_item.offer_code, commerce_order.paypal_create_request_id,
      commerce_order.paypal_capture_request_id, commerce_order.customer_name_snapshot,
      commerce_order.customer_email_snapshot, commerce_order.provider_environment,
      commerce_item.product_title_snapshot, commerce_item.receipt_description_snapshot;
    return;
  end if;

  select * into created_order from public.create_commerce_order(
    target_user_id, target_product_id, target_total_minor, target_currency,
    target_price_source, target_offer_code, target_checkout_idempotency_key,
    target_paypal_create_request_id, target_paypal_capture_request_id,
    target_customer_name_snapshot, target_customer_email_snapshot, target_provider_environment,
    target_product_title_snapshot, target_receipt_description_snapshot
  );

  return query select
    case when created_order.created then 'created'::text else 'resumed'::text end,
    created_order.order_id, created_order.order_item_id, created_order.created,
    created_order.order_status, created_order.total_minor, created_order.currency,
    created_order.price_source, created_order.offer_code, created_order.paypal_create_request_id,
    created_order.paypal_capture_request_id, created_order.customer_name_snapshot,
    created_order.customer_email_snapshot, created_order.provider_environment,
    created_order.product_title_snapshot, created_order.receipt_description_snapshot;
end;
$$;

revoke all on function public.resolve_paypal_commerce_checkout(
  uuid, text, integer, text, text, text, uuid, uuid, uuid, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.resolve_paypal_commerce_checkout(
  uuid, text, integer, text, text, text, uuid, uuid, uuid, text, text, text, text, text
) to service_role;

create table public.receipt_issuer_profiles (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique,
  legal_name text not null,
  owner_name text not null,
  business_status text not null,
  business_number text not null,
  address text not null,
  contact_email text not null,
  accountant_approved_footer text,
  effective_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint receipt_issuer_profiles_version_check check (version > 0),
  constraint receipt_issuer_profiles_text_check check (
    char_length(legal_name) between 1 and 200
    and char_length(owner_name) between 1 and 200
    and char_length(business_status) between 1 and 120
    and char_length(business_number) between 1 and 80
    and char_length(address) between 1 and 300
    and char_length(contact_email) between 3 and 320
    and (accountant_approved_footer is null or char_length(accountant_approved_footer) between 1 and 1000)
  )
);

create table public.receipt_issuer_profile_current (
  singleton boolean primary key default true check (singleton),
  profile_id uuid not null references public.receipt_issuer_profiles(id) on delete restrict,
  selected_at timestamptz not null default now()
);

create table public.receipt_series (
  id uuid primary key default gen_random_uuid(),
  series_code text not null,
  environment text not null,
  document_type text not null,
  next_number bigint not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint receipt_series_identity_key unique (series_code, environment, document_type),
  constraint receipt_series_code_check check (series_code ~ '^[A-Z0-9_-]{1,24}$'),
  constraint receipt_series_environment_check check (environment = 'live'),
  constraint receipt_series_document_type_check check (document_type = 'receipt'),
  constraint receipt_series_next_number_check check (next_number > 0)
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.receipt_series(id) on delete restrict,
  receipt_number bigint not null,
  document_type text not null,
  order_id uuid not null references public.orders(id) on delete restrict,
  issued_at timestamptz not null,
  seller_snapshot jsonb not null,
  customer_snapshot jsonb not null,
  line_items_snapshot jsonb not null,
  payment_snapshot jsonb not null,
  total_minor integer not null,
  currency text not null,
  provider text not null,
  provider_capture_id text not null,
  provider_environment text not null,
  document_version integer not null,
  created_at timestamptz not null default now(),
  constraint receipts_series_number_key unique (series_id, receipt_number),
  constraint receipts_order_document_key unique (order_id, document_type),
  constraint receipts_number_check check (receipt_number > 0),
  constraint receipts_document_type_check check (document_type = 'receipt'),
  constraint receipts_total_check check (total_minor > 0),
  constraint receipts_currency_check check (currency = 'ILS'),
  constraint receipts_provider_check check (provider = 'paypal'),
  constraint receipts_capture_check check (char_length(provider_capture_id) between 1 and 128),
  constraint receipts_environment_check check (provider_environment = 'live'),
  constraint receipts_document_version_check check (document_version > 0),
  constraint receipts_seller_snapshot_check check (
    jsonb_typeof(seller_snapshot) = 'object'
    and seller_snapshot ?& array['profileVersion','legalName','ownerName','businessStatus','businessNumber','address','contactEmail','accountantApprovedFooter']
  ),
  constraint receipts_customer_snapshot_check check (
    jsonb_typeof(customer_snapshot) = 'object'
    and customer_snapshot ?& array['name','email']
  ),
  constraint receipts_line_items_snapshot_check check (
    jsonb_typeof(line_items_snapshot) = 'array'
    and jsonb_array_length(line_items_snapshot) > 0
  ),
  constraint receipts_payment_snapshot_check check (
    jsonb_typeof(payment_snapshot) = 'object'
    and payment_snapshot ?& array['method','providerOrderId','providerCaptureId','paidAt','environment','amountMinor','currency']
  )
);

create index receipts_order_id_idx on public.receipts(order_id);
create index receipts_issued_at_idx on public.receipts(issued_at desc);

alter table public.receipt_issuer_profiles enable row level security;
alter table public.receipt_issuer_profile_current enable row level security;
alter table public.receipt_series enable row level security;
alter table public.receipts enable row level security;

revoke all on table public.receipt_issuer_profiles from public, anon, authenticated, service_role;
revoke all on table public.receipt_issuer_profile_current from public, anon, authenticated, service_role;
revoke all on table public.receipt_series from public, anon, authenticated, service_role;
revoke all on table public.receipts from public, anon, authenticated, service_role;
grant select on table public.receipt_issuer_profiles to service_role;
grant select on table public.receipt_issuer_profile_current to service_role;
grant select on table public.receipt_series to service_role;
grant select on table public.receipts to service_role;

create function public.prevent_immutable_receipt_record_change()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  raise exception 'Issued receipt records are immutable';
end;
$$;

create function public.prevent_issuer_profile_change()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  raise exception 'Receipt issuer profiles are immutable';
end;
$$;

create function public.enforce_receipt_series_integrity()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then raise exception 'Receipt series cannot be deleted'; end if;
  if row(new.id, new.series_code, new.environment, new.document_type, new.active, new.created_at)
    is distinct from row(old.id, old.series_code, old.environment, old.document_type, old.active, old.created_at)
  then raise exception 'Receipt series identity is immutable'; end if;
  if new.next_number <> old.next_number + 1 then raise exception 'Receipt series number must advance by one'; end if;
  return new;
end;
$$;

create trigger receipts_prevent_update_delete before update or delete on public.receipts
  for each row execute function public.prevent_immutable_receipt_record_change();
create trigger receipt_issuer_profiles_prevent_update_delete before update or delete on public.receipt_issuer_profiles
  for each row execute function public.prevent_issuer_profile_change();
create trigger receipt_series_enforce_integrity before update or delete on public.receipt_series
  for each row execute function public.enforce_receipt_series_integrity();

insert into public.receipt_issuer_profiles (
  id, version, legal_name, owner_name, business_status, business_number,
  address, contact_email, accountant_approved_footer, effective_at
) values (
  '10000000-0000-4000-8000-000000000001', 1, 'אומנצ׳קים', 'יוליה נואה מכלין', 'עוסק פטור',
  '337738868', 'אחדות 18, חריש', 'omanchikim@gmail.com', null, '2026-10-07T00:00:00Z'
);
insert into public.receipt_issuer_profile_current (singleton, profile_id)
values (true, '10000000-0000-4000-8000-000000000001');
insert into public.receipt_series (
  id, series_code, environment, document_type, next_number, active
) values (
  '20000000-0000-4000-8000-000000000001', 'WEB', 'live', 'receipt', 1, true
);

create function public.issue_receipt_for_paid_order(target_order_id uuid)
returns table (
  result text,
  issued_receipt_id uuid,
  issued_series_code text,
  issued_receipt_number bigint,
  issued_display_number text,
  receipt_issued_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  commerce_order public.orders;
  commerce_item public.order_items;
  existing_receipt public.receipts;
  issuer_profile public.receipt_issuer_profiles;
  series_row public.receipt_series;
  created_receipt public.receipts;
begin
  select * into commerce_order from public.orders where id = target_order_id for update;
  if not found then
    return query select 'order_not_found'::text, null::uuid, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;

  select * into existing_receipt from public.receipts
    where order_id = commerce_order.id and document_type = 'receipt';
  if found then
    select * into series_row from public.receipt_series where id = existing_receipt.series_id;
    return query select 'already_issued'::text, existing_receipt.id, series_row.series_code,
      existing_receipt.receipt_number,
      series_row.series_code || '-' || lpad(existing_receipt.receipt_number::text, 6, '0'),
      existing_receipt.issued_at;
    return;
  end if;

  if commerce_order.status <> 'paid' then
    return query select 'order_not_paid'::text, null::uuid, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;
  if commerce_order.provider_environment is null then
    return query select 'unknown_environment'::text, null::uuid, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;
  if commerce_order.provider_environment = 'sandbox' then
    return query select 'sandbox_order'::text, null::uuid, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;
  if commerce_order.provider_environment <> 'live' or commerce_order.provider <> 'paypal'
    or commerce_order.total_minor <= 0 or commerce_order.currency <> 'ILS'
  then
    return query select 'invalid_order_integrity'::text, null::uuid, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;
  if commerce_order.customer_name_snapshot is null or commerce_order.customer_email_snapshot is null then
    return query select 'missing_customer_snapshot'::text, null::uuid, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;
  if commerce_order.provider_order_id is null or commerce_order.provider_capture_id is null or commerce_order.paid_at is null then
    return query select 'missing_capture_identity'::text, null::uuid, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;

  select * into commerce_item from public.order_items where order_id = commerce_order.id for update;
  if not found or commerce_item.quantity <= 0
    or commerce_item.unit_price_minor * commerce_item.quantity <> commerce_order.total_minor
    or commerce_item.currency <> commerce_order.currency
  then
    return query select 'invalid_order_integrity'::text, null::uuid, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;
  if commerce_item.product_title_snapshot is null or commerce_item.receipt_description_snapshot is null then
    return query select 'missing_product_snapshot'::text, null::uuid, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;

  select profile.* into issuer_profile
  from public.receipt_issuer_profile_current current_profile
  join public.receipt_issuer_profiles profile on profile.id = current_profile.profile_id
  where current_profile.singleton = true;
  if not found then
    return query select 'no_active_issuer_profile'::text, null::uuid, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;

  select * into series_row from public.receipt_series
  where series_code = 'WEB' and environment = 'live'
    and document_type = 'receipt' and active = true
  for update;
  if not found then
    return query select 'no_active_receipt_series'::text, null::uuid, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;

  insert into public.receipts (
    series_id, receipt_number, document_type, order_id, issued_at,
    seller_snapshot, customer_snapshot, line_items_snapshot, payment_snapshot,
    total_minor, currency, provider, provider_capture_id, provider_environment,
    document_version
  ) values (
    series_row.id, series_row.next_number, 'receipt', commerce_order.id, now(),
    jsonb_build_object(
      'profileVersion', issuer_profile.version,
      'legalName', issuer_profile.legal_name,
      'ownerName', issuer_profile.owner_name,
      'businessStatus', issuer_profile.business_status,
      'businessNumber', issuer_profile.business_number,
      'address', issuer_profile.address,
      'contactEmail', issuer_profile.contact_email,
      'accountantApprovedFooter', issuer_profile.accountant_approved_footer
    ),
    jsonb_build_object(
      'name', commerce_order.customer_name_snapshot,
      'email', commerce_order.customer_email_snapshot
    ),
    jsonb_build_array(jsonb_build_object(
      'productId', commerce_item.product_id,
      'title', commerce_item.product_title_snapshot,
      'description', commerce_item.receipt_description_snapshot,
      'quantity', commerce_item.quantity,
      'unitPriceMinor', commerce_item.unit_price_minor,
      'currency', commerce_item.currency,
      'priceSource', commerce_item.price_source,
      'offerCode', commerce_item.offer_code
    )),
    jsonb_build_object(
      'method', 'PayPal',
      'providerOrderId', commerce_order.provider_order_id,
      'providerCaptureId', commerce_order.provider_capture_id,
      'paidAt', commerce_order.paid_at,
      'environment', commerce_order.provider_environment,
      'amountMinor', commerce_order.total_minor,
      'currency', commerce_order.currency
    ),
    commerce_order.total_minor, commerce_order.currency, commerce_order.provider,
    commerce_order.provider_capture_id, commerce_order.provider_environment, 1
  ) returning * into created_receipt;

  update public.receipt_series set next_number = next_number + 1 where id = series_row.id;

  return query select 'issued'::text, created_receipt.id, series_row.series_code,
    created_receipt.receipt_number,
    series_row.series_code || '-' || lpad(created_receipt.receipt_number::text, 6, '0'),
    created_receipt.issued_at;
end;
$$;

revoke all on function public.prevent_immutable_receipt_record_change() from public, anon, authenticated;
revoke all on function public.prevent_issuer_profile_change() from public, anon, authenticated;
revoke all on function public.enforce_receipt_series_integrity() from public, anon, authenticated;
revoke all on function public.issue_receipt_for_paid_order(uuid) from public, anon, authenticated;
grant execute on function public.issue_receipt_for_paid_order(uuid) to service_role;
