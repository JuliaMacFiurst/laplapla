\set ON_ERROR_STOP on

do $$
declare
  target_order uuid;
begin
  select order_id into target_order from public.purchase_notification_concurrency_order;
  assert (select status from public.purchase_notifications where order_id = target_order) = 'processing';
  assert (select attempt_count from public.purchase_notifications where order_id = target_order) = 1;
end;
$$;
