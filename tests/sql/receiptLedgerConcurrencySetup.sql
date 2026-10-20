\set ON_ERROR_STOP on

insert into auth.users (id) values
  ('73000000-0000-4000-8000-000000000001'),
  ('73000000-0000-4000-8000-000000000002'),
  ('73000000-0000-4000-8000-000000000003');

create table public.receipt_concurrency_orders (label text primary key, order_id uuid not null);

do $$
declare
  user_value uuid;
  label_value text;
  created_order record;
  finalized record;
  provider_order text;
  provider_capture text;
begin
  for user_value, label_value in values
    ('73000000-0000-4000-8000-000000000001'::uuid, 'same'),
    ('73000000-0000-4000-8000-000000000002'::uuid, 'different-a'),
    ('73000000-0000-4000-8000-000000000003'::uuid, 'different-b')
  loop
    provider_order := 'CONCURRENT-ORDER-' || label_value;
    provider_capture := 'CONCURRENT-CAPTURE-' || label_value;
    select * into created_order from public.create_commerce_order(
      user_value, 'sound-case-001', 4900, 'ILS', 'catalog', null,
      gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'יוליה מכלין',
      label_value || '@example.com', 'live', 'Sound Case #001 - LapLapLa',
      'A personalized printable quest for a birthday or group.'
    );
    perform * from public.bind_paypal_order_to_commerce_order(created_order.order_id, provider_order);
    select * into finalized from public.finalize_commerce_order_paid(
      created_order.order_id, 'paypal', provider_order, provider_capture, 4900, 'ILS', null
    );
    assert finalized.result = 'paid';
    insert into public.receipt_concurrency_orders values (label_value, created_order.order_id);
  end loop;
end;
$$;
