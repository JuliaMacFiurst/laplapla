\set ON_ERROR_STOP on
begin;

insert into auth.users(id) values ('77777777-7777-4777-8777-777777777777');
insert into public.product_entitlements(id,user_id,product_id,source,status)
values ('77777777-7777-4777-8777-777777777701',
  '77777777-7777-4777-8777-777777777777','sound-case-001','laplapla_web','active');
insert into public.orders(id,user_id,provider,status,currency,total_minor,provider_order_id,
  provider_capture_id,checkout_idempotency_key,paypal_create_request_id,
  paypal_capture_request_id,paid_at,provider_environment)
values ('77777777-7777-4777-8777-777777777702',
  '77777777-7777-4777-8777-777777777777','paypal','paid','ILS',3900,
  'TEST-ORDER-EMAIL','TEST-CAPTURE-EMAIL',
  '77777777-7777-4777-8777-777777777711',
  '77777777-7777-4777-8777-777777777712',
  '77777777-7777-4777-8777-777777777713',now(),'sandbox');
insert into public.order_items(order_id,product_id,unit_price_minor,currency,price_source,entitlement_id)
values ('77777777-7777-4777-8777-777777777702','sound-case-001',3900,'ILS','catalog',
  '77777777-7777-4777-8777-777777777701');

set role service_role;
do $$
begin
  assert not has_table_privilege('anon','public.commerce_refund_email_deliveries','SELECT');
  assert not has_table_privilege('authenticated','public.commerce_refund_email_deliveries','SELECT');
  assert has_table_privilege('service_role','public.commerce_refund_email_deliveries','UPDATE');
end;
$$;

insert into public.commerce_refund_operations(id,order_id,entitlement_id,provider_capture_id,
  provider_environment,amount_minor,currency,accounting_status)
values ('77777777-7777-4777-8777-777777777703',
  '77777777-7777-4777-8777-777777777702',
  '77777777-7777-4777-8777-777777777701',
  'TEST-CAPTURE-EMAIL','sandbox',3900,'ILS','not_required');

do $$
begin
  assert (select count(*) from public.commerce_refund_email_deliveries) = 0;
  update public.commerce_refund_operations set status='dispatching'
    where id='77777777-7777-4777-8777-777777777703';
  assert (select count(*) from public.commerce_refund_email_deliveries) = 0;
  update public.commerce_refund_operations set status='provider_confirmed',
    provider_refund_id='TEST-REFUND-EMAIL',provider_confirmed_at=now()
    where id='77777777-7777-4777-8777-777777777703';
  assert (select count(*) from public.commerce_refund_email_deliveries) = 0;
  assert public.complete_commerce_full_refund('77777777-7777-4777-8777-777777777703')='completed';
  assert (select count(*) from public.commerce_refund_email_deliveries
    where operation_id='77777777-7777-4777-8777-777777777703' and status='pending')=1;
  assert public.complete_commerce_full_refund('77777777-7777-4777-8777-777777777703')='already_completed';
  assert (select count(*) from public.commerce_refund_email_deliveries)=1;
  assert (select status from public.product_entitlements
    where id='77777777-7777-4777-8777-777777777701')='refunded';
  assert (select count(*) from public.receipts
    where order_id='77777777-7777-4777-8777-777777777702')=0;
end;
$$;

rollback;
