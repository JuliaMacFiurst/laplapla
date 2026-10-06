\set ON_ERROR_STOP on
begin;

insert into auth.users (id) values
  ('71000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-000000000002'),
  ('71000000-0000-4000-8000-000000000003'),
  ('71000000-0000-4000-8000-000000000004'),
  ('71000000-0000-4000-8000-000000000005');

create function pg_temp.create_paid_receipt_test_order(
  target_user_id uuid,
  target_environment text,
  target_title text default 'Sound Case #001 - LapLapLa',
  target_description text default 'A personalized printable quest for a birthday or group.'
) returns uuid
language plpgsql
as $$
declare
  created_order record;
  finalized record;
  provider_order text := 'ORDER-' || replace(gen_random_uuid()::text, '-', '');
  provider_capture text := 'CAPTURE-' || replace(gen_random_uuid()::text, '-', '');
begin
  select * into created_order from public.create_commerce_order(
    target_user_id, 'sound-case-001', 4900, 'ILS', 'catalog', null,
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    'יוליה מכלין', 'buyer@example.com', target_environment,
    target_title, target_description
  );
  perform * from public.bind_paypal_order_to_commerce_order(created_order.order_id, provider_order);
  select * into finalized from public.finalize_commerce_order_paid(
    created_order.order_id, 'paypal', provider_order, provider_capture, 4900, 'ILS', null
  );
  assert finalized.result = 'paid';
  return created_order.order_id;
end;
$$;

create function pg_temp.reject_receipt_counter_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'simulated counter persistence failure';
end;
$$;

do $$
declare
  first_order uuid;
  second_order uuid;
  first_issue record;
  replay_issue record;
  second_issue record;
  original_seller jsonb;
  original_customer jsonb;
  original_lines jsonb;
