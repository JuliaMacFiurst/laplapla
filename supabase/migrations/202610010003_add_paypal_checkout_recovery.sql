create or replace function public.resolve_paypal_commerce_checkout(
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
  checkout_result text,
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
  resumable_count integer;
  commerce_order public.orders;
  commerce_item public.order_items;
  created_order record;
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

  perform pg_advisory_xact_lock(
    hashtextextended('paypal-checkout:' || target_user_id::text || ':' || target_product_id, 0)
  );

  select count(*)
  into resumable_count
  from public.orders as candidate_order
  join public.order_items as candidate_item on candidate_item.order_id = candidate_order.id
  where candidate_order.user_id = target_user_id
    and candidate_order.provider = 'paypal'
    and candidate_item.product_id = target_product_id
    and candidate_order.status in ('creating', 'pending_approval', 'capture_pending');

  if resumable_count > 1 then
    return query select
      'needs_reconciliation'::text,
      null::uuid,
      null::uuid,
      false,
      null::text,
      null::integer,
      null::text,
      null::text,
      null::text,
      null::uuid,
      null::uuid;
    return;
  end if;

  if resumable_count = 1 then
    select candidate_order.*
    into commerce_order
    from public.orders as candidate_order
    join public.order_items as candidate_item on candidate_item.order_id = candidate_order.id
    where candidate_order.user_id = target_user_id
      and candidate_order.provider = 'paypal'
      and candidate_item.product_id = target_product_id
      and candidate_order.status in ('creating', 'pending_approval', 'capture_pending')
    for update of candidate_order;

    select *
    into commerce_item
    from public.order_items
    where public.order_items.order_id = commerce_order.id
    for update;

    return query select
      'resumed'::text,
      commerce_order.id,
      commerce_item.id,
      false,
      commerce_order.status,
      commerce_order.total_minor,
      commerce_order.currency,
      commerce_item.price_source,
      commerce_item.offer_code,
      commerce_order.paypal_create_request_id,
      commerce_order.paypal_capture_request_id;
    return;
  end if;

  select *
  into created_order
  from public.create_commerce_order(
    target_user_id,
    target_product_id,
    target_total_minor,
    target_currency,
    target_price_source,
    target_offer_code,
    target_checkout_idempotency_key,
    target_paypal_create_request_id,
    target_paypal_capture_request_id
  );

  if created_order.order_status not in ('creating', 'pending_approval', 'capture_pending') then
    return query select
      'invalid_state'::text,
      created_order.order_id,
      created_order.order_item_id,
      false,
      created_order.order_status,
      created_order.total_minor,
      created_order.currency,
      created_order.price_source,
      created_order.offer_code,
      created_order.paypal_create_request_id,
      created_order.paypal_capture_request_id;
    return;
  end if;

  return query select
    case when created_order.created then 'created'::text else 'resumed'::text end,
    created_order.order_id,
    created_order.order_item_id,
    created_order.created,
    created_order.order_status,
    created_order.total_minor,
    created_order.currency,
    created_order.price_source,
    created_order.offer_code,
    created_order.paypal_create_request_id,
    created_order.paypal_capture_request_id;
end;
$$;

revoke all on function public.resolve_paypal_commerce_checkout(
  uuid, text, integer, text, text, text, uuid, uuid, uuid
) from public, anon, authenticated;

grant execute on function public.resolve_paypal_commerce_checkout(
  uuid, text, integer, text, text, text, uuid, uuid, uuid
) to service_role;
