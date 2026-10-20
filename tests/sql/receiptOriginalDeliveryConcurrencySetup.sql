create table public.receipt_original_delivery_concurrency_target as
select id as receipt_id from public.receipts order by issued_at desc limit 1;

insert into public.receipt_original_deliveries (receipt_id)
select receipt_id from public.receipt_original_delivery_concurrency_target;
