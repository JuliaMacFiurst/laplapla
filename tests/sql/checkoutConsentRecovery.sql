\set ON_ERROR_STOP on

begin;

do $$
declare
  checkout_order record;
begin
  assert not has_table_privilege('anon', 'public.checkout_consents', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.checkout_consents', 'INSERT');
  assert has_table_privilege('service_role', 'public.checkout_consents', 'SELECT');
  assert has_table_privilege('service_role', 'public.checkout_consents', 'INSERT');

  insert into auth.users (id) values ('99999999-9999-4999-8999-999999999999');
  select * into checkout_order from public.create_commerce_order(
    '99999999-9999-4999-8999-999999999999',
    'sound-case-001', 4900, 'ILS', 'catalog', null,
    '99999999-9999-4999-8999-999999999991',
    '99999999-9999-4999-8999-999999999992',
    '99999999-9999-4999-8999-999999999993',
    'Test Buyer', 'test@example.com', 'sandbox',
    'Sound Case #001', 'Test checkout consent'
  );
  assert checkout_order.order_status = 'creating';

  insert into public.checkout_consents (
    order_id, user_id, locale, terms_of_sale_version, refund_policy_version,
    printable_license_version, electronic_receipt_consent_version
  ) values (
    checkout_order.order_id, '99999999-9999-4999-8999-999999999999',
    'ru', '2026-10-13-v1', '2026-10-13-v1', '2026-10-13-v1', '2026-10-13-v1'
  );

  update public.orders
  set provider_order_id = 'CONSENT-RECOVERY-ORDER', status = 'pending_approval'
  where id = checkout_order.order_id;
  update public.orders set status = 'capture_pending' where id = checkout_order.order_id;

  begin
    insert into public.checkout_consents (
      order_id, user_id, locale, terms_of_sale_version, refund_policy_version,
      printable_license_version, electronic_receipt_consent_version
    ) values (
      checkout_order.order_id, '99999999-9999-4999-8999-999999999999',
      'ru', '2026-10-13-v1', '2026-10-13-v1', '2026-10-13-v1', '2026-10-13-v1'
    );
    assert false, 'A duplicate INSERT must fail before the unique constraint';
  exception when others then
    assert sqlstate = 'P0001';
    assert sqlerrm = 'Checkout consent must precede payment for the same customer';
  end;

  assert (select count(*) from public.checkout_consents where order_id = checkout_order.order_id) = 1;
  assert (select status from public.orders where id = checkout_order.order_id) = 'capture_pending';
end;
$$;

rollback;