begin
  assert not has_function_privilege('anon', 'public.issue_receipt_for_paid_order(uuid)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'public.issue_receipt_for_paid_order(uuid)', 'EXECUTE');
  assert has_function_privilege('service_role', 'public.issue_receipt_for_paid_order(uuid)', 'EXECUTE');
  assert exists (
    select 1 from pg_proc
    where oid = 'public.issue_receipt_for_paid_order(uuid)'::regprocedure
      and 'search_path=public, pg_temp' = any(proconfig)
  );
  assert not has_table_privilege('anon', 'public.receipts', 'SELECT');
  assert not has_table_privilege('anon', 'public.receipts', 'INSERT');
  assert not has_table_privilege('anon', 'public.receipts', 'UPDATE');
  assert not has_table_privilege('anon', 'public.receipts', 'DELETE');
  assert not has_table_privilege('authenticated', 'public.receipts', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.receipts', 'INSERT');
  assert not has_table_privilege('authenticated', 'public.receipts', 'UPDATE');
  assert not has_table_privilege('authenticated', 'public.receipts', 'DELETE');
  assert not has_table_privilege('service_role', 'public.receipts', 'INSERT');
  assert has_table_privilege('service_role', 'public.receipts', 'SELECT');
  assert not has_table_privilege('service_role', 'public.receipt_series', 'UPDATE');

  assert (select legal_name from public.receipt_issuer_profiles where version = 1) = 'אומנצ׳קים';
  assert (select owner_name from public.receipt_issuer_profiles where version = 1) = 'יוליה נואה מכלין';
  assert (select business_status from public.receipt_issuer_profiles where version = 1) = 'עוסק פטור';
  assert (select business_number from public.receipt_issuer_profiles where version = 1) = '337738868';
  assert (select address from public.receipt_issuer_profiles where version = 1) = 'אחדות 18, חריש';
  assert (select contact_email from public.receipt_issuer_profiles where version = 1) = 'omanchikim@gmail.com';
  assert (select accountant_approved_footer from public.receipt_issuer_profiles where version = 1) is null;

  first_order := pg_temp.create_paid_receipt_test_order('71000000-0000-4000-8000-000000000001', 'live');
  select * into first_issue from public.issue_receipt_for_paid_order(first_order);
  assert first_issue.result = 'issued';
  assert first_issue.issued_receipt_number = 1;
  assert first_issue.issued_display_number = 'WEB-000001';
  assert (select next_number from public.receipt_series where series_code = 'WEB') = 2;

  select seller_snapshot, customer_snapshot, line_items_snapshot
    into original_seller, original_customer, original_lines
  from public.receipts where id = first_issue.issued_receipt_id;
  assert original_seller->>'legalName' = 'אומנצ׳קים';
  assert original_seller->>'contactEmail' = 'omanchikim@gmail.com';
  assert original_customer->>'name' = 'יוליה מכלין';
  assert original_lines->0->>'title' = 'Sound Case #001 - LapLapLa';
  assert original_lines->0->>'description' = 'A personalized printable quest for a birthday or group.';
  assert (select payment_snapshot->>'method' from public.receipts where id = first_issue.issued_receipt_id) = 'PayPal';

  select * into replay_issue from public.issue_receipt_for_paid_order(first_order);
  assert replay_issue.result = 'already_issued';
  assert replay_issue.issued_receipt_id = first_issue.issued_receipt_id;
  assert replay_issue.issued_receipt_number = 1;
  assert (select next_number from public.receipt_series where series_code = 'WEB') = 2;

  second_order := pg_temp.create_paid_receipt_test_order('71000000-0000-4000-8000-000000000002', 'live');
  select * into second_issue from public.issue_receipt_for_paid_order(second_order);
  assert second_issue.result = 'issued';
  assert second_issue.issued_receipt_number = 2;
  assert second_issue.issued_display_number = 'WEB-000002';
  assert (select count(*) from public.receipts) = 2;

  update public.customer_profiles set billing_name = 'Changed Later'
    where user_id = '71000000-0000-4000-8000-000000000001';
  assert (select customer_snapshot from public.receipts where id = first_issue.issued_receipt_id) = original_customer;

  begin
    update public.order_items set product_title_snapshot = 'Changed Later'
      where order_id = first_order;
    assert false, 'product receipt snapshot unexpectedly changed';
  exception when others then
    assert sqlerrm = 'Immutable order item fields cannot be changed';
  end;
  assert (select line_items_snapshot from public.receipts where id = first_issue.issued_receipt_id) = original_lines;

  insert into public.receipt_issuer_profiles (
    version, legal_name, owner_name, business_status, business_number,
    address, contact_email, effective_at
  ) values (2, 'Future Seller', 'Future Owner', 'Future Status', '999', 'Future Address', 'future@example.com', now());
  update public.receipt_issuer_profile_current
    set profile_id = (select id from public.receipt_issuer_profiles where version = 2), selected_at = now()
    where singleton = true;
  assert (select seller_snapshot from public.receipts where id = first_issue.issued_receipt_id) = original_seller;
  assert (select line_items_snapshot from public.receipts where id = first_issue.issued_receipt_id) = original_lines;

  begin
    update public.receipts set total_minor = 1 where id = first_issue.issued_receipt_id;
    assert false, 'receipt update unexpectedly succeeded';
  exception when others then
    assert sqlerrm = 'Issued receipt records are immutable';
  end;
  begin
    delete from public.receipts where id = first_issue.issued_receipt_id;
    assert false, 'receipt delete unexpectedly succeeded';
  exception when others then
    assert sqlerrm = 'Issued receipt records are immutable';
  end;
  begin
    update public.receipt_issuer_profiles set address = 'Changed' where version = 1;
    assert false, 'issuer update unexpectedly succeeded';
  exception when others then
    assert sqlerrm = 'Receipt issuer profiles are immutable';
  end;
end;
$$;

do $$
declare
  sandbox_order uuid;
  unknown_order uuid;
  unpaid_order record;
  missing_customer_order uuid;
  missing_product_order uuid;
  missing_capture_order uuid;
  mismatched_total_order uuid;
  no_profile_order uuid;
  no_series_order uuid;
  rollback_test_order uuid;
  result_row record;
  number_before bigint;
begin
  number_before := (select next_number from public.receipt_series where series_code = 'WEB');

  sandbox_order := pg_temp.create_paid_receipt_test_order('71000000-0000-4000-8000-000000000003', 'sandbox');
  select * into result_row from public.issue_receipt_for_paid_order(sandbox_order);
  assert result_row.result = 'sandbox_order';

  insert into public.orders (
    user_id, provider, status, currency, total_minor, provider_order_id,
    provider_capture_id, checkout_idempotency_key, paypal_create_request_id,
    paypal_capture_request_id, paid_at, customer_name_snapshot, customer_email_snapshot,
    provider_environment
  ) values (
    '71000000-0000-4000-8000-000000000004', 'paypal', 'paid', 'ILS', 4900,
    'UNKNOWN-ENV-ORDER', 'UNKNOWN-ENV-CAPTURE', gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), now(), 'יוליה מכלין', 'buyer@example.com', null
  ) returning id into unknown_order;
  insert into public.order_items (
    order_id, product_id, unit_price_minor, currency, price_source,
    product_title_snapshot, receipt_description_snapshot
  ) values (
    unknown_order, 'sound-case-001', 4900, 'ILS', 'catalog',
    'Sound Case #001 - LapLapLa', 'A personalized printable quest for a birthday or group.'
  );
  select * into result_row from public.issue_receipt_for_paid_order(unknown_order);
  assert result_row.result = 'unknown_environment';

  select * into unpaid_order from public.create_commerce_order(
    '71000000-0000-4000-8000-000000000005', 'sound-case-001', 4900, 'ILS', 'catalog', null,
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'יוליה מכלין',
    'buyer@example.com', 'live', 'Sound Case #001 - LapLapLa',
    'A personalized printable quest for a birthday or group.'
  );
  select * into result_row from public.issue_receipt_for_paid_order(unpaid_order.order_id);
  assert result_row.result = 'order_not_paid';

  set local session_replication_role = replica;
  insert into auth.users (id) values
    ('71000000-0000-4000-8000-000000000006'),
    ('71000000-0000-4000-8000-000000000007');
  insert into public.orders (
    id, user_id, provider, status, currency, total_minor, provider_order_id,
    provider_capture_id, checkout_idempotency_key, paypal_create_request_id,
    paypal_capture_request_id, paid_at, provider_environment
  ) values (
    '72000000-0000-4000-8000-000000000006', '71000000-0000-4000-8000-000000000006',
    'paypal', 'paid', 'ILS', 4900, 'MISSING-CUSTOMER-ORDER', 'MISSING-CUSTOMER-CAPTURE',
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(), 'live'
  ) returning id into missing_customer_order;
  insert into public.order_items (
    order_id, product_id, unit_price_minor, currency, price_source,
    product_title_snapshot, receipt_description_snapshot
  ) values (
    missing_customer_order, 'sound-case-001', 4900, 'ILS', 'catalog',
    'Sound Case #001 - LapLapLa', 'A personalized printable quest for a birthday or group.'
  );
  insert into public.orders (
    id, user_id, provider, status, currency, total_minor, provider_order_id,
    provider_capture_id, checkout_idempotency_key, paypal_create_request_id,
    paypal_capture_request_id, paid_at, customer_name_snapshot, customer_email_snapshot,
    provider_environment
  ) values (
    '72000000-0000-4000-8000-000000000007', '71000000-0000-4000-8000-000000000007',
    'paypal', 'paid', 'ILS', 4900, 'MISSING-PRODUCT-ORDER', 'MISSING-PRODUCT-CAPTURE',
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(), 'יוליה מכלין',
    'buyer@example.com', 'live'
  ) returning id into missing_product_order;
  insert into public.order_items (order_id, product_id, unit_price_minor, currency, price_source)
  values (missing_product_order, 'sound-case-001', 4900, 'ILS', 'catalog');
  set local session_replication_role = origin;

  select * into result_row from public.issue_receipt_for_paid_order(missing_customer_order);
  assert result_row.result = 'missing_customer_snapshot';
  select * into result_row from public.issue_receipt_for_paid_order(missing_product_order);
  assert result_row.result = 'missing_product_snapshot';

  assert (select next_number from public.receipt_series where series_code = 'WEB') = number_before;
  assert not exists (select 1 from public.receipts where order_id in (sandbox_order, unknown_order, unpaid_order.order_id, missing_customer_order, missing_product_order));

  insert into auth.users (id) values
    ('71000000-0000-4000-8000-000000000008'),
    ('71000000-0000-4000-8000-000000000009');
  alter table public.orders drop constraint orders_paid_state_check;
  set local session_replication_role = replica;
  insert into public.orders (
    id, user_id, provider, status, currency, total_minor, provider_order_id,
    provider_capture_id, checkout_idempotency_key, paypal_create_request_id,
    paypal_capture_request_id, paid_at, customer_name_snapshot, customer_email_snapshot,
    provider_environment
  ) values (
    '72000000-0000-4000-8000-000000000008', '71000000-0000-4000-8000-000000000008',
    'paypal', 'paid', 'ILS', 4900, 'MISSING-CAPTURE-ORDER', null,
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(), 'יוליה מכלין',
    'buyer@example.com', 'live'
  ) returning id into missing_capture_order;
  insert into public.order_items (
    order_id, product_id, unit_price_minor, currency, price_source,
    product_title_snapshot, receipt_description_snapshot
  ) values (
    missing_capture_order, 'sound-case-001', 4900, 'ILS', 'catalog',
    'Sound Case #001 - LapLapLa', 'A personalized printable quest for a birthday or group.'
  );
  insert into public.orders (
    id, user_id, provider, status, currency, total_minor, provider_order_id,
    provider_capture_id, checkout_idempotency_key, paypal_create_request_id,
    paypal_capture_request_id, paid_at, customer_name_snapshot, customer_email_snapshot,
    provider_environment
  ) values (
    '72000000-0000-4000-8000-000000000009', '71000000-0000-4000-8000-000000000009',
    'paypal', 'paid', 'ILS', 4900, 'MISMATCHED-TOTAL-ORDER', 'MISMATCHED-TOTAL-CAPTURE',
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(), 'יוליה מכלין',
    'buyer@example.com', 'live'
  ) returning id into mismatched_total_order;
  insert into public.order_items (
    order_id, product_id, unit_price_minor, currency, price_source,
    product_title_snapshot, receipt_description_snapshot
  ) values (
    mismatched_total_order, 'sound-case-001', 3900, 'ILS', 'catalog',
    'Sound Case #001 - LapLapLa', 'A personalized printable quest for a birthday or group.'
  );
  set local session_replication_role = origin;

  select * into result_row from public.issue_receipt_for_paid_order(missing_capture_order);
  assert result_row.result = 'missing_capture_identity';
  select * into result_row from public.issue_receipt_for_paid_order(mismatched_total_order);
  assert result_row.result = 'invalid_order_integrity';

  no_profile_order := pg_temp.create_paid_receipt_test_order('71000000-0000-4000-8000-000000000001', 'live');
  delete from public.receipt_issuer_profile_current where singleton = true;
  select * into result_row from public.issue_receipt_for_paid_order(no_profile_order);
  assert result_row.result = 'no_active_issuer_profile';
  insert into public.receipt_issuer_profile_current (singleton, profile_id)
    values (true, (select id from public.receipt_issuer_profiles where version = 2));

  no_series_order := pg_temp.create_paid_receipt_test_order('71000000-0000-4000-8000-000000000002', 'live');
  set local session_replication_role = replica;
  update public.receipt_series set active = false where series_code = 'WEB';
  set local session_replication_role = origin;
  select * into result_row from public.issue_receipt_for_paid_order(no_series_order);
  assert result_row.result = 'no_active_receipt_series';
  set local session_replication_role = replica;
  update public.receipt_series set active = true where series_code = 'WEB';
  set local session_replication_role = origin;

  assert (select next_number from public.receipt_series where series_code = 'WEB') = number_before;

  rollback_test_order := pg_temp.create_paid_receipt_test_order('71000000-0000-4000-8000-000000000003', 'live');
  execute 'create trigger receipt_counter_failure_probe after update on public.receipt_series '
    || 'for each row execute function pg_temp.reject_receipt_counter_update()';
  begin
    perform * from public.issue_receipt_for_paid_order(rollback_test_order);
    assert false, 'simulated issuance failure unexpectedly succeeded';
  exception when others then
    assert sqlerrm = 'simulated counter persistence failure';
  end;
  execute 'drop trigger receipt_counter_failure_probe on public.receipt_series';
  assert (select next_number from public.receipt_series where series_code = 'WEB') = number_before;
  assert not exists (select 1 from public.receipts where order_id = rollback_test_order);
end;
$$;

do $$
begin
  begin
    set local role authenticated;
    perform * from public.issue_receipt_for_paid_order('72000000-0000-4000-8000-000000000006');
    reset role;
    assert false, 'authenticated receipt issuance unexpectedly succeeded';
  exception when insufficient_privilege then
    reset role;
  end;
end;
$$;

rollback;
