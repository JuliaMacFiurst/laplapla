\set ON_ERROR_STOP on

begin;

insert into auth.users (id) values ('88888888-8888-4888-8888-888888888888');
insert into public.product_entitlements (id, user_id, product_id, source, status)
values ('88888888-8888-4888-8888-888888888801', '88888888-8888-4888-8888-888888888888',
        'sound-case-001', 'laplapla_web', 'active');
insert into public.orders (
  id, user_id, provider, status, currency, total_minor, provider_order_id,
  provider_capture_id, checkout_idempotency_key, paypal_create_request_id,
  paypal_capture_request_id, paid_at, provider_environment
) values (
  '88888888-8888-4888-8888-888888888802', '88888888-8888-4888-8888-888888888888',
  'paypal', 'paid', 'ILS', 4900, 'TEST-ORDER-1', 'TEST-CAPTURE-1',
  '88888888-8888-4888-8888-888888888811', '88888888-8888-4888-8888-888888888812',
  '88888888-8888-4888-8888-888888888813', '2026-10-01 10:00:00+00', 'sandbox'
);
insert into public.order_items (
  order_id, product_id, unit_price_minor, currency, price_source, entitlement_id
) values (
  '88888888-8888-4888-8888-888888888802', 'sound-case-001', 4900, 'ILS',
  'catalog', '88888888-8888-4888-8888-888888888801'
);

set role service_role;

insert into public.commerce_refund_operations (
  id, order_id, entitlement_id, provider_capture_id, provider_environment,
  amount_minor, currency, accounting_status
) values (
  '88888888-8888-4888-8888-888888888803', '88888888-8888-4888-8888-888888888802',
  '88888888-8888-4888-8888-888888888801', 'TEST-CAPTURE-1', 'sandbox',
  4900, 'ILS', 'not_required'
);

do $$
begin
  assert public.complete_commerce_full_refund('88888888-8888-4888-8888-888888888803') = 'provider_not_confirmed';
  assert (select status from public.product_entitlements
    where id = '88888888-8888-4888-8888-888888888801') = 'active';

  begin
    update public.commerce_refund_operations set status = 'completed',
      provider_refund_id = 'TEST-REFUND-1', provider_confirmed_at = now(), access_revoked_at = now()
    where id = '88888888-8888-4888-8888-888888888803';
    assert false, 'prepared must not advance to completed';
  exception when check_violation then null;
  end;

  update public.commerce_refund_operations set status = 'dispatching'
    where id = '88888888-8888-4888-8888-888888888803';
  update public.commerce_refund_operations set status = 'uncertain'
    where id = '88888888-8888-4888-8888-888888888803';

  begin
    update public.commerce_refund_operations set status = 'prepared'
    where id = '88888888-8888-4888-8888-888888888803';
    assert false, 'uncertain must not return to prepared';
  exception when check_violation then null;
  end;

  begin
    update public.commerce_refund_operations set status = 'provider_confirmed',
      provider_refund_id = 'TEST-REFUND-1'
    where id = '88888888-8888-4888-8888-888888888803';
    assert false, 'confirmation requires timestamp';
  exception when check_violation then null;
  end;

  assert public.complete_commerce_full_refund('88888888-8888-4888-8888-888888888803') = 'provider_not_confirmed';
  update public.commerce_refund_operations set status = 'provider_confirmed',
    provider_refund_id = 'TEST-REFUND-1', provider_confirmed_at = now()
  where id = '88888888-8888-4888-8888-888888888803';
  assert public.complete_commerce_full_refund('88888888-8888-4888-8888-888888888803') = 'completed';
  assert public.complete_commerce_full_refund('88888888-8888-4888-8888-888888888803') = 'already_completed';
  assert (select status from public.product_entitlements
    where id = '88888888-8888-4888-8888-888888888801') = 'refunded';

  begin
    update public.commerce_refund_operations set status = 'prepared'
    where id = '88888888-8888-4888-8888-888888888803';
    assert false, 'completed evidence is immutable';
  exception when check_violation then null;
  end;
end;
$$;

-- A later purchase reactivates the same entitlement row. Refunding an older
-- order must not revoke the access paid for by the later order.
do $$
begin
  perform public.grant_product_entitlement(
    '88888888-8888-4888-8888-888888888888', 'sound-case-001', 'laplapla_web'
  );
end;
$$;
insert into public.orders (
  id, user_id, provider, status, currency, total_minor, provider_order_id,
  provider_capture_id, checkout_idempotency_key, paypal_create_request_id,
  paypal_capture_request_id, paid_at, provider_environment
) values
  ('88888888-8888-4888-8888-888888888804', '88888888-8888-4888-8888-888888888888',
   'paypal', 'paid', 'ILS', 4900, 'TEST-ORDER-OLD', 'TEST-CAPTURE-OLD',
   '88888888-8888-4888-8888-888888888821', '88888888-8888-4888-8888-888888888822',
   '88888888-8888-4888-8888-888888888823', '2026-09-30 10:00:00+00', 'sandbox'),
  ('88888888-8888-4888-8888-888888888805', '88888888-8888-4888-8888-888888888888',
   'paypal', 'paid', 'ILS', 4900, 'TEST-ORDER-NEW', 'TEST-CAPTURE-NEW',
   '88888888-8888-4888-8888-888888888831', '88888888-8888-4888-8888-888888888832',
   '88888888-8888-4888-8888-888888888833', '2026-10-02 10:00:00+00', 'sandbox');
insert into public.order_items (
  order_id, product_id, unit_price_minor, currency, price_source, entitlement_id
) values
  ('88888888-8888-4888-8888-888888888804', 'sound-case-001', 4900, 'ILS',
   'catalog', '88888888-8888-4888-8888-888888888801'),
  ('88888888-8888-4888-8888-888888888805', 'sound-case-001', 4900, 'ILS',
   'catalog', '88888888-8888-4888-8888-888888888801');
insert into public.commerce_refund_operations (
  id, order_id, entitlement_id, provider_capture_id, provider_environment,
  amount_minor, currency, accounting_status
) values (
  '88888888-8888-4888-8888-888888888806', '88888888-8888-4888-8888-888888888804',
  '88888888-8888-4888-8888-888888888801', 'TEST-CAPTURE-OLD', 'sandbox',
  4900, 'ILS', 'not_required'
);
update public.commerce_refund_operations set status = 'dispatching'
  where id = '88888888-8888-4888-8888-888888888806';
update public.commerce_refund_operations set status = 'provider_confirmed',
  provider_refund_id = 'TEST-REFUND-OLD', provider_confirmed_at = now()
  where id = '88888888-8888-4888-8888-888888888806';

do $$
begin
  assert public.complete_commerce_full_refund('88888888-8888-4888-8888-888888888806') = 'needs_review';
  assert (select error_code from public.commerce_refund_operations
    where id = '88888888-8888-4888-8888-888888888806') = 'newer_purchase';
  assert (select status from public.product_entitlements
    where id = '88888888-8888-4888-8888-888888888801') = 'active';
end;
$$;

rollback;
