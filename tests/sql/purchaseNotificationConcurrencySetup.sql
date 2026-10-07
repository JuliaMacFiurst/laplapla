\set ON_ERROR_STOP on

insert into auth.users (id) values ('74000000-0000-4000-8000-000000000001');

create table public.purchase_notification_concurrency_order (order_id uuid primary key);

do $$
declare
  created_order record;
  finalized record;
begin
  select * into created_order from public.create_commerce_order(
    '74000000-0000-4000-8000-000000000001', 'sound-case-001', 4900, 'ILS', 'catalog', null,
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    'Concurrent Buyer', 'concurrent@example.com', 'live',
    'Sound Case #001 - LapLapLa', 'A personalized printable quest for a birthday or group.'
  );
  perform * from public.bind_paypal_order_to_commerce_order(created_order.order_id, 'CONCURRENT-ORDER');
  select * into finalized from public.finalize_commerce_order_paid(
    created_order.order_id, 'paypal', 'CONCURRENT-ORDER', 'CONCURRENT-CAPTURE', 4900, 'ILS', null
  );
  assert finalized.result = 'paid';
  insert into public.purchase_notification_concurrency_order values (created_order.order_id);
end;
$$;
