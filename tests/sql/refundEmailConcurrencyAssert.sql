\set ON_ERROR_STOP on
do $$
begin
  assert (select count(*) from public.commerce_refund_email_deliveries
    where operation_id='66666666-6666-4666-8666-666666666603')=1;
  assert (select status from public.commerce_refund_email_deliveries
    where operation_id='66666666-6666-4666-8666-666666666603')='sending';
  assert (select attempt_count from public.commerce_refund_email_deliveries
    where operation_id='66666666-6666-4666-8666-666666666603')=1;
  assert (select status from public.commerce_refund_operations
    where id='66666666-6666-4666-8666-666666666603')='completed';
  assert (select count(*) from public.receipts
    where order_id='66666666-6666-4666-8666-666666666602')=0;
end;
$$;
