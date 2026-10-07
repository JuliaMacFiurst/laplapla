\set ON_ERROR_STOP on
begin;

insert into auth.users (id) values ('73000000-0000-4000-8000-000000000001');

create function pg_temp.create_notification_test_order(target_environment text)
returns uuid
language plpgsql
as $$
declare
  created_order record;
  finalized record;
  provider_order text := 'ORDER-' || replace(gen_random_uuid()::text, '-', '');
  provider_capture text := 'CAPTURE-' || replace(gen_random_uuid()::text, '-', '');
begin
  select * into created_order from public.create_commerce_order(
    '73000000-0000-4000-8000-000000000001', 'sound-case-001', 4900, 'ILS', 'catalog', null,
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    'Test Buyer', 'buyer@example.com', target_environment,
    'Sound Case #001 - LapLapLa', 'A personalized printable quest for a birthday or group.'
  );
  perform * from public.bind_paypal_order_to_commerce_order(created_order.order_id, provider_order);
  select * into finalized from public.finalize_commerce_order_paid(
    created_order.order_id, 'paypal', provider_order, provider_capture, 4900, 'ILS', null
  );
  assert finalized.result = 'paid';
  return created_order.order_id;
end;
$$;

do $$
declare
  live_order uuid;
  sandbox_order uuid;
  claimed record;
  replay record;
  completion text;
begin
  assert not has_table_privilege('anon', 'public.purchase_notifications', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.purchase_notifications', 'SELECT');
  assert not has_table_privilege('anon', 'public.purchase_notifications', 'INSERT');
  assert not has_table_privilege('authenticated', 'public.purchase_notifications', 'UPDATE');
  assert not has_function_privilege('anon', 'public.claim_paid_order_purchase_notification(uuid)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'public.claim_paid_order_purchase_notification(uuid)', 'EXECUTE');
  assert has_function_privilege('service_role', 'public.claim_paid_order_purchase_notification(uuid)', 'EXECUTE');
  assert exists (
    select 1 from pg_proc
    where oid = 'public.claim_paid_order_purchase_notification(uuid)'::regprocedure
      and 'search_path=public, pg_temp' = any(proconfig)
  );

  live_order := pg_temp.create_notification_test_order('live');
  assert (select count(*) from public.purchase_notifications where order_id = live_order) = 1;
  select * into claimed from public.claim_paid_order_purchase_notification(live_order);
  assert claimed.result = 'claimed';
  assert claimed.product_title = 'Sound Case #001 - LapLapLa';
  assert claimed.amount_minor = 4900;
  assert claimed.currency = 'ILS';
  assert claimed.provider = 'paypal';
  assert claimed.price_source = 'catalog';

  select * into replay from public.claim_paid_order_purchase_notification(live_order);
  assert replay.result = 'processing';
  completion := public.complete_purchase_notification(claimed.notification_id, claimed.claim_token, 'discord-message-1');
  assert completion = 'sent';
  select * into replay from public.claim_paid_order_purchase_notification(live_order);
  assert replay.result = 'already_sent';
  assert (select attempt_count from public.purchase_notifications where order_id = live_order) = 1;

  sandbox_order := pg_temp.create_notification_test_order('sandbox');
  assert (select count(*) from public.purchase_notifications where order_id = sandbox_order) = 0;
  select * into replay from public.claim_paid_order_purchase_notification(sandbox_order);
  assert replay.result = 'sandbox_order';

  delete from public.purchase_notifications where order_id = live_order;
  select * into replay from public.claim_paid_order_purchase_notification(live_order);
  assert replay.result = 'not_registered';
end;
$$;

rollback;
