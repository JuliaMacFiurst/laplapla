\set ON_ERROR_STOP on

do $$
begin
  assert (select count(*) from public.receipts) = 3;
  assert (select count(*) from public.receipts where order_id = (select order_id from public.receipt_concurrency_orders where label = 'same')) = 1;
  assert (select array_agg(receipt_number order by receipt_number) from public.receipts) = array[1::bigint, 2::bigint, 3::bigint];
  assert (select next_number from public.receipt_series where series_code = 'WEB') = 4;
end;
$$;
