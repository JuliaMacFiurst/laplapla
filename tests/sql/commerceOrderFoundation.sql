\set ON_ERROR_STOP on

begin;

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333');

do $$
declare
  function_signature regprocedure;
begin
  foreach function_signature in array array[
    'public.create_commerce_order(uuid,text,integer,text,text,text,uuid,uuid,uuid)'::regprocedure,
    'public.claim_payment_provider_event(text,text,text,text,text,text,text)'::regprocedure,
    'public.set_payment_provider_event_status(uuid,text,text)'::regprocedure,
    'public.finalize_commerce_order_paid(uuid,text,text,text,integer,text,uuid)'::regprocedure,
    'public.bind_paypal_order_to_commerce_order(uuid,text)'::regprocedure,
    'public.begin_paypal_commerce_order_capture(uuid,uuid,text)'::regprocedure,
    'public.resolve_paypal_commerce_checkout(uuid,text,integer,text,text,text,uuid,uuid,uuid)'::regprocedure
  ]
  loop
    assert not has_function_privilege('anon', function_signature, 'EXECUTE');
    assert not has_function_privilege('authenticated', function_signature, 'EXECUTE');
    assert has_function_privilege('service_role', function_signature, 'EXECUTE');
  end loop;

  assert not has_table_privilege('anon', 'public.orders', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.orders', 'INSERT');
  assert not has_table_privilege('authenticated', 'public.order_items', 'UPDATE');
  assert not has_table_privilege('anon', 'public.payment_provider_events', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.payment_provider_events', 'INSERT');
  assert has_table_privilege('service_role', 'public.orders', 'INSERT');
  assert has_table_privilege('service_role', 'public.order_items', 'UPDATE');
  assert has_table_privilege('service_role', 'public.payment_provider_events', 'INSERT');

  assert exists (
    select 1 from pg_proc
    where oid = 'public.create_commerce_order(uuid,text,integer,text,text,text,uuid,uuid,uuid)'::regprocedure
      and 'search_path=public, pg_temp' = any(proconfig)
  );
  assert exists (
    select 1 from pg_proc
    where oid = 'public.finalize_commerce_order_paid(uuid,text,text,text,integer,text,uuid)'::regprocedure
      and 'search_path=public, pg_temp' = any(proconfig)
  );
  assert exists (
    select 1 from pg_proc
    where oid = 'public.bind_paypal_order_to_commerce_order(uuid,text)'::regprocedure
      and 'search_path=public, pg_temp' = any(proconfig)
  );
  assert exists (
    select 1 from pg_proc
    where oid = 'public.begin_paypal_commerce_order_capture(uuid,uuid,text)'::regprocedure
      and 'search_path=public, pg_temp' = any(proconfig)
  );
  assert exists (
    select 1 from pg_proc
    where oid = 'public.resolve_paypal_commerce_checkout(uuid,text,integer,text,text,text,uuid,uuid,uuid)'::regprocedure
      and 'search_path=public, pg_temp' = any(proconfig)
  );
end;
$$;

do $$
declare
  claim_row record;
  duplicate_row record;
  reclaimed_row record;
begin
  select * into claim_row from public.claim_payment_provider_event(
    'paypal', 'WH-LEASE-EVENT', 'PAYMENT.CAPTURE.COMPLETED', 'TRANSMISSION-LEASE',
    'PAYPAL-LEASE-ORDER', 'PAYPAL-LEASE-CAPTURE', repeat('c', 64)
  );
  assert claim_row.claim_status = 'claimed';

  select * into duplicate_row from public.claim_payment_provider_event(
    'paypal', 'WH-LEASE-EVENT', 'PAYMENT.CAPTURE.COMPLETED', 'TRANSMISSION-LEASE',
    'PAYPAL-LEASE-ORDER', 'PAYPAL-LEASE-CAPTURE', repeat('c', 64)
  );
  assert duplicate_row.claim_status = 'duplicate';
  assert not duplicate_row.claimed;

  set local session_replication_role = replica;
  update public.payment_provider_events
  set updated_at = now() - interval '6 minutes'
  where id = claim_row.event_id;
  set local session_replication_role = origin;

  select * into reclaimed_row from public.claim_payment_provider_event(
    'paypal', 'WH-LEASE-EVENT', 'PAYMENT.CAPTURE.COMPLETED', 'TRANSMISSION-LEASE',
    'PAYPAL-LEASE-ORDER', 'PAYPAL-LEASE-CAPTURE', repeat('c', 64)
  );
  assert reclaimed_row.claim_status = 'retry_claimed';
  assert reclaimed_row.claimed;
  assert (select attempt_count from public.payment_provider_events where id = claim_row.event_id) = 2;
end;
$$;

do $$
declare
  first_checkout record;
  resumed_checkout record;
  second_checkout record;
  ambiguous_checkout record;
begin
  select * into first_checkout from public.resolve_paypal_commerce_checkout(
    '33333333-3333-4333-8333-333333333333',
    'sound-case-001', 3900, 'ILS', 'preorder', 'sound-case-001-preorder',
    '33333333-3333-4333-8333-333333333331',
    '33333333-3333-4333-9333-333333333332',
    '33333333-3333-4333-9333-333333333333'
  );
  assert first_checkout.checkout_result = 'created';
  assert first_checkout.total_minor = 3900;

  select * into resumed_checkout from public.resolve_paypal_commerce_checkout(
    '33333333-3333-4333-8333-333333333333',
    'sound-case-001', 4900, 'ILS', 'catalog', null,
    '33333333-3333-4333-8333-333333333334',
    '33333333-3333-4333-9333-333333333335',
    '33333333-3333-4333-9333-333333333336'
  );
  assert resumed_checkout.checkout_result = 'resumed';
  assert resumed_checkout.order_id = first_checkout.order_id;
  assert resumed_checkout.total_minor = 3900;
  assert resumed_checkout.price_source = 'preorder';

  select order_id into second_checkout from public.create_commerce_order(
    '33333333-3333-4333-8333-333333333333',
    'sound-case-001', 4900, 'ILS', 'catalog', null,
    '33333333-3333-4333-8333-333333333337',
    '33333333-3333-4333-9333-333333333338',
    '33333333-3333-4333-9333-333333333339'
  );

  select * into ambiguous_checkout from public.resolve_paypal_commerce_checkout(
    '33333333-3333-4333-8333-333333333333',
    'sound-case-001', 4900, 'ILS', 'catalog', null,
    '33333333-3333-4333-8333-333333333340',
    '33333333-3333-4333-9333-333333333341',
    '33333333-3333-4333-9333-333333333342'
  );
  assert ambiguous_checkout.checkout_result = 'needs_reconciliation';
  assert ambiguous_checkout.order_id is null;
  assert (select count(*) from public.orders
    where user_id = '33333333-3333-4333-8333-333333333333') = 2;
end;
$$;

do $$
declare
  catalog_order record;
  retry_order record;
  preorder_order record;
begin
  select * into catalog_order from public.create_commerce_order(
    '11111111-1111-4111-8111-111111111111',
    'sound-case-001',
    4900,
    'ILS',
    'catalog',
    null,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaa2'
  );
  assert catalog_order.created;
  assert catalog_order.total_minor = 4900;
  assert catalog_order.currency = 'ILS';
  assert catalog_order.price_source = 'catalog';
  assert catalog_order.offer_code is null;

  select * into retry_order from public.create_commerce_order(
    '11111111-1111-4111-8111-111111111111',
    'sound-case-001',
    9999,
    'ILS',
    'catalog',
    null,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbb1',
    'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbb2'
  );
  assert not retry_order.created;
  assert retry_order.order_id = catalog_order.order_id;
  assert retry_order.total_minor = 4900;
  assert retry_order.paypal_create_request_id = 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaa1'::uuid;
  assert (select count(*) from public.orders where user_id = '11111111-1111-4111-8111-111111111111') = 1;
  assert (select count(*) from public.order_items where order_id = catalog_order.order_id) = 1;

  begin
    update public.order_items set unit_price_minor = 3900 where order_id = catalog_order.order_id;
    raise exception 'Historical order item price unexpectedly changed';
  exception when others then
    assert sqlerrm = 'Immutable order item fields cannot be changed';
  end;

  select * into preorder_order from public.create_commerce_order(
    '22222222-2222-4222-8222-222222222222',
    'sound-case-001',
    3900,
    'ILS',
    'preorder',
    'sound-case-001-preorder',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'cccccccc-cccc-4ccc-9ccc-ccccccccccc1',
    'cccccccc-cccc-4ccc-9ccc-ccccccccccc2'
  );
  assert preorder_order.created;
  assert preorder_order.total_minor = 3900;
  assert preorder_order.price_source = 'preorder';
  assert preorder_order.offer_code = 'sound-case-001-preorder';
end;
$$;

do $$
declare
  order_id_value uuid;
  event_claim record;
  duplicate_claim record;
  finalization record;
  entitlement_id_value uuid;
begin
  select id into order_id_value
  from public.orders
  where checkout_idempotency_key = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  update public.orders
  set provider_order_id = 'PAYPAL-ORDER-1', status = 'pending_approval'
  where id = order_id_value;

  select * into event_claim from public.claim_payment_provider_event(
    'paypal',
    'WH-EVENT-1',
    'PAYMENT.CAPTURE.COMPLETED',
    'TRANSMISSION-1',
    'PAYPAL-ORDER-1',
    'PAYPAL-CAPTURE-1',
    repeat('a', 64)
  );
  assert event_claim.claimed;
  assert not event_claim.duplicate;
  assert event_claim.claim_status = 'claimed';

  select * into duplicate_claim from public.claim_payment_provider_event(
    'paypal',
    'WH-EVENT-1',
    'PAYMENT.CAPTURE.COMPLETED',
    'TRANSMISSION-1',
    'PAYPAL-ORDER-1',
    'PAYPAL-CAPTURE-1',
    repeat('a', 64)
  );
  assert not duplicate_claim.claimed;
  assert duplicate_claim.duplicate;
  assert duplicate_claim.claim_status = 'duplicate';

  select * into finalization from public.finalize_commerce_order_paid(
    order_id_value, 'paypal', 'PAYPAL-ORDER-1', 'PAYPAL-CAPTURE-1', 4800, 'ILS', event_claim.event_id
  );
  assert finalization.result = 'amount_mismatch';
  assert (select status from public.orders where id = order_id_value) = 'pending_approval';
  assert not exists (
    select 1 from public.product_entitlements
    where user_id = '11111111-1111-4111-8111-111111111111' and source = 'laplapla_web'
  );

  select * into finalization from public.finalize_commerce_order_paid(
    order_id_value, 'paypal', 'PAYPAL-ORDER-1', 'PAYPAL-CAPTURE-1', 4900, 'USD', event_claim.event_id
  );
  assert finalization.result = 'currency_mismatch';
  assert (select status from public.orders where id = order_id_value) = 'pending_approval';

  select * into finalization from public.finalize_commerce_order_paid(
    order_id_value, 'paypal', 'PAYPAL-ORDER-1', 'PAYPAL-CAPTURE-1', 4900, 'ILS', event_claim.event_id
  );
  assert finalization.result = 'paid';
  entitlement_id_value := finalization.finalized_entitlement_id;
  assert entitlement_id_value is not null;
  assert (select status from public.orders where id = order_id_value) = 'paid';
  assert (select source from public.product_entitlements where id = entitlement_id_value) = 'laplapla_web';
  assert (select entitlement_id from public.order_items where order_id = order_id_value) = entitlement_id_value;
  assert (select status from public.payment_provider_events where id = event_claim.event_id) = 'processed';

  update public.product_entitlements set status = 'revoked' where id = entitlement_id_value;

  select * into finalization from public.finalize_commerce_order_paid(
    order_id_value, 'paypal', 'PAYPAL-ORDER-1', 'PAYPAL-CAPTURE-1', 4900, 'ILS', null
  );
  assert finalization.result = 'already_paid';
  assert (select status from public.product_entitlements where id = entitlement_id_value) = 'revoked';
  assert (select count(*) from public.product_entitlements
    where user_id = '11111111-1111-4111-8111-111111111111'
      and product_id = 'sound-case-001'
      and source = 'laplapla_web') = 1;

  select * into duplicate_claim from public.bind_paypal_order_to_commerce_order(
    order_id_value, 'PAYPAL-ORDER-1'
  );
  assert duplicate_claim.result = 'invalid_state';
end;
$$;

do $$
declare
  preorder_order_id uuid;
  invalid_order record;
  result_row record;
begin
  select id into preorder_order_id
  from public.orders
  where checkout_idempotency_key = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  update public.orders
  set provider_order_id = 'PAYPAL-ORDER-2', status = 'pending_approval'
  where id = preorder_order_id;

  select * into result_row from public.finalize_commerce_order_paid(
    preorder_order_id, 'paypal', 'PAYPAL-ORDER-2', 'PAYPAL-CAPTURE-1', 3900, 'ILS', null
  );
  assert result_row.result = 'capture_conflict';
  assert (select status from public.orders where id = preorder_order_id) = 'pending_approval';

  select * into result_row from public.finalize_commerce_order_paid(
    '99999999-9999-4999-8999-999999999999', 'paypal', 'UNKNOWN', 'UNKNOWN-CAPTURE', 4900, 'ILS', null
  );
  assert result_row.result = 'unknown_order';

  select * into invalid_order from public.create_commerce_order(
    '11111111-1111-4111-8111-111111111111',
    'sound-case-001',
    4900,
    'ILS',
    'catalog',
    null,
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'dddddddd-dddd-4ddd-9ddd-ddddddddddd1',
    'dddddddd-dddd-4ddd-9ddd-ddddddddddd2'
  );

  update public.orders set provider_order_id = 'PAYPAL-ORDER-3' where id = invalid_order.order_id;
  select * into result_row from public.finalize_commerce_order_paid(
    invalid_order.order_id, 'paypal', 'PAYPAL-ORDER-3', 'PAYPAL-CAPTURE-3', 4900, 'ILS', null
  );
  assert result_row.result = 'invalid_state';
end;
$$;

do $$
declare
  claim_row record;
  retry_row record;
  status_row record;
begin
  select * into claim_row from public.claim_payment_provider_event(
    'paypal', 'WH-EVENT-2', 'PAYMENT.CAPTURE.DENIED', null,
    'PAYPAL-ORDER-4', 'PAYPAL-CAPTURE-4', repeat('b', 64)
  );
  select * into status_row from public.set_payment_provider_event_status(
    claim_row.event_id, 'failed', 'provider_rejected'
  );
  assert status_row.result = 'updated';
  assert status_row.event_status = 'failed';

  select * into retry_row from public.claim_payment_provider_event(
    'paypal', 'WH-EVENT-2', 'PAYMENT.CAPTURE.DENIED', null,
    'PAYPAL-ORDER-4', 'PAYPAL-CAPTURE-4', repeat('b', 64)
  );
  assert retry_row.claimed;
  assert retry_row.duplicate;
  assert retry_row.claim_status = 'retry_claimed';
  assert (select attempt_count from public.payment_provider_events where id = claim_row.event_id) = 2;

  select * into status_row from public.set_payment_provider_event_status(
    claim_row.event_id, 'ignored', null
  );
  assert status_row.result = 'updated';
  assert status_row.event_status = 'ignored';
end;
$$;

do $$
declare
  first_order_id uuid;
  second_order_id uuid;
  result_row record;
begin
  select order_id into first_order_id from public.create_commerce_order(
    '11111111-1111-4111-8111-111111111111',
    'sound-case-001', 4900, 'ILS', 'catalog', null,
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'eeeeeeee-eeee-4eee-9eee-eeeeeeeeeee1',
    'eeeeeeee-eeee-4eee-9eee-eeeeeeeeeee2'
  );

  select * into result_row from public.bind_paypal_order_to_commerce_order(
    first_order_id, 'PAYPAL-BIND-1'
  );
  assert result_row.result = 'bound';
  assert result_row.order_status = 'pending_approval';

  select * into result_row from public.bind_paypal_order_to_commerce_order(
    first_order_id, 'PAYPAL-BIND-1'
  );
  assert result_row.result = 'already_bound';

  select order_id into second_order_id from public.create_commerce_order(
    '22222222-2222-4222-8222-222222222222',
    'sound-case-001', 4900, 'ILS', 'catalog', null,
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'ffffffff-ffff-4fff-9fff-fffffffffff1',
    'ffffffff-ffff-4fff-9fff-fffffffffff2'
  );

  select * into result_row from public.bind_paypal_order_to_commerce_order(
    second_order_id, 'PAYPAL-BIND-1'
  );
  assert result_row.result = 'provider_order_conflict';

  select * into result_row from public.bind_paypal_order_to_commerce_order(
    first_order_id, 'PAYPAL-BIND-OTHER'
  );
  assert result_row.result = 'provider_order_conflict';

  select * into result_row from public.begin_paypal_commerce_order_capture(
    first_order_id, '11111111-1111-4111-8111-111111111111', 'PAYPAL-BIND-1'
  );
  assert result_row.result = 'capture_ready';
  assert result_row.order_status = 'capture_pending';

  select * into result_row from public.begin_paypal_commerce_order_capture(
    first_order_id, '11111111-1111-4111-8111-111111111111', 'PAYPAL-BIND-1'
  );
  assert result_row.result = 'capture_ready';

  select * into result_row from public.begin_paypal_commerce_order_capture(
    first_order_id, '22222222-2222-4222-8222-222222222222', 'PAYPAL-BIND-1'
  );
  assert result_row.result = 'unknown_order';
end;
$$;

rollback;
