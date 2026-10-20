\set ON_ERROR_STOP on
insert into auth.users(id) values ('66666666-6666-4666-8666-666666666666');
insert into public.product_entitlements(id,user_id,product_id,source,status)
values ('66666666-6666-4666-8666-666666666601',
  '66666666-6666-4666-8666-666666666666','sound-case-001','laplapla_web','active');
insert into public.orders(id,user_id,provider,status,currency,total_minor,provider_order_id,
  provider_capture_id,checkout_idempotency_key,paypal_create_request_id,
  paypal_capture_request_id,paid_at,provider_environment)
values ('66666666-6666-4666-8666-666666666602',
  '66666666-6666-4666-8666-666666666666','paypal','paid','ILS',3900,
  'TEST-ORDER-CONCURRENT-EMAIL','TEST-CAPTURE-CONCURRENT-EMAIL',
  '66666666-6666-4666-8666-666666666611',
  '66666666-6666-4666-8666-666666666612',
  '66666666-6666-4666-8666-666666666613',now(),'sandbox');
insert into public.order_items(order_id,product_id,unit_price_minor,currency,price_source,entitlement_id)
values ('66666666-6666-4666-8666-666666666602','sound-case-001',3900,'ILS','catalog',
  '66666666-6666-4666-8666-666666666601');
set role service_role;
insert into public.commerce_refund_operations(id,order_id,entitlement_id,provider_capture_id,
  provider_environment,amount_minor,currency,accounting_status)
values ('66666666-6666-4666-8666-666666666603',
  '66666666-6666-4666-8666-666666666602',
  '66666666-6666-4666-8666-666666666601',
  'TEST-CAPTURE-CONCURRENT-EMAIL','sandbox',3900,'ILS','not_required');
update public.commerce_refund_operations set status='dispatching'
where id='66666666-6666-4666-8666-666666666603';
update public.commerce_refund_operations set status='provider_confirmed',
  provider_refund_id='TEST-REFUND-CONCURRENT-EMAIL',provider_confirmed_at=now()
where id='66666666-6666-4666-8666-666666666603';
select public.complete_commerce_full_refund('66666666-6666-4666-8666-666666666603');
