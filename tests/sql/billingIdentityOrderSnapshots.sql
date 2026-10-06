\set ON_ERROR_STOP on
begin;

insert into auth.users (id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

do $$
declare
  first_row record;
  retry_row record;
begin
  assert not has_function_privilege('anon', 'public.create_commerce_order(uuid,text,integer,text,text,text,uuid,uuid,uuid,text,text,text)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'public.resolve_paypal_commerce_checkout(uuid,text,integer,text,text,text,uuid,uuid,uuid,text,text,text)', 'EXECUTE');
  assert has_function_privilege('service_role', 'public.create_commerce_order(uuid,text,integer,text,text,text,uuid,uuid,uuid,text,text,text)', 'EXECUTE');
  assert exists (
    select 1 from pg_proc where oid = 'public.resolve_paypal_commerce_checkout(uuid,text,integer,text,text,text,uuid,uuid,uuid,text,text,text)'::regprocedure
      and 'search_path=public, pg_temp' = any(proconfig)
  );

  select * into first_row from public.resolve_paypal_commerce_checkout(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sound-case-001', 3900, 'ILS', 'preorder',
    'sound-case-001-preorder', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    'יוליה מכלין', 'buyer@example.com', 'sandbox'
  );
  assert first_row.checkout_result = 'created';
  assert first_row.customer_name_snapshot = 'יוליה מכלין';
  assert first_row.customer_email_snapshot = 'buyer@example.com';
  assert first_row.provider_environment = 'sandbox';

  update public.customer_profiles set billing_name = 'New Name'
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  select * into retry_row from public.resolve_paypal_commerce_checkout(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sound-case-001', 4900, 'ILS', 'catalog', null,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
    'New Name', 'new@example.com', 'sandbox'
  );
  assert retry_row.checkout_result = 'resumed';
  assert retry_row.customer_name_snapshot = 'יוליה מכלין';
  assert retry_row.customer_email_snapshot = 'buyer@example.com';

  begin
    update public.orders set provider_environment = 'live' where id = first_row.order_id;
    assert false, 'environment update should fail';
  exception when others then
    assert sqlerrm = 'Immutable order fields cannot be changed';
  end;

  select * into retry_row from public.resolve_paypal_commerce_checkout(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sound-case-001', 4900, 'ILS', 'catalog', null,
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'eeeeeeee-eeee-4eee-9eee-eeeeeeeeeee1', 'eeeeeeee-eeee-4eee-9eee-eeeeeeeeeee2',
    'New Name', 'buyer@example.com', 'live'
  );
  assert retry_row.checkout_result = 'created';
  assert retry_row.provider_environment = 'live';
  assert retry_row.order_id <> first_row.order_id;
end;
$$;

rollback;
