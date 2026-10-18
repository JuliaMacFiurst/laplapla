\set ON_ERROR_STOP on
begin;

insert into auth.users (id) values ('75000000-0000-4000-8000-000000000001');

do $$
declare
  created record;
  finalized record;
  claimed record;
  repeated record;
  notification_id uuid;
  candidate_count integer;
begin
  assert not has_table_privilege('anon', 'public.sandbox_purchase_email_deliveries', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.sandbox_purchase_email_deliveries', 'SELECT');
  assert has_table_privilege('service_role', 'public.sandbox_purchase_email_deliveries', 'UPDATE');
  assert not has_function_privilege('anon', 'public.mark_sandbox_purchase_notification_uncertain(uuid,uuid,text)', 'EXECUTE');

  select * into created from public.create_commerce_order(
    '75000000-0000-4000-8000-000000000001', 'sound-case-001', 3900, 'ILS', 'catalog', null,
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    'Synthetic Buyer', 'synthetic@example.test', 'sandbox',
    'Sound Case #001', 'Synthetic test purchase'
  );
  assert (select count(*) from public.sandbox_purchase_email_deliveries where order_id = created.order_id) = 1;
  assert (select count(*) from public.purchase_notifications where order_id = created.order_id) = 1;
  assert (select count(*) from public.receipts where order_id = created.order_id) = 0;
  assert (select result from public.claim_paid_order_purchase_notification(created.order_id)) = 'order_not_paid';

  perform * from public.bind_paypal_order_to_commerce_order(created.order_id, 'SANDBOX-ORDER-NEW');
  select * into finalized from public.finalize_commerce_order_paid(
    created.order_id, 'paypal', 'SANDBOX-ORDER-NEW', 'SANDBOX-CAPTURE-NEW', 3900, 'ILS', null
  );
  assert finalized.result = 'paid';
  assert (select count(*) from public.product_entitlements where status = 'active' and user_id = '75000000-0000-4000-8000-000000000001') = 1;
  select count(*) into candidate_count from public.list_sandbox_purchase_email_recovery_candidates(25)
    where order_id = created.order_id;
  assert candidate_count = 1;

  update public.sandbox_purchase_email_deliveries set status = 'sending', attempt_count = 1,
    claim_token = gen_random_uuid(), claimed_at = now() where order_id = created.order_id;
  select count(*) into candidate_count from public.list_sandbox_purchase_email_recovery_candidates(25)
    where order_id = created.order_id;
  assert candidate_count = 0;
  update public.sandbox_purchase_email_deliveries set status = 'uncertain', error_code = 'provider_response_unknown'
    where order_id = created.order_id;
  select count(*) into candidate_count from public.list_sandbox_purchase_email_recovery_candidates(25)
    where order_id = created.order_id;
  assert candidate_count = 0;

  select * into claimed from public.claim_paid_order_purchase_notification(created.order_id);
  assert claimed.result = 'claimed';
  notification_id := claimed.notification_id;
  select * into repeated from public.claim_paid_order_purchase_notification(created.order_id);
  assert repeated.result = 'processing';
  assert (select attempt_count from public.purchase_notifications where id = notification_id) = 1;
  assert public.mark_sandbox_purchase_notification_uncertain(notification_id, claimed.claim_token, 'network_error') = 'uncertain';
  select * into repeated from public.claim_paid_order_purchase_notification(created.order_id);
  assert repeated.result = 'uncertain';
  select count(*) into candidate_count from public.list_purchase_notification_recovery_candidates(25)
    where order_id = created.order_id;
  assert candidate_count = 0;
  assert (select count(*) from public.receipts where order_id = created.order_id) = 0;
end;
$$;

rollback;
